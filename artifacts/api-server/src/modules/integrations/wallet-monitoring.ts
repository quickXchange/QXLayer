import { withDatabase } from "@workspace/db";
import { ScanExchangeWalletBody, type ExchangeWallet, type ExchangeCatalogAsset, type ExchangeAssetSettings, type ExchangeWalletScan } from "@workspace/api-zod";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { resolveEntitlements, requireFeature } from "../entitlements/resolver";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { readExchange } from "../../products/exchange/settings";
import { normalizeWalletAddress, validateWallets } from "../../products/exchange/wallets";
import { open } from "./vault";
import { safeProviderEndpoint } from "./input";
import { createBlockchainMonitorAdapter, type BlockchainMonitorAdapter, type MonitorConfig } from "./vendor/blockchain-monitoring";

export interface WalletScanScope {
  wallet: ExchangeWallet;
  asset: ExchangeAssetSettings;
  catalog: ExchangeCatalogAsset;
  settings: Record<string, any>;
}
export function walletMonitorConfig(scope: WalletScanScope, secrets: Record<string, string>): MonitorConfig {
  const { wallet, settings, catalog } = scope;
  if (!wallet.enabled || !scope.asset.enabled) throw new HttpError(409, "Enable this wallet and asset before requesting observations.");
  if (!settings.assignments?.some((a: any) => a.assetId === catalog.assetId && a.networkId === catalog.networkId))
    throw new HttpError(403, "This RPC provider is not assigned to the wallet's exact asset/network.");
  if (settings.adapterKind !== wallet.adapterKind || !settings.networkCode || (wallet.adapterKind === "evm" && !settings.chainId))
    throw new HttpError(409, "RPC adapter and expected chain must match this wallet.");
  if (wallet.adapterKind === "bitcoin" && catalog.testnet) throw new HttpError(409, "The imported Bitcoin adapter supports mainnet only.");
  if (!secrets.rpcUrl) throw new HttpError(409, "Independent tenant RPC credentials are required.");
  safeProviderEndpoint(secrets.rpcUrl);
  return { endpoint: secrets.rpcUrl, apiKey: secrets.apiKey,
    apiKeyHeader: wallet.adapterKind === "tron" ? "TRON-PRO-API-KEY" : undefined,
    networkCode: settings.networkCode, adapterKind: wallet.adapterKind,
    provider: wallet.adapterKind === "tron" ? "indexer" : "rpc", chainId: settings.chainId,
    confirmationsRequired: settings.confirmationsRequired ?? 12, maxRange: 4,
    requestTimeoutMs: 10000, deadlineAtMs: Date.now() + 30000 };
}
export async function observeWallet(scope: WalletScanScope, adapter: BlockchainMonitorAdapter): Promise<ExchangeWalletScan> {
  const { wallet, asset, settings } = scope;
  // Verify the actual network now, not a historical Connected label.
  const connected = await adapter.testConnection();
  if (!connected.connected) throw new HttpError(502, "RPC network identity could not be verified.");
  const head = await adapter.getHead();
  if (!/^\d{1,16}$/.test(head.cursor) || !Number.isSafeInteger(Number(head.cursor)))
    throw new HttpError(502, "RPC returned an invalid head.");
  const to = Number(head.cursor), from = Math.max(0, to - 4);
  const result = await adapter.scanIncoming({ from: String(from), to: String(to) }, [{
    address: wallet.address, memoOrTag: wallet.memo,
    assets: [{ assetId: asset.assetId, symbol: asset.symbol, kind: wallet.kind, decimals: asset.decimals, contractOrMint: wallet.contractOrMint }],
  }]);
  if (result.evidence.length > 100) throw new HttpError(502, "Observation limit exceeded. Use a separately reviewed indexed monitoring service.");
  const seen = new Set<string>();
  const observations: ExchangeWalletScan["observations"] = [];
  for (const e of result.evidence) {
    if (e.assetId !== asset.assetId || e.networkCode !== settings.networkCode ||
        (e.identityKind && e.identityKind !== wallet.kind) ||
        (wallet.kind === "native" && Boolean(e.contractOrMint)) ||
        normalizeWalletAddress(wallet.adapterKind, e.toAddress) !== normalizeWalletAddress(wallet.adapterKind, wallet.address) ||
        (wallet.memo && e.memoOrTag !== wallet.memo) ||
        (wallet.kind === "token" && (!e.contractOrMint || normalizeWalletAddress(wallet.adapterKind, e.contractOrMint) !== normalizeWalletAddress(wallet.adapterKind, wallet.contractOrMint!))) ||
        !/^\d{1,80}$/.test(e.rawAmount) || e.decimals !== asset.decimals ||
        !/^\d+$/.test(e.blockOrSlot) || BigInt(e.blockOrSlot) < BigInt(from) || BigInt(e.blockOrSlot) > BigInt(to) ||
        seen.has(e.eventId)) continue;
    seen.add(e.eventId);
    const status = await adapter.getEvidenceStatus(e);
    if (!Number.isSafeInteger(status.confirmations) || status.confirmations < 0) throw new HttpError(502, "RPC returned invalid confirmation evidence.");
    const digits = BigInt(e.rawAmount).toString().padStart(asset.decimals + 1, "0");
    const amount = asset.decimals ? `${digits.slice(0, -asset.decimals)}.${digits.slice(-asset.decimals)}` : digits;
    observations.push({ eventId: e.eventId, transactionHash: e.transactionHash, amount, blockOrSlot: e.blockOrSlot,
      confirmations: status.confirmations, canonical: status.canonical, successful: status.successful,
      confirmed: status.exists && status.canonical && status.successful && status.confirmations >= (settings.confirmationsRequired ?? 12) });
  }
  return { walletId: wallet.id, observedAt: new Date(), from: String(from), to: String(to),
    confirmationsRequired: settings.confirmationsRequired ?? 12, observations, sandboxOnly: true, executionEnabled: false };
}
export async function scanWallet(p: Principal, tenantId: string, walletId: string, input: unknown) {
  requireSuperAdmin(p);
  const body = ScanExchangeWalletBody.parse(input);
  // Same configuration permission as wallet management, with an explicit tenant fence.
  const ctx = contextFor(p, tenantId, true, "configuration.manage");
  const snapshot = await withDatabase(ctx, async c => {
    const e = await resolveEntitlements(c, tenantId);
    requireFeature(e, "crypto_exchange");
    if (e.tenantStatus === "suspended" || e.status !== "active") throw new HttpError(403, "Tenant monitoring access is not active.");
    const { configuration, catalog } = await readExchange(c, tenantId);
    validateWallets(configuration, catalog);
    const wallet = configuration.wallets?.find(w => w.id === walletId);
    if (!wallet) throw new HttpError(404, "Wallet not found.");
    const assetNetwork = catalog.find(a => a.assetNetworkId === wallet.assetNetworkId);
    const asset = configuration.assets.find(a => a.assetId === assetNetwork?.assetId);
    const network = configuration.networks.find(n => n.assetNetworkId === wallet.assetNetworkId);
    if (!assetNetwork || !asset || !network?.enabled || !network.available) throw new HttpError(409, "Wallet asset/network is unavailable.");
    const row = (await c.query("SELECT * FROM tenant_integrations WHERE tenant_id=$1 AND provider_key=$2", [tenantId, wallet.providerKey])).rows[0];
    if (!row?.enabled || !row.encrypted_credentials) throw new HttpError(409, "Configure and enable this tenant's RPC connection first.");
    return { wallet, asset, network, catalog: assetNetwork, settings: row.settings, envelope: row.encrypted_credentials, revision: Number(row.revision) };
  });
  const secrets = open({ tenantId, providerKey: snapshot.wallet.providerKey, environment: "sandbox" }, snapshot.envelope);
  let result;
  try {
    const config = walletMonitorConfig(snapshot, secrets);
    result = await observeWallet(snapshot, createBlockchainMonitorAdapter(config));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "Read-only blockchain scan failed. Verify RPC permissions, network and token mapping. No financial operation was performed.");
  }
  await withDatabase(ctx, async c => {
    const e = await resolveEntitlements(c, tenantId);
    requireFeature(e, "crypto_exchange");
    if (e.tenantStatus === "suspended" || e.status !== "active") throw new HttpError(403, "Tenant monitoring access is no longer active.");
    const current = await readExchange(c, tenantId);
    const row = (await c.query("SELECT enabled,revision FROM tenant_integrations WHERE tenant_id=$1 AND provider_key=$2", [tenantId, snapshot.wallet.providerKey])).rows[0];
    if (!row?.enabled || Number(row.revision) !== snapshot.revision ||
        JSON.stringify(current.configuration.wallets?.find(w => w.id === walletId)) !== JSON.stringify(snapshot.wallet) ||
        JSON.stringify(current.configuration.assets.find(a => a.assetId === snapshot.asset.assetId)) !== JSON.stringify(snapshot.asset) ||
        JSON.stringify(current.configuration.networks.find(n => n.assetNetworkId === snapshot.wallet.assetNetworkId)) !== JSON.stringify(snapshot.network) ||
        !current.catalog.some(a => a.assetNetworkId === snapshot.wallet.assetNetworkId))
      throw new HttpError(409, "Monitoring configuration changed. Request a new observation.");
    await audit(c, p, tenantId, "exchange.wallet.observed", body.reason, { walletId, observations: result.observations.length });
  });
  return result;
}

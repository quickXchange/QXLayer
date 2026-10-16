import type { ExchangeSettings, ExchangeWallet, ExchangeCatalogAsset } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { normalizeEvmAddress, normalizeTronAddress, normalizeSolanaAddress, decodeBitcoinMainnetAddress } from "../../modules/integrations/vendor/blockchain-monitoring";

/** Public address configuration only. No private keys, address generation or custody. */
export function normalizeWalletAddress(kind: ExchangeWallet["adapterKind"], address: string) {
  if (kind === "evm") return normalizeEvmAddress(address);
  if (kind === "tron") return normalizeTronAddress(address);
  if (kind === "solana") return normalizeSolanaAddress(address);
  return decodeBitcoinMainnetAddress(address)?.address ?? "";
}
export function validateWallets(settings: ExchangeSettings, catalog?: ExchangeCatalogAsset[]) {
  const wallets = settings.wallets ?? [];
  if (new Set(wallets.map(w => w.id)).size !== wallets.length) throw new HttpError(400, "Duplicate wallet identifiers.");
  const bindings = new Set<string>();
  for (const w of wallets) {
    if (!settings.networks.some(n => n.assetNetworkId === w.assetNetworkId) ||
        catalog && !catalog.some(c => c.assetNetworkId === w.assetNetworkId))
      throw new HttpError(400, "Wallet asset/network does not belong to this Exchange.");
    if (!w.label.trim() || !normalizeWalletAddress(w.adapterKind, w.address))
      throw new HttpError(400, "Set a valid public wallet address for the selected adapter.");
    if (w.kind === "token" && (w.adapterKind === "bitcoin" || !w.contractOrMint ||
        !normalizeWalletAddress(w.adapterKind, w.contractOrMint)))
      throw new HttpError(400, "Token wallets require an explicit valid contract or mint for a supported network.");
    if (w.kind === "native" && w.contractOrMint) throw new HttpError(400, "Native wallets must not contain a token contract or mint.");
    const binding = JSON.stringify([w.assetNetworkId, normalizeWalletAddress(w.adapterKind, w.address), w.memo ?? ""]);
    if (bindings.has(binding)) throw new HttpError(400, "Duplicate wallet address and asset/network binding.");
    bindings.add(binding);
  }
}

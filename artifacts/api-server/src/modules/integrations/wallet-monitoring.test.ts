import { test } from "node:test";
import assert from "node:assert/strict";
import type { ExchangeSettings, ExchangeWallet } from "@workspace/api-zod";
import { ScanExchangeWalletResponse } from "@workspace/api-zod";
import { validateWallets } from "../../products/exchange/wallets";
import { observeWallet, walletMonitorConfig, type WalletScanScope } from "./wallet-monitoring";
import type { BlockchainMonitorAdapter, IncomingEvidence } from "./vendor/blockchain-monitoring";
import { settingsSchema } from "./input";

const address = "0x" + "1".repeat(40);
const wallet: ExchangeWallet = { id: "00000000-0000-4000-8000-000000000003", label: "Fictional read-only test wallet",
  assetNetworkId: "eth-mainnet", address, enabled: true, adapterKind: "evm", kind: "native", providerKey: "rpc" };
const scope: WalletScanScope = { wallet, asset: { assetId: "eth", symbol: "ETH", decimals: 18, enabled: true, displayOrder: 0, logoUrl: null, sandboxPlanRate: "1" },
  catalog: { assetNetworkId: "eth-mainnet", assetId: "eth", networkId: "ethereum", symbol: "ETH", name: "Ethereum", networkName: "Ethereum", testnet: false },
  settings: { adapterKind: "evm", chainId: "1", networkCode: "ETH", assignments: [{ assetId: "eth", networkId: "ethereum" }], confirmationsRequired: 3 } };
const evidence: IncomingEvidence = { eventId: "fictional-event", transactionHash: "0x" + "a".repeat(64), networkCode: "ETH",
  assetId: "eth", assetSymbol: "ETH", identityKind: "native", toAddress: address, rawAmount: "1000000000000000001", decimals: 18,
  blockOrSlot: "99", detectedAt: new Date(0).toISOString(), source: "evm-json-rpc" };
function adapter(events: IncomingEvidence[] = [evidence], canonical = true): BlockchainMonitorAdapter {
  return { networkCode: "ETH",
    async testConnection() { return { connected: true, head: "100", latencyMs: 1, chainId: "1" }; },
    async getHead() { return { cursor: "100", observedAt: new Date().toISOString() }; },
    async scanIncoming(cursor, watched) {
      assert.deepEqual(cursor, { from: "96", to: "100" });
      assert.equal(watched.length, 1); assert.equal(watched[0].address, address);
      return { cursor, evidence: events };
    },
    async getEvidenceStatus() { return { exists: true, successful: true, canonical, confirmations: 3, finalized: false }; },
  };
}
const config = (wallets: ExchangeWallet[]) => ({ wallets, networks: [{ assetNetworkId: "eth-mainnet" }] }) as ExchangeSettings;
test("wallet registration validates tenant scope, address syntax and duplicate bindings", () => {
  assert.doesNotThrow(() => validateWallets(config([wallet])));
  assert.throws(() => validateWallets(config([{ ...wallet, assetNetworkId: "other-tenant-network" }])), /does not belong/);
  assert.throws(() => validateWallets(config([{ ...wallet, address: "not-an-address" }])), /valid public/);
  assert.throws(() => validateWallets(config([wallet, { ...wallet, id: "other" }])), /Duplicate wallet address/);
  assert.throws(() => validateWallets(config([wallet, wallet])), /Duplicate wallet identifiers/);
});
test("token registrations require explicit compatible identity; native and Bitcoin reject token fields", () => {
  assert.throws(() => validateWallets(config([{ ...wallet, kind: "token" }])), /contract or mint/);
  assert.throws(() => validateWallets(config([{ ...wallet, contractOrMint: address }])), /Native wallets/);
  assert.doesNotThrow(() => validateWallets(config([{ ...wallet, kind: "token", contractOrMint: address }])));
});
test("RPC settings bind exact tenant asset/network and expected chain, never arbitrary endpoints", () => {
  const good = walletMonitorConfig(scope, { rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/fictional-test-only" });
  assert.equal(good.chainId, "1"); assert.equal(good.maxRange, 4);
  assert.throws(() => walletMonitorConfig({ ...scope, settings: { ...scope.settings, assignments: [{ assetId: "other", networkId: "ethereum" }] } }, { rpcUrl: good.endpoint }), /not assigned/);
  assert.throws(() => walletMonitorConfig({ ...scope, settings: { ...scope.settings, chainId: undefined } }, { rpcUrl: good.endpoint }), /expected chain/);
  assert.throws(() => walletMonitorConfig(scope, { rpcUrl: "https://127.0.0.1/" }), /supported provider/);
  assert.throws(() => walletMonitorConfig(scope, {}), /credentials/);
  assert.throws(() => walletMonitorConfig({ ...scope, wallet: { ...wallet, enabled: false } }, { rpcUrl: good.endpoint }), /Enable/);
});
test("bounded observations preserve exact units, deduplicate events and never settle orders", async () => {
  const r = await observeWallet(scope, adapter([evidence, evidence]));
  assert.equal(r.observations.length, 1);
  assert.equal(r.observations[0].amount, "1.000000000000000001");
  assert.equal(r.observations[0].confirmed, true);
  assert.equal(r.sandboxOnly, true); assert.equal(r.executionEnabled, false);
  assert.doesNotThrow(() => ScanExchangeWalletResponse.parse(JSON.parse(JSON.stringify(r))));
});
test("reorg/canonical status is authoritative, not a historic confirmation count", async () => {
  const r = await observeWallet(scope, adapter([evidence], false));
  assert.equal(r.observations[0].confirmations, 3);
  assert.equal(r.observations[0].confirmed, false);
});
test("foreign identity, address, memo and out-of-window evidence is not attributed to this wallet", async () => {
  const r = await observeWallet(scope, adapter([
    { ...evidence, assetId: "other-tenant-asset" },
    { ...evidence, networkCode: "OTHER" },
    { ...evidence, toAddress: "0x" + "2".repeat(40) },
    { ...evidence, identityKind: "token", contractOrMint: address },
    { ...evidence, blockOrSlot: "95" },
    { ...evidence, rawAmount: "1e18" },
  ]));
  assert.equal(r.observations.length, 0);
  const memo = await observeWallet({ ...scope, wallet: { ...wallet, memo: "tenant-a" } }, adapter([evidence]));
  assert.equal(memo.observations.length, 0);
});
test("provider failures, invalid chain heads and huge observation batches fail explicitly", async () => {
  const disconnected = adapter();
  disconnected.testConnection = async () => ({ connected: false, head: "100", latencyMs: 0 });
  await assert.rejects(() => observeWallet(scope, disconnected), /identity/);
  const invalid = adapter();
  invalid.getHead = async () => ({ cursor: "-1", observedAt: "" });
  await assert.rejects(() => observeWallet(scope, invalid), /invalid head/);
  await assert.rejects(() => observeWallet(scope, adapter(Array(101).fill(evidence))), /limit exceeded/);
});
test("all four sandbox actions can be assigned read-only rates; unknown actions remain rejected", () => {
  assert.deepEqual(settingsSchema.parse({ quoteActions: ["swap", "convert", "buy", "sell"] }).quoteActions, ["swap", "convert", "buy", "sell"]);
  assert.throws(() => settingsSchema.parse({ quoteActions: ["withdraw"] }));
});

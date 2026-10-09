import test from "node:test";
import assert from "node:assert/strict";
import { pricingAdapters, positiveRate } from "./pricing-adapters";
import { applyPricing, assertPricingSnapshot } from "../../products/exchange/provider-pricing";
import type { DatabaseClient } from "@workspace/db";
import type { ExchangeSettings } from "@workspace/api-zod";
const credentials = { apiKey: "fictional-fixture", secretKey: "fictional-fixture" };
const request = { source: "BTC", destination: "ETH", sourceNetwork: "BTC", destinationNetwork: "ETH", amount: "0.01" };
test("source 1Forge aliases and exact pair are verified without cross-tenant/global cache", async () => {
  const reads: string[] = [];
  const adapter = pricingAdapters(async url => { reads.push(url); return [{ s: "EUR/USD", p: "1.125" }]; });
  assert.equal(await adapter("1forge", { ...request, source: "EUR", destination: "USD" }, credentials), "1.125");
  assert.equal(new URL(reads[0]).searchParams.get("pairs"), "EUR/USD");
  await assert.rejects(adapter("1forge", request, credentials));
});
test("WhiteBIT public pair and USDT cross use fixed-point rate arithmetic", async () => {
  const adapter = pricingAdapters(async () => ({ BTC_USDT: { last_price: "60000" }, ETH_USDT: { last_price: "3000" } }));
  assert.equal(await adapter("whitebit", request, credentials), "20");
  assert.equal(await adapter("whitebit", { ...request, destination: "USDT" }, credentials), "60000");
});
test("provider rates reject malformed/zero/negative values and missing credentials", async () => {
  for (const value of [null, -1, "0", "NaN", "1e9", "0.0000000000000000001"]) assert.throws(() => positiveRate(value));
  await assert.rejects(pricingAdapters(async () => [])("whitebit", request, {}));
});
test("pricing snapshot does not mutate configuration or change another route", () => {
  const settings = { routes: [{ id: "route-a", rate: "1" }, { id: "route-b", rate: "3" }] } as ExchangeSettings;
  const priced = applyPricing(settings, { providerKey: "whitebit", revision: 1, routeId: "route-a", rate: "2", manualFallback: false });
  assert.equal(priced.routes[0].rate, "2");
  assert.equal(priced.routes[1].rate, "3");
  assert.equal(settings.routes[0].rate, "1");
});
test("manual and provider quotes reject changed authorization before creating an order", async () => {
  const c = (rows: any[]) => ({ query: async () => ({ rows, rowCount: rows.length }) }) as unknown as DatabaseClient;
  await assertPricingSnapshot(c([]), "tenant-a", undefined, "swap");
  await assert.rejects(assertPricingSnapshot(c([{ provider_key: "whitebit" }]), "tenant-a", undefined, "swap"));
  const snapshot = { providerKey: "whitebit", revision: 3, routeId: "route-a", rate: "2", manualFallback: false };
  await assertPricingSnapshot(c([{ enabled: true, revision: 3 }]), "tenant-a", snapshot, "swap");
  await assert.rejects(assertPricingSnapshot(c([{ enabled: true, revision: 4 }]), "tenant-a", snapshot, "swap"));
  await assert.rejects(assertPricingSnapshot(c([{ enabled: false, revision: 3 }]), "tenant-a", snapshot, "swap"));
});

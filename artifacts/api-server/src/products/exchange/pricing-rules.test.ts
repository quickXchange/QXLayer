import { test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseClient } from "@workspace/db";
import type { ExchangeSettings, ExchangePricingRule, ExchangeCatalogAsset } from "@workspace/api-zod";
import { selectPricingRule, validatePricingRules } from "./pricing-rules";
import { calculateQuote } from "./calculation";
import { sandboxPricing, assertPricingSnapshot } from "./provider-pricing";

const rule = (patch: Partial<ExchangePricingRule> = {}): ExchangePricingRule => ({
  id: "00000000-0000-4000-8000-000000000001", source: "*", destination: "*", action: "swap",
  enabled: true, priority: 0, feeBps: 100, fixedFee: "0", spreadBps: 100, ...patch,
});
const input = { action: "swap" as const, source: "btc-mainnet", destination: "eth-mainnet", amount: "10" };
const catalog: ExchangeCatalogAsset[] = [
  { assetNetworkId: "btc-mainnet", assetId: "btc", networkId: "bitcoin", symbol: "BTC", name: "Bitcoin", networkName: "Bitcoin", testnet: false },
  { assetNetworkId: "eth-mainnet", assetId: "eth", networkId: "ethereum", symbol: "ETH", name: "Ethereum", networkName: "Ethereum", testnet: false },
];
function settings(rules: ExchangePricingRule[] = []): ExchangeSettings {
  return {
    enabled: true, defaultAction: "swap", publicNote: "", fiatCurrency: "USD", fiatPlanRate: "1",
    actions: { swap: true, convert: true, buy: true, sell: true },
    assets: catalog.map(c => ({ assetId: c.assetId, symbol: c.symbol, enabled: true, decimals: 8, displayOrder: 0, logoUrl: null, sandboxPlanRate: "1" })),
    networks: catalog.map(c => ({ assetNetworkId: c.assetNetworkId, enabled: true, available: true, fee: "0", minimum: "0", maximum: "10000", information: "" })),
    routes: [{ id: "00000000-0000-4000-8000-000000000002", ...input, enabled: true, rate: "2", minimum: "1", maximum: "1000", fixedFee: "0", feeBps: 0, spreadBps: 0, paymentMethodIds: [] }],
    paymentMethods: [], pricingRules: rules,
  };
}
test("Any-to-Any applies exact integer fees/spread to a configured route", () => {
  const s = settings([rule()]);
  validatePricingRules(s);
  const { quote } = calculateQuote(s, catalog, input);
  assert.equal(quote.rate, "1.98");
  assert.equal(quote.fee, "0.1");
  assert.equal(quote.outputAmount, "19.602");
  assert.equal(quote.pricingRuleId, s.pricingRules![0].id);
});
test("specific endpoints beat higher wildcard priority; explicit priority breaks equal-specificity ties", () => {
  const broad = rule({ priority: 1000 });
  const exact = rule({ id: "exact", source: input.source, destination: input.destination, priority: 0 });
  assert.equal(selectPricingRule(settings([broad, exact]), input)?.id, "exact");
  const send = rule({ id: "send", source: input.source, priority: 2 });
  const receive = rule({ id: "receive", destination: input.destination, priority: 3 });
  validatePricingRules(settings([send, receive]));
  assert.equal(selectPricingRule(settings([send, receive]), input)?.id, "receive");
});
test("equal-priority overlaps fail validation and runtime rather than depend on array order", () => {
  const a = rule({ source: input.source }), b = rule({ id: "other", destination: input.destination });
  assert.throws(() => validatePricingRules(settings([a, b])), /overlap/);
  assert.throws(() => selectPricingRule(settings([a, b]), input), /Ambiguous/);
  assert.throws(() => selectPricingRule(settings([b, a]), input), /Ambiguous/);
});
test("disabled rules, other actions and absent rules preserve base pricing", () => {
  for (const rules of [[], [rule({ enabled: false })], [rule({ action: "convert" })]]) {
    const quote = calculateQuote(settings(rules), catalog, input).quote;
    assert.equal(quote.rate, "2"); assert.equal(quote.outputAmount, "20"); assert.equal(quote.pricingRuleId, null);
  }
});
test("manual override avoids external credentials and freezes manual pricing snapshot", async () => {
  const s = settings([rule({ rate: "3", feeBps: 0, spreadBps: 0 })]);
  const noQueries = { query: () => { throw new Error("External configuration query must not occur"); } } as unknown as DatabaseClient;
  const snapshot = await sandboxPricing(noQueries, "tenant-a", input, s, catalog);
  assert.deepEqual(snapshot, { providerKey: "manual_rule", revision: 0, routeId: s.routes[0].id, rate: "3", manualFallback: false });
  await assertPricingSnapshot(noQueries, "tenant-a", snapshot, "swap");
  assert.equal(calculateQuote(s, catalog, input).quote.outputAmount, "30");
});
test("rules cannot enable a missing route, bypass limits, or target another tenant endpoint", () => {
  const s = settings([rule({ rate: "3" })]);
  assert.throws(() => calculateQuote({ ...s, routes: [] }, catalog, input), /No enabled route/);
  assert.throws(() => calculateQuote(s, catalog, { ...input, amount: "1001" }), /between/);
  assert.throws(() => validatePricingRules(settings([rule({ source: "tenant-b-network" })])), /does not belong/);
  assert.throws(() => validatePricingRules(settings([rule({ rate: "0" })])), /positive/);
  assert.throws(() => validatePricingRules(settings([rule({ source: "fiat:USD" })])), /action/);
});
test("tenant configurations never share a pricing rule result", () => {
  assert.equal(calculateQuote(settings([rule({ rate: "3" })]), catalog, input).quote.rate, "2.97");
  assert.equal(calculateQuote(settings(), catalog, input).quote.rate, "2");
});
test("payment-method-specific Buy rules are isolated from other methods and actions", () => {
  const s = settings([rule({ action: "buy", source: "fiat:USD", paymentMethodId: "method-a" })]);
  s.paymentMethods = [{ id: "method-a", label: "Bank", enabled: true, currency: "USD", buy: true, sell: false }];
  validatePricingRules(s);
  const buy = { ...input, action: "buy" as const, source: "fiat:USD", paymentMethodId: "method-a" };
  assert.equal(selectPricingRule(s, buy)?.id, s.pricingRules![0].id);
  assert.equal(selectPricingRule(s, { ...buy, paymentMethodId: "method-b" }), undefined);
  assert.throws(() => validatePricingRules(settings([rule({ paymentMethodId: "method-a" })])), /payment method/);
});

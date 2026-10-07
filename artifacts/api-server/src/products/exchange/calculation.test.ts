import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExchangeCatalogAsset, ExchangeSettings } from "@workspace/api-zod";
import { calculateQuote } from "./calculation";
import { emptySettings } from "./settings";

// Pure arithmetic regression cases, not substitutes for browser/live-tenant QA.
const catalog = [
  { assetNetworkId: "source-network", assetId: "source", symbol: "BTC" },
  { assetNetworkId: "target-network", assetId: "target", symbol: "ETH" },
] as ExchangeCatalogAsset[];
function settings(): ExchangeSettings {
  return {
    ...emptySettings(), enabled: true, fiatPlanRate: "1",
    actions: { swap: true, convert: true, buy: true, sell: true },
    assets: ["source", "target"].map((assetId, i) => ({
      assetId, symbol: i ? "ETH" : "BTC", enabled: true, decimals: 8,
      displayOrder: i, logoUrl: null, sandboxPlanRate: "1",
    })),
    networks: ["source-network", "target-network"].map((assetNetworkId, i) => ({
      assetNetworkId, enabled: true, available: true, minimum: "0", maximum: "1000",
      fee: i ? "0.01" : "0.02", information: "",
    })),
    paymentMethods: [{
      id: "test-payment", label: "Sandbox only", currency: "USD", enabled: true,
      buy: true, sell: true, feeBps: 200, fixedFee: "0.5", minimum: "0", maximum: "1000",
    }],
    routes: (["swap", "convert", "buy", "sell"] as const).map(action => ({
      id: action, action, enabled: true,
      source: action === "buy" ? "fiat:USD" : "source-network",
      destination: action === "sell" ? "fiat:USD" : "target-network",
      rate: action === "buy" ? "0.02" : "2", minimum: "1", maximum: "1000",
      feeBps: 100, fixedFee: "0.1", spreadBps: 100,
      paymentMethodIds: action === "buy" || action === "sell" ? ["test-payment"] : [],
    })),
  };
}
for (const action of ["swap", "convert", "buy", "sell"] as const) {
  test(`${action}: exact source fees, spread, destination/payment fees and rounding`, () => {
    const s = settings(), r = s.routes.find(r => r.action === action)!;
    const q = calculateQuote(s, catalog, {
      action, source: r.source, destination: r.destination,
      amount: action === "buy" ? "100" : "10",
      ...(action === "buy" || action === "sell" ? { paymentMethodId: "test-payment" } : {}),
    }).quote;
    assert.equal(q.rate, action === "buy" ? "0.0198" : "1.98");
    assert.equal(q.fee, action === "buy" ? "3.6" : "0.22");
    assert.equal(q.outputAmount, action === "buy" ? "1.89872" : action === "sell" ? "18.47" : "19.3544");
    assert.equal(q.destinationFee, action === "sell" ? "0.887288" : "0.01");
  });
}
test("disabled route/network, min/max and source precision reject quotes", () => {
  const s = settings();
  const input = { action: "swap" as const, source: "source-network", destination: "target-network", amount: "10" };
  s.routes[0].enabled = false;
  assert.throws(() => calculateQuote(s, catalog, input), /No enabled route/);
  s.routes[0].enabled = true;
  s.networks[0].available = false;
  assert.throws(() => calculateQuote(s, catalog, input), /disabled or unavailable/);
  s.networks[0].available = true;
  for (const amount of ["0.99", "1001"]) assert.throws(() => calculateQuote(s, catalog, { ...input, amount }), /between/);
  assert.throws(() => calculateQuote(s, catalog, { ...input, amount: "10.000000001" }), /decimal places/);
});

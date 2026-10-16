import { test } from "node:test";
import assert from "node:assert/strict";
import type { ExchangeSettings, ExchangeQuoteInput } from "@workspace/api-zod";
import { paymentInstructionsSnapshot } from "./payment-snapshot";
import { projectPublicExchangeConfiguration } from "./public-configuration";
import { emptySettings } from "./settings";

function fixture(): ExchangeSettings {
  const s = emptySettings();
  s.paymentMethods = [{ id: "method-a", label: "Tenant A manual method", currency: "USD", buy: true, sell: true, enabled: true,
    instructions: "  Fictional test instructions. Do not send funds.  ", reserve: "500" }];
  s.routes = [{ id: "route", action: "buy", source: "fiat:USD", destination: "btc-network", enabled: true,
    rate: "1", minimum: "1", maximum: "100", feeBps: 0, spreadBps: 0, fixedFee: "0", paymentMethodIds: ["method-a"] }];
  return s;
}
const input: ExchangeQuoteInput = { action: "buy", source: "fiat:USD", destination: "btc-network", amount: "10", paymentMethodId: "method-a" };
test("payment instructions are frozen from the admitted configured method, never mutable lookups", () => {
  const s = fixture();
  const saved = paymentInstructionsSnapshot(s, input);
  assert.equal(saved, "Fictional test instructions. Do not send funds.");
  s.paymentMethods[0].instructions = "Changed future instructions";
  assert.equal(saved, "Fictional test instructions. Do not send funds.");
});
test("disabled, foreign, wrong-direction and unassigned methods have no instruction snapshot", () => {
  const s = fixture();
  assert.equal(paymentInstructionsSnapshot(s, { ...input, paymentMethodId: "tenant-b-method" }), null);
  assert.equal(paymentInstructionsSnapshot(s, { ...input, action: "swap" }), null);
  assert.equal(paymentInstructionsSnapshot(s, { ...input, destination: "other-network" }), null);
  s.paymentMethods[0].enabled = false;
  assert.equal(paymentInstructionsSnapshot(s, input), null);
});
test("payment instructions and reserves never leak through the anonymous method directory", () => {
  const publicConfig = projectPublicExchangeConfiguration(fixture(), [], { features: {}, overLimit: false }, true);
  assert.equal(publicConfig.paymentMethods.length, 1);
  assert.equal("instructions" in publicConfig.paymentMethods[0], false);
  assert.equal("reserve" in publicConfig.paymentMethods[0], false);
});

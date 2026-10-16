import { test } from "node:test";
import assert from "node:assert/strict";
import { cents, money, invoicePricing, assertSettlement } from "./pricing";
const plan = { id: "plan", currency: "EUR", monthlyPrice: "39.00", yearlyPrice: "390.00", setupFee: "149.00", discountPercent: "0", pricingConfigured: true };
const configuration = (p = plan, addons: any[] = [], billingPeriod = "monthly") => ({ catalogSnapshot: { plan: p, addons }, billingPeriod });
test("money arithmetic is exact without floating point", () => {
  assert.equal(money(cents("9007199254740993.01") + cents("0.09")), "9007199254740993.10");
  for (const v of ["", "NaN", "-1", "1e3", "0.001", 10, null]) assert.throws(() => cents(v));
});
test("initial invoice includes selected recurring period and one-time setup", () => {
  assert.equal(invoicePricing(configuration()).amount, "188.00");
  assert.equal(invoicePricing(configuration(plan, [], "yearly")).amount, "539.00");
  assert.equal(invoicePricing(configuration({ ...plan, discountPercent: "10.00" })).amount, "184.10");
});
test("provisional, unapproved add-ons, currency conversion and custom design cannot charge", () => {
  assert.throws(() => invoicePricing(configuration({ ...plan, pricingConfigured: false })));
  assert.throws(() => invoicePricing(configuration(plan, [{ ...plan, pricingConfirmed: false }])));
  assert.throws(() => invoicePricing(configuration(plan, [{ ...plan, currency: "USD" }])));
  assert.throws(() => invoicePricing({ ...configuration(), design: { type: "custom" } }));
});
test("approved add-on recurring and setup fees enter immutable total", () => {
  assert.equal(invoicePricing(configuration(plan, [{ ...plan, monthlyPrice: "19.00", setupFee: "0.00", pricingConfirmed: true }])).amount, "207.00");
});
test("only a complete operator-approved custom quotation can be invoiced", () => {
  const custom = { ...configuration(), design: { type: "custom" } };
  const quote = { status: "quote_ready", customDesignDecision: "approved", monthlyPrice: "35.00", setupPrice: "140.00", customizationPrice: "100.00", currency: "EUR" };
  assert.equal(invoicePricing(custom, quote).amount, "275.00");
  assert.throws(() => invoicePricing(custom, { ...quote, customDesignDecision: "pending" }));
  assert.throws(() => invoicePricing(custom, { ...quote, currency: "USD" }));
  assert.throws(() => invoicePricing(custom, { ...quote, status: "reviewing" }));
});
test("manual verification requires exact settlement, currency, reference and evidence", () => {
  const invoice = { amount: "188.00", currency: "EUR" };
  const input = { receivedAmount: "188.00", currency: "EUR", reference: "BANK-001", evidence: "Verified settled transfer against bank statement." };
  assert.doesNotThrow(() => assertSettlement(invoice, input));
  for (const patch of [{ receivedAmount: "187.99" }, { receivedAmount: "188.01" }, { currency: "USD" }, { reference: "" }, { evidence: "claimed" }])
    assert.throws(() => assertSettlement(invoice, { ...input, ...patch }));
});

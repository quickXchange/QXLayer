import { test } from "node:test";
import assert from "node:assert/strict";
import { discountBasisPoints, discountedRecurring, pricingTriple, recurringEstimate } from "./commercial-pricing";

test("unconfigured prices are not zero and mixed pricing is rejected", () => {
  assert.equal(pricingTriple([null, null, null]), false);
  assert.equal(pricingTriple(["0", "0.00", "0"]), true);
  assert.throws(() => pricingTriple(["100", null, "0"]));
});
test("percentages are bounded with exact two-place precision", () => {
  assert.equal(discountBasisPoints("12.50"), 1250n);
  assert.equal(discountBasisPoints("100"), 10000n);
  for (const bad of ["-1", "100.01", "999", "1.001", "NaN", ""]) assert.throws(() => discountBasisPoints(bad));
});
test("recurring discounts round half up, support zero and full discount", () => {
  assert.equal(discountedRecurring("0.05", "10"), "0.05");
  assert.equal(discountedRecurring("100", "12.5"), "87.50");
  assert.equal(discountedRecurring("100", "100"), "0.00");
  assert.equal(discountedRecurring("0", "75"), "0.00");
});
test("large prices use exact integers rather than floating point", () => {
  assert.equal(discountedRecurring("9999999999999999.99", "0"), "9999999999999999.99");
});
test("catalog and subscription discounts compose and yearly billing is distinct", () => {
  const items = [
    { monthlyPrice: "100", yearlyPrice: "1000", discountPercent: "10", currency: "USD" },
    { monthlyPrice: "20", yearlyPrice: "200", discountPercent: "0", currency: "USD" },
  ];
  assert.equal(recurringEstimate(items, "monthly", "10"), "99.00");
  assert.equal(recurringEstimate(items, "yearly", "10"), "990.00");
});
test("an unconfigured item or mixed currency keeps the total unknown", () => {
  assert.equal(recurringEstimate([{ monthlyPrice: null, yearlyPrice: null, currency: "USD" }], "monthly", "0"), null);
  assert.equal(recurringEstimate([{ monthlyPrice: "10", yearlyPrice: "100", currency: "USD" }, { monthlyPrice: "10", yearlyPrice: "100", currency: "EUR" }], "monthly", "0"), null);
  assert.equal(recurringEstimate([], "monthly", "0"), null);
});

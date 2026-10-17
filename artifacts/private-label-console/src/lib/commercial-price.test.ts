import assert from "node:assert/strict";
import test from "node:test";
import { recurringDisplayPrice } from "./commercial-price";
test("published display agrees with exact recurring discount rounding", () => {
  assert.equal(recurringDisplayPrice("39.00"), "39.00");
  assert.equal(recurringDisplayPrice("99.99", "12.34"), "87.65");
  assert.equal(recurringDisplayPrice("0.05", "10"), "0.05");
  assert.equal(recurringDisplayPrice("249", "100"), "0.00");
  assert.throws(() => recurringDisplayPrice("39", "101"));
  assert.throws(() => recurringDisplayPrice("undecided"));
});

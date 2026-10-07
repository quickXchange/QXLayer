import assert from "node:assert/strict";
import test from "node:test";
import { statusesForOrderView } from "./order-views";

test("all orders retains the existing ungrouped list", () => {
  assert.equal(statusesForOrderView(), null);
});
test("active and archived partition the existing operational statuses", () => {
  const active = statusesForOrderView("active")!;
  const archived = statusesForOrderView("archived")!;
  assert.deepEqual(active, ["pending", "processing"]);
  assert.deepEqual(archived, ["completed", "cancelled", "failed"]);
  assert.equal(active.some(status => archived.includes(status)), false);
  assert.equal(new Set([...active, ...archived]).size, 5);
});

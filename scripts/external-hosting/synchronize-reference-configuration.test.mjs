import { test } from "node:test";
import assert from "node:assert/strict";
import { productionReferences, TABLES } from "./synchronize-reference-configuration.mjs";

function source() {
  const result = Object.fromEntries(TABLES.map(t => [t, []]));
  result.plans = [
    { id: "reference", description: "Development phase demonstration only", pricing_configured: false, status: "enabled" },
    { id: "retained", description: "TEMPORARY DEVELOPMENT ONLY: manual customer review. Not for real customers or Production.", pricing_configured: false, status: "enabled" },
  ];
  result.plan_entitlements = [{ plan_id: "reference", key: "exchange" }, { plan_id: "retained", key: "exchange" }];
  result.addons = [{ pricing_confirmed: false, enabled: true }];
  return result;
}
test("retained customer fixture stays in Development, samples are disabled, source is untouched", () => {
  const original = source(), output = productionReferences(original);
  assert.equal(original.plans.length, 2); assert.equal(original.plans[0].status, "enabled");
  assert.deepEqual(output.plans.map(p => p.id), ["reference"]);
  assert.equal(output.plans[0].status, "disabled");
  assert.equal(output.plan_entitlements.length, 1);
  assert.equal(output.addons[0].enabled, false);
});
test("unexpected commercial prices and tenant data fail closed", () => {
  const commercial = source(); commercial.plans[0].pricing_configured = true;
  assert.throws(() => productionReferences(commercial));
  const tenant = source(); tenant.asset_catalog.push({ tenant_id: "private" });
  assert.throws(() => productionReferences(tenant));
  const table = source(); table.platform_admins = [];
  assert.throws(() => productionReferences(table));
});

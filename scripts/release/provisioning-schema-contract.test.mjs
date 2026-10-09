import { test } from "node:test";
import assert from "node:assert/strict";
import { schemaDigest, verifyProvisioningPlan, deliveryCheck, legacyDeliveryCheck } from "./provisioning-schema-contract.mjs";

const source = `check("${deliveryCheck}", sql\`status <> 'delivered' OR tenant_id IS NOT NULL\`)`;
const corrected = { name: deliveryCheck, definition: "CHECK (((status <> 'delivered'::text) OR (tenant_id IS NOT NULL)))", validated: true };
const old = { name: legacyDeliveryCheck, definition: "CHECK (((status = 'delivered'::text) = (tenant_id IS NOT NULL)))", validated: true };
function fixture() {
  return {
    schemaSha256: schemaDigest(source), development: [corrected], production: [old],
    diff: { success: true, hasDiff: true, hasStructuralDataLoss: false,
      tablesToRemove: [], tablesToTruncate: [], columnsToRemove: [], schemasToRemove: [], matViewsToRemove: [],
      statementsToExecute: [
        `ALTER TABLE "white_label_requests" DROP CONSTRAINT "${legacyDeliveryCheck}";`,
        `ALTER TABLE "white_label_requests" ADD CONSTRAINT "${deliveryCheck}" CHECK ((status <> 'delivered'::text) OR (tenant_id IS NOT NULL));`,
      ] },
  };
}
test("accepts the exact non-destructive native CHECK replacement", () => {
  assert.equal(verifyProvisioningPlan(fixture(), source), "ready-for-native-publish");
});
test("accepts actual post-publish parity without another migration", () => {
  const f = fixture(); f.production = [corrected]; f.diff.hasDiff = false; f.diff.statementsToExecute = [];
  assert.equal(verifyProvisioningPlan(f, source), "already-applied");
});
test("rejects an empty diff while Production still has the incompatible rule", () => {
  const f = fixture(); f.diff.hasDiff = false; f.diff.statementsToExecute = [];
  assert.throws(() => verifyProvisioningPlan(f, source), /must detect/);
});
test("rejects stale evidence after a source change", () => {
  assert.throws(() => verifyProvisioningPlan(fixture(), source + "changed"), /refresh/);
});
test("rejects every destructive diff field", () => {
  for (const key of ["tablesToRemove", "tablesToTruncate", "columnsToRemove", "schemasToRemove", "matViewsToRemove"]) {
    const f = fixture(); f.diff[key] = ["protected"];
    assert.throws(() => verifyProvisioningPlan(f, source), /Unsafe/);
  }
});
test("rejects extra SQL, a wrong predicate, or reversed replacement order", () => {
  for (const edit of [
    f => f.diff.statementsToExecute.push("DELETE FROM platform_admins"),
    f => f.diff.statementsToExecute[1] = f.diff.statementsToExecute[1].replace("<>", "="),
    f => f.diff.statementsToExecute.reverse(),
  ]) {
    const f = fixture(); edit(f);
    assert.throws(() => verifyProvisioningPlan(f, source), /exact CHECK replacement/);
  }
});
test("rejects unexpected, duplicate or unvalidated delivery constraints", () => {
  for (const edit of [
    f => f.production.push(corrected),
    f => f.development[0] = { ...corrected, validated: false },
    f => f.production[0] = { ...old, definition: "CHECK (true)" },
    f => f.diff.success = false,
  ]) {
    const f = fixture(); edit(f);
    assert.throws(() => verifyProvisioningPlan(f, source));
  }
});

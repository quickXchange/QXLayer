import test from "node:test";
import assert from "node:assert/strict";
import { commercialAdditions, commercialSchemaFiles, verifyCommercialPlan } from "./commercial-schema-contract.mjs";
import { schemaDigest } from "./provisioning-schema-contract.mjs";
const read = file => `test source: ${file}`;
const evidence = () => ({
  schemaDigests: Object.fromEntries(commercialSchemaFiles.map(f => [f, schemaDigest(read(f))])),
  diff: { success: true, hasDiff: true, hasStructuralDataLoss: false, maybeNonBackwardsCompatible: false,
    tablesToRemove: [], tablesToTruncate: [], columnsToRemove: [], schemasToRemove: [], matViewsToRemove: [],
    statementsToExecute: [...commercialAdditions] },
});
test("accepts only reviewed additive commercial statements", () => assert.match(verifyCommercialPlan(evidence(), read), /14 additive/));
test("accepts quoted public-qualified native foreign keys", () => {
  const e = evidence();
  e.diff.statementsToExecute = e.diff.statementsToExecute.map(s => s.replace("REFERENCES white_label_events(id)", 'REFERENCES "public"."white_label_events"("id")'));
  assert.match(verifyCommercialPlan(e, read), /14 additive/);
});
test("rejects stale source and missing/error evidence", () => {
  assert.throws(() => verifyCommercialPlan(evidence(), () => "changed"));
  const e = evidence(); e.diff.success = false; assert.throws(() => verifyCommercialPlan(e, read));
});
test("rejects all destructive flags and backwards-incompatible changes", () => {
  for (const key of ["tablesToRemove", "tablesToTruncate", "columnsToRemove", "schemasToRemove", "matViewsToRemove"]) {
    const e = evidence(); e.diff[key] = ["customer_data"]; assert.throws(() => verifyCommercialPlan(e, read));
  }
  for (const key of ["hasStructuralDataLoss", "maybeNonBackwardsCompatible"]) {
    const e = evidence(); e.diff[key] = true; assert.throws(() => verifyCommercialPlan(e, read));
  }
});
test("rejects data writes, extra SQL and altered defaults/check predicates", () => {
  for (const sql of ["DELETE FROM plans;", "UPDATE platform_admins SET active=false;", "ALTER TABLE plans ADD COLUMN pricing_configured boolean DEFAULT true NOT NULL;",
    "ALTER TABLE addons ADD CONSTRAINT addons_discount CHECK (discount_percent >= 0);"]) {
    const e = evidence(); e.diff.statementsToExecute.push(sql); assert.throws(() => verifyCommercialPlan(e, read));
  }
});
test("supports already-applied review without claiming fresh Production readback", () => {
  const e = evidence(); e.diff.hasDiff = false; e.diff.statementsToExecute = [];
  assert.equal(verifyCommercialPlan(e, read), "already-applied");
});

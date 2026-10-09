import assert from "node:assert/strict";

/** Read-only native-plan safety review. Never manufactures or executes a plan. */
export function verifyDatabaseSecurityPlan(snapshot) {
  const plan = snapshot.diff;
  assert.equal(plan?.success, true, "Fresh native database security plan unavailable.");
  assert.equal(plan.hasStructuralDataLoss, false, "Native security plan contains destructive changes.");
  for (const key of ["tablesToRemove", "tablesToTruncate", "columnsToRemove", "schemasToRemove", "matViewsToRemove"])
    assert.equal(plan[key]?.length ?? 0, 0, `Unsafe native plan: ${key}`);
  const statements = plan.statementsToExecute ?? [];
  const policies = statements.filter(s => /CREATE POLICY\s+"qx_(?:read|write)"/i.test(s));
  for (const s of policies) {
    assert.match(s, /\bUSING\s*\(/i,
      "Publishing blocked: native policy statements omit their USING conditions. Do not apply this plan.");
    if (/qx_write/.test(s)) {
      assert.match(s, /\bWITH CHECK\s*\(/i, "Publishing blocked: native write policies omit WITH CHECK.");
      assert.match(s, /app\.can_write/, "Publishing blocked: native write policy loses its trusted write-context condition.");
      assert.match(s, /app\.is_super_admin/, "Publishing blocked: native write policy loses its authority condition.");
    }
  }
  if (policies.length) assert(statements.some(s => /GRANT\b.*\bTO\s+"?pg_database_owner"?/is.test(s)),
    "Publishing blocked: native plan omits the restricted built-in role's required grants.");
  return "Native policy/grant changes reviewed; no SQL executed.";
}

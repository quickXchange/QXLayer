import test from "node:test";
import assert from "node:assert/strict";
import { verifyDatabaseSecurityPlan } from "./database-security-contract.mjs";
function plan(statement) {
  return { diff: { success: true, hasStructuralDataLoss: false,
    statementsToExecute: [statement, "GRANT SELECT ON public.platform_admins TO pg_database_owner;"] } };
}
test("unreviewed policy names cannot bypass the native publication gate", () => {
  assert.throws(() => verifyDatabaseSecurityPlan(plan('CREATE POLICY "unexpected" ON public.platform_admins FOR ALL TO public USING (true) WITH CHECK (true);')));
});
test("trusted USING cannot conceal an unrestricted WITH CHECK", () => {
  assert.throws(() => verifyDatabaseSecurityPlan(plan('CREATE POLICY "qx_write" ON public.platform_admins FOR ALL TO public USING (current_setting(\'app.can_write\',true)=\'true\' AND current_setting(\'app.is_super_admin\',true)=\'true\') WITH CHECK (true);')));
});

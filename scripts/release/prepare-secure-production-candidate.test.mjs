import test from "node:test";
import assert from "node:assert/strict";
import { secureCandidate } from "./prepare-secure-production-candidate.mjs";
const auth = 'CREATE SCHEMA "vynox_supabase_auth";--> statement-breakpoint' +
  ["identity_links", "sessions", "rate_limits", "recovery_codes", "recovery_events"]
    .map(t => `CREATE TABLE "vynox_supabase_auth"."${t}" ("id" text);`).join("--> statement-breakpoint");
const read = 'CREATE POLICY "qx_read" ON "t" FOR SELECT TO public USING (tenant_id::text=current_setting(\'app.tenant_id\',true));';
const write = 'CREATE POLICY "qx_write" ON "t" FOR ALL TO public USING (current_setting(\'app.is_super_admin\',true)=\'true\' AND current_setting(\'app.can_write\',true)=\'true\') WITH CHECK (current_setting(\'app.can_write\',true)=\'true\');';
const native = { success: true, hasStructuralDataLoss: false,
  statementsToExecute: ['CREATE POLICY "qx_read" ON "t" FOR SELECT TO public;',
    'CREATE POLICY "qx_write" ON "t" FOR ALL TO public;'] };
test("restores exact canonical predicates, includes private schema, never declares native preview fixed", () => {
  const r = secureCandidate(native, `${auth}--> statement-breakpoint${read}--> statement-breakpoint${write}`);
  assert.equal(r.restoredPolicyCount, 2); assert.equal(r.nativePreviewFixed, false);
  assert.equal(r.applied, false); assert(r.reviewStatements.includes(write));
});
test("rejects destructive previews, absent policies, weakened writes and incomplete Auth schemas", () => {
  for (const [plan, sql] of [
    [{ ...native, hasStructuralDataLoss: true }, auth],
    [native, auth], [native, `${auth}--> statement-breakpoint${read}--> statement-breakpoint${write.replace("WITH CHECK", "NO_CHECK")}`],
    [native, `${read}--> statement-breakpoint${write}`],
  ]) assert.throws(() => secureCandidate(plan, sql));
});

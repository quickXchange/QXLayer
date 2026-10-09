import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyDatabaseSecurityPlan } from "./database-security-contract.mjs";

const snapshot = statements => ({ diff: { success: true, hasStructuralDataLoss: false, statementsToExecute: statements } });
test("native policies without predicates or grants cannot clear release preflight", () => {
  assert.throws(() => verifyDatabaseSecurityPlan(snapshot(['CREATE POLICY "qx_read" ON "tenants" FOR SELECT TO public;'])), /USING/);
  assert.throws(() => verifyDatabaseSecurityPlan(snapshot(['CREATE POLICY "qx_write" ON "tenants" FOR ALL USING (true);'])), /WITH CHECK/);
  assert.throws(() => verifyDatabaseSecurityPlan(snapshot(['CREATE POLICY "qx_read" ON "tenants" USING (true);'])), /grants/);
});
test("complete native review is read-only and rejects destructive flags", () => {
  assert.match(verifyDatabaseSecurityPlan(snapshot(["CREATE POLICY \"qx_write\" ON \"tenants\" USING (current_setting('app.is_super_admin')='true' AND current_setting('app.can_write')='true') WITH CHECK (current_setting('app.can_write')='true');",
    'GRANT SELECT ON tenants TO pg_database_owner;'])), /no SQL executed/);
  const unsafe = snapshot([]); unsafe.diff.hasStructuralDataLoss = true;
  assert.throws(() => verifyDatabaseSecurityPlan(unsafe), /destructive/);
});

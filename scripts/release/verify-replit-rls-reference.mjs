/**
 * Offline validation of actual read-only metadata. No SQL execution, database
 * connection, generated DDL, migration, authentication mutation, or publishing.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const load = file => JSON.parse(readFileSync(resolve(root, "reports/replit-rls-blocker", file), "utf8"));
const dev = load("development-readback.json").metadata;
const production = load("production-readback.json").metadata;
const diff = load("native-preview.json").diff;
assert.equal(dev.role.name, "pg_database_owner");
assert.equal(dev.role.superuser, false);
assert.equal(dev.role.bypass, false);
assert(dev.tables.length > 0);
assert.equal(dev.policies.length, dev.tables.length * 2);
for (const table of dev.tables) {
  assert(table.rls && table.force, `${table.name} must enable and FORCE RLS`);
  assert(table.select && table.insert && table.update && table.delete, `${table.name} lacks CRUD privileges`);
  const policies = dev.policies.filter(p => p.table === table.name);
  assert.equal(policies.length, 2);
  const read = policies.find(p => p.name === "qx_read" && p.command === "SELECT");
  const write = policies.find(p => p.name === "qx_write" && p.command === "ALL");
  assert(read?.using?.trim(), `${table.name} lacks its read predicate`);
  assert(write?.using?.trim() && write?.check?.trim(), `${table.name} lacks a write predicate/check`);
  for (const expression of [write.using, write.check]) {
    assert(expression.includes("app.can_write"), `${table.name} loses trusted write context`);
    assert(expression.includes("app.is_super_admin"), `${table.name} loses trusted authority context`);
  }
}
for (const sequence of dev.sequences ?? [])
  assert(sequence.usage && sequence.select, `${sequence.name} lacks sequence privileges`);
for (const table of production.tables)
  assert(dev.tables.some(t => t.name === table.name), `Existing Production table ${table.name} absent from reference`);
assert.equal(diff.success, true);
const statements = diff.statementsToExecute ?? [];
const missingPredicates = statements.filter(s => /CREATE POLICY/i.test(s) && !/\bUSING\s*\(/i.test(s));
const missingWriteChecks = statements.filter(s => /CREATE POLICY\s+"qx_write"/i.test(s) && !/\bWITH CHECK\s*\(/i.test(s));
const result = {
  status: missingPredicates.length || missingWriteChecks.length ? "PUBLISH_BLOCKED" : "REQUIRES_FULL_NATIVE_PLAN_REVIEW",
  developmentReference: "METADATA_VALIDATED; not a new execution of CRUD/browser tests",
  tables: dev.tables.length, policies: dev.policies.length,
  existingProductionTablesCovered: production.tables.length,
  nativeStatements: statements.length,
  nativeMissingUsing: missingPredicates.length,
  nativeMissingWriteChecks: missingWriteChecks.length,
  nativeGrantStatements: statements.filter(s => /\bGRANT\b/i.test(s)).length,
  nativeForceStatements: statements.filter(s => /FORCE ROW LEVEL SECURITY/i.test(s)).length,
  noStructuralDataLossFlag: diff.hasStructuralDataLoss === false,
  productionSchemaChanged: false, migrationPreparedOrExecuted: false,
  published: false, liveWorkflowVerified: false,
};
writeFileSync(resolve(root, "reports/replit-rls-blocker/validation.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

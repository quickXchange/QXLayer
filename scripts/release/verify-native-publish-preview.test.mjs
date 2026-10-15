import test from "node:test";
import assert from "node:assert/strict";
import { decodeCatalog, canonical, verifyNative } from "./verify-native-publish-preview.mjs";
test("catalog decoding validates the SQL result envelope and preserves exact metadata", () => {
  const metadata = { policies: [{ using: "current_setting('app.can_write',true)='true'" }] };
  const output = `metadata\n"${JSON.stringify(metadata).replaceAll('"', '""')}"\n`;
  assert.deepEqual(decodeCatalog({ success: true, exitCode: 0, output }), metadata);
  assert.throws(() => decodeCatalog({ success: false, exitCode: 0, output }));
});
test("format normalization does not rewrite values inside SQL strings", () => {
  assert.equal(canonical(`"public"."tenant" = 'Public. Tenant Value'`), "tenant='Public. Tenant Value'");
});
test("native preview cannot be labelled fixed when predicates or private schema are omitted", () => {
  const policy = { table: "probe", name: "qx_write", roles: ["public"], command: "ALL", using: "false", check: "false" };
  const report = verifyNative({ success: true, statementsToExecute: [
    'CREATE POLICY "qx_write" ON "probe" AS PERMISSIVE FOR ALL TO public;',
  ] }, { policies: [policy], authTables: [{ schema: "vynox_supabase_auth", table: "sessions" }], authColumns: [] },
  { privateConstraints: [], authSchemaReaderUsage: true },
  { policyKinds: [{ table: "probe", name: "qx_write", permissive: "PERMISSIVE" }], rlsTables: [], columns: [], indexes: [], constraints: [] });
  assert.equal(report.status, "NATIVE_PUBLISH_BLOCKED");
  assert.equal(report.missingUsing, 1); assert.equal(report.missingWithCheck, 1);
  assert.deepEqual(report.missingPrivateTables, ["sessions"]);
  assert.equal(report.nativePlanFixed, false); assert.equal(report.liveModified, false);
});
test("indented table definitions retain column, default, nullability and primary-key verification", () => {
  const report = verifyNative({ success: true, statementsToExecute: [
    'CREATE TABLE "probe" (\n\t"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL\n);',
  ] }, { policies: [], authTables: [], authColumns: [] }, { privateConstraints: [] }, {
    policyKinds: [], rlsTables: [], indexes: [],
    columns: [{ table: "probe", name: "id", type: "uuid", notNull: true, default: "gen_random_uuid()" }],
    constraints: [{ table: "probe", name: "probe_pkey", type: "p", definition: "PRIMARY KEY (id)" }],
  });
  const table = report.statementInventory[0];
  assert.equal(table.exactColumnCount, true); assert.equal(table.primaryKeysMatch, true);
  assert.deepEqual(table.columns, [{ name: "id", present: true, typeMatches: true, notNullMatches: true, defaultMatches: true }]);
});

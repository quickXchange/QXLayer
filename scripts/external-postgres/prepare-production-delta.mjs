/**
 * Emit reviewed schema-only SQL, never connect or apply. Uses the independently
 * verified catalog/native comparison, not lossy native policy statements.
 */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dir = "generated-artifacts/native-publish-investigation";
const json = async name => JSON.parse(await readFile(`${dir}/${name}.json`, "utf8"));
const [dev, visibility, verification, native] = await Promise.all([
  json("development-catalog-decoded"), json("development-visibility-decoded"), json("verification"), json("native-fresh"),
]);
assert.equal(verification.policiesReviewed, 84);
assert.equal(dev.authTables.length, 5);
assert.equal(dev.authColumns.length, 20);
const quote = id => `"${id.replaceAll('"', '""')}"`;
const publicTable = name => `public.${quote(name)}`;
const schema = "vynox_supabase_auth";
const newTables = new Set(["tenant_integrations", "tenant_telegram_receipts"]);
const ddl = native.statementsToExecute.filter(s =>
  /^CREATE TABLE|^ALTER TABLE .* ADD CONSTRAINT|^CREATE UNIQUE INDEX/.test(s));
assert.equal(ddl.length, 8);
const inventory = verification.statementInventory.filter(i => ["create_table", "constraint", "index"].includes(i.kind));
assert(inventory.every(i => i.kind === "create_table"
  ? i.exactColumnCount && i.primaryKeysMatch && i.columns.every(c => c.present && c.typeMatches && c.notNullMatches && c.defaultMatches) && i.checks.every(c => c.matches)
  : i.matchesSource));
const lines = [
  "-- PREPARED ONLY. No account/data import. Do not execute on Replit Live.",
  "-- Requires reviewed baseline migrations and a pinned isolated Supabase target.",
  "-- Target project: qcgvhlphalxqzzsxqjhi. Execute atomically with advisory lock.",
  "DO $$ BEGIN IF current_setting('qxlayer.external_migration_authorized',true) IS DISTINCT FROM 'yes' THEN RAISE EXCEPTION 'Guarded external migration runner required'; END IF; END $$;",
  ...ddl,
];
for (const name of newTables) {
  lines.push(`REVOKE ALL ON ${publicTable(name)} FROM PUBLIC, anon, authenticated;`,
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ${publicTable(name)} TO qxlayer_runtime;`);
}
for (const p of dev.policies) {
  assert(p.using, "Missing source policy predicate");
  assert(["SELECT", "ALL"].includes(p.command));
  const check = p.check === null ? "" : ` WITH CHECK (${p.check})`;
  // Narrow role scope to the pre-existing external runtime role. Never grant
  // native Supabase anon/authenticated roles business-table permissions.
  const statement = newTables.has(p.table)
    ? `CREATE POLICY ${quote(p.name)} ON ${publicTable(p.table)} AS PERMISSIVE FOR ${p.command} TO qxlayer_runtime USING (${p.using})${check};`
    : `ALTER POLICY ${quote(p.name)} ON ${publicTable(p.table)} TO qxlayer_runtime USING (${p.using})${check};`;
  lines.push(statement);
}
for (const name of [...new Set(dev.policies.map(p => p.table))].sort())
  lines.push(`ALTER TABLE ${publicTable(name)} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${publicTable(name)} FORCE ROW LEVEL SECURITY;`);
lines.push(`CREATE SCHEMA IF NOT EXISTS ${quote(schema)};`,
  `REVOKE ALL ON SCHEMA ${quote(schema)} FROM PUBLIC, anon, authenticated, qxlayer_runtime, qxlayer_app;`);
const types = new Map([["uuid", "uuid"], ["text", "text"], ["integer", "integer"],
  ["timestamp with time zone", "timestamptz"]]);
for (const table of dev.authTables) {
  const columns = dev.authColumns.filter(c => c.table === table.table).map(c => {
    assert(types.has(c.type), "Unreviewed private column type");
    return `${quote(c.column)} ${types.get(c.type)}${c.default === null ? "" : ` DEFAULT ${c.default}`}${c.nullable === "NO" ? " NOT NULL" : ""}`;
  });
  const constraints = visibility.privateConstraints.filter(c => c.table === table.table)
    .map(c => `CONSTRAINT ${quote(c.name)} ${c.definition}`);
  lines.push(`CREATE TABLE ${quote(schema)}.${quote(table.table)} (\n  ${[...columns, ...constraints].join(",\n  ")}\n);`);
}
lines.push(`CREATE INDEX vynox_sb_session_subject ON ${quote(schema)}.sessions(subject);`,
  `REVOKE ALL ON ALL TABLES IN SCHEMA ${quote(schema)} FROM PUBLIC, anon, authenticated, qxlayer_runtime, qxlayer_app;`);
const sql = lines.join("\n") + "\n", out = "deploy/production-candidate";
await mkdir(out, { recursive: true });
await writeFile(`${out}/0004_latest-schema-PREPARED.sql`, sql);
await writeFile(`${out}/manifest-PREPARED.json`, JSON.stringify({
  status: "PREPARED_NOT_EXECUTED", projectRef: "qcgvhlphalxqzzsxqjhi",
  file: "0004_latest-schema-PREPARED.sql", sha256: createHash("sha256").update(sql).digest("hex"),
  dependsOn: ["0001_application_schema.sql", "0002_runtime_security.sql", "0003_owned_auth.sql"],
  publicPolicies: 84, forcedRlsTables: 42, privateTables: 5, privateColumns: 20, privateConstraints: 11,
  policyScope: "qxlayer_runtime only (narrower than Development PUBLIC)",
  sourceNativePlanHash: verification.nativePlanSha256,
  copiesAccounts: false, copiesData: false, startupDdl: false, liveChanged: false,
  blockers: ["Pinned Production database credential", "Production server key",
    "Fresh source catalog comparison before execution", "Restore/baseline ledger reconciliation",
    "Protected administrator/MFA continuity approval and native acceptance"],
}, null, 2) + "\n");
console.log("Prepared source-verified schema delta: 84 guarded policies, 42 FORCE RLS tables, five private Auth tables; no database connection or execution.");

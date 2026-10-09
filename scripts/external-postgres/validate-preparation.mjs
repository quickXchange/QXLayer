import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const source = JSON.parse(read("reports/supabase-migration/source-inventory.json"));
const manifest = JSON.parse(read("reports/supabase-migration/security-manifest.json"));
const security = read("generated-artifacts/supabase/security-bootstrap.sql");
const dir = "generated-artifacts/supabase/bootstrap";
const files = readdirSync(resolve(root, dir)).filter(f => f.endsWith(".sql"));
assert.equal(files.length, 1, "Bootstrap review requires one initial schema; upgrades need a separate versioned review.");
const bootstrap = read(`${dir}/${files[0]}`);
// Never hand operators an unguarded raw ORM bootstrap as the execution entrypoint.
const guardedBootstrap = security.slice(0, security.indexOf("CREATE ROLE qxlayer_runtime"))
  + bootstrap + "\nCOMMIT;\n";
const tables = manifest.targetTables;
assert.equal(new Set(tables.map(t => t.name)).size, tables.length);
assert.equal(createHash("sha256").update(security).digest("hex"), manifest.sqlSha256);
for (const name of source.inventory.tables) {
  const target = tables.find(t => t.name === name);
  assert(target, `Missing Production table ${name}`);
  for (const c of source.inventory.columns.filter(c => c.table === name))
    assert(target.columns.includes(c.column), `Missing Production field ${name}.${c.column}`);
}
for (const t of tables) {
  assert(bootstrap.includes(`CREATE TABLE "${t.name}"`), `Missing bootstrap definition ${t.name}`);
  assert(security.includes(`USING (${t.policies.read})`), `Read predicate lost for ${t.name}`);
  assert(security.includes(`WITH CHECK (${t.policies.write})`), `Write predicate lost for ${t.name}`);
  assert(security.includes(`ALTER TABLE public."${t.name}" FORCE ROW LEVEL SECURITY;`));
  assert(security.includes(`GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."${t.name}" TO qxlayer_runtime;`));
}
assert.equal((bootstrap.match(/CREATE POLICY/g) ?? []).length, tables.length * 2);
assert.equal((bootstrap.match(/\bUSING\s*\(/g) ?? []).length, tables.length * 2);
assert.equal((bootstrap.match(/WITH CHECK/g) ?? []).length, tables.length);
assert.equal((security.match(/CREATE POLICY/g) ?? []).length, tables.length * 2);
assert.equal((security.match(/\bUSING\s*\(/g) ?? []).length, tables.length * 2);
assert.equal((security.match(/WITH CHECK/g) ?? []).length, tables.length);
assert.match(security, /current_database\(\)<>'postgres'/);
assert.match(security, /supabase_admin/);
assert.match(security, /qxlayer\.external_migration_authorized/);
assert.match(security, /CREATE ROLE qxlayer_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS/);
assert.match(security, /GRANT qxlayer_runtime TO qxlayer_app WITH INHERIT FALSE/);
for (const name of manifest.sequences)
  assert(security.includes(`GRANT USAGE,SELECT ON SEQUENCE public."${name}" TO qxlayer_runtime;`));
const commands = `${bootstrap}\n${security}`.replace(/--[^\n]*/g, "");
assert(!/\b(?:DROP\s+(?:TABLE|SCHEMA|DATABASE|COLUMN)|TRUNCATE|DELETE\s+FROM)\b/i.test(commands), "Data-destructive bootstrap.");
assert(!/\bPASSWORD\s+/i.test(commands), "Never embed credentials in migration artifacts.");
assert.equal(manifest.migrationApplied, false);
assert.equal(manifest.targetVerified, false);
assert.equal(manifest.cutoverAuthorized, false);
const result = {
  preparedAt: new Date().toISOString(),
  status: "STATIC_PREPARATION_VALIDATED_NOT_EXECUTED",
  sourceTables: source.inventory.tables.length, targetTables: tables.length,
  completePolicies: tables.length * 2,
  preservedColumnCoverage: source.inventory.columns.length,
  bootstrapSha256: createHash("sha256").update(bootstrap).digest("hex"),
  securitySha256: manifest.sqlSha256,
  outstanding: ["Target connection and PostgreSQL execution", "Constraint/type/data parity rehearsal",
    "Actual qxlayer_app/qxlayer_runtime cross-tenant tests", "Clerk Production identity portability",
    "Storage transfer", "Vercel/Render portability implementation", "User-approved cutover", "Live verification"],
};
writeFileSync(resolve(root, "reports/supabase-migration/preparation-validation.json"), JSON.stringify(result, null, 2));
writeFileSync(resolve(root, "generated-artifacts/supabase/schema-bootstrap.sql"), guardedBootstrap);
console.log(JSON.stringify(result, null, 2));

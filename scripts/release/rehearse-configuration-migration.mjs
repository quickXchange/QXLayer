import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";

// Synthetic rehearsal only. Every connection explicitly targets a private /tmp socket.
// No Development/Production credentials, connection strings or application databases.
const dir = "reports/production-configuration-migration";
const review = JSON.parse(readFileSync(`${dir}/database-review.json`, "utf8"));
const prepared = readFileSync(`${dir}/migration-PREPARED.sql`, "utf8");
const socket = "/tmp/qx-configuration-rehearsal/socket";
const env = { PATH: process.env.PATH, HOME: process.env.HOME, PGSSLMODE: "disable" };
const args = ["-X", "-h", socket, "-p", "55439", "-U", userInfo().username, "-v", "ON_ERROR_STOP=1"];
const q = s => `"${s.replaceAll('"', '""')}"`;
const literal = s => `'${s.replaceAll("'", "''")}'`;
function sql(database, statement) {
  return execFileSync("psql", [...args, "-d", database, "-At", "-c", statement], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function run(database, content, shouldFail = false) {
  const path = `${socket}/rehearsal.sql`;
  writeFileSync(path, content);
  try {
    const result = execFileSync("psql", [...args, "-d", database, "-f", path], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert(!shouldFail, "Expected this execution to reject.");
    return result;
  } catch (error) {
    if (!shouldFail || !error.status) throw error;
    return String(error.stderr);
  }
}
const meta = review.production.metadata;
const tables = [...review.included, ...review.excluded].sort();
const fixtureSchema = [
  ...tables.map(t => `CREATE TABLE public.${q(t)} (${meta.columns.filter(c => c.table === t).map(c => `${q(c.column)} ${c.type}${c.notNull ? " NOT NULL" : ""}`).join(",")});`),
  ...meta.constraints.filter(c => c.type === "p" || c.type === "u").map((c, i) => `ALTER TABLE public.${q(c.table)} ADD CONSTRAINT fixture_identity_${i} ${c.definition};`),
  ...meta.constraints.filter(c => c.type !== "p" && c.type !== "u").map((c, i) => `ALTER TABLE public.${q(c.table)} ADD CONSTRAINT fixture_constraint_${i} ${c.definition};`),
  "INSERT INTO public.platform_admins VALUES ('synthetic-rehearsal-owner',true,'2026-01-01T00:00:00Z');",
].join("\n");
const total = db => Number(sql(db, `SELECT (${review.included.map(t => `(SELECT count(*) FROM public.${q(t)})`).join("+")});`).trim());
const approved = prepared.replace("approved constant boolean := false", "approved constant boolean := true");
const results = [];
function fixture(name) {
  sql("postgres", `CREATE DATABASE ${q(name)};`);
  sql(name, fixtureSchema);
  const digest = sql(name, "SELECT md5(coalesce(string_agg(md5(to_jsonb(a)::text),',' ORDER BY md5(to_jsonb(a)::text)),'')) FROM platform_admins a;").trim();
  return approved.replace(review.productionOwnerGuard.digest, digest);
}
let candidate = fixture("qx_scope_and_idempotence");
assert.match(run("qx_scope_and_idempotence", prepared, true), /Scope not approved/);
assert.equal(total("qx_scope_and_idempotence"), 0);
results.push("Unapproved original file rejects without inserting any data.");
assert.match(run("qx_scope_and_idempotence", approved, true), /owner fingerprint/);
assert.equal(total("qx_scope_and_idempotence"), 0);
results.push("Wrong owner/target fingerprint rejects before any insert.");
run("qx_scope_and_idempotence", candidate);
assert.equal(total("qx_scope_and_idempotence"), 277);
assert.equal(sql("qx_scope_and_idempotence", "SELECT count(*) FROM landing_products WHERE visible;").trim(), "15");
assert.equal(sql("qx_scope_and_idempotence", "SELECT visible FROM landing_products WHERE key='kolo';").trim(), "f");
const before = sql("qx_scope_and_idempotence", "SELECT to_jsonb(a)::text FROM platform_admins a;");
run("qx_scope_and_idempotence", candidate);
assert.equal(total("qx_scope_and_idempotence"), 277);
assert.equal(sql("qx_scope_and_idempotence", "SELECT to_jsonb(a)::text FROM platform_admins a;"), before);
results.push("Full 277-row import passes actual reproduced Production column/CHECK/FK definitions; 15 visible, Kolo hidden; rerun is unchanged.");
candidate = fixture("qx_existing_match");
sql("qx_existing_match", `INSERT INTO module_catalog SELECT * FROM jsonb_populate_record(NULL::module_catalog,${literal(JSON.stringify(JSON.parse(readFileSync(`${dir}/source.json`, "utf8")).module_catalog[0]))}::jsonb);`);
run("qx_existing_match", candidate);
assert.equal(total("qx_existing_match"), 277);
results.push("An existing matching configuration record is retained, not duplicated or overwritten.");
candidate = fixture("qx_existing_conflict");
const conflictingModule = {
  ...JSON.parse(readFileSync(`${dir}/source.json`, "utf8")).module_catalog[0],
  name: "Keep original conflicting label",
};
sql("qx_existing_conflict", `INSERT INTO module_catalog SELECT * FROM jsonb_populate_record(NULL::module_catalog,${literal(JSON.stringify(conflictingModule))}::jsonb);`);
assert.match(run("qx_existing_conflict", candidate, true), /Existing-key value conflict/);
assert.equal(total("qx_existing_conflict"), 1);
assert.equal(sql("qx_existing_conflict", "SELECT name FROM module_catalog;").trim(), "Keep original conflicting label");
results.push("A conflicting existing record aborts all changes and keeps its original value.");
candidate = fixture("qx_late_failure");
const position = candidate.lastIndexOf("  FOREACH t IN ARRAY ARRAY[");
candidate = candidate.slice(0, position) + "  RAISE EXCEPTION 'Synthetic late failure after every insert';\n" + candidate.slice(position);
assert.match(run("qx_late_failure", candidate, true), /Synthetic late failure/);
assert.equal(total("qx_late_failure"), 0);
assert.equal(sql("qx_late_failure", "SELECT count(*) FROM platform_admins;").trim(), "1");
results.push("Injected failure after all inserts rolls the entire single statement back; synthetic owner survives.");
writeFileSync(`${dir}/rehearsal.json`, JSON.stringify({
  status: "PASSED_SYNTHETIC_REHEARSAL_ONLY",
  target: "Isolated PostgreSQL 16 cluster, private /tmp socket",
  productionExecuted: false, productionVerified: false, developmentModified: false,
  tests: results,
}, null, 2) + "\n");
console.log(results.map((r, i) => `PASS ${i + 1}: ${r}`).join("\n"));

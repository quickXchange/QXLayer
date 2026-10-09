import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { pool } from "@workspace/db";

if (process.env.NODE_ENV === "production") throw new Error("Development readback only.");
const dir = "../../reports/commercial-white-label-release";
const baseline = JSON.parse(readFileSync(`${dir}/development-preqa-baseline.json`, "utf8"));
try {
  assert(baseline.tables.every((t: string) => /^[a-z_][a-z0-9_]*$/.test(t)));
  const statements = baseline.tables.map((t: string) =>
    `SELECT '${t}' AS table_name,count(*) AS rows,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' ORDER BY md5(row_to_json(t)::text)),'')) AS fingerprint FROM "${t}" t`);
  const result = await pool.query(`${statements.join(" UNION ALL ")} ORDER BY table_name`);
  const before = new Map(baseline.fingerprints.trim().split("\n").slice(1).map((line: string) => [line.split(",")[0], line]));
  const fullSchemaFingerprints = "table_name,rows,fingerprint\n" + result.rows.map(r => `${r.table_name},${r.rows},${r.fingerprint}\n`).join("");
  const schemaAdditions: string[] = [];
  const addon = result.rows.find(r => r.table_name === "addons");
  if (addon && before.get("addons") !== `addons,${addon.rows},${addon.fingerprint}`) {
    // pricing_confirmed was added after the original baseline. Prove every original column still matches,
    // rather than ignoring a changed table or rewriting business data to make a hash pass.
    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='addons' AND column_name<>'pricing_confirmed' ORDER BY ordinal_position");
    assert(cols.rows.every(r => /^[a-z_][a-z0-9_]*$/.test(r.column_name)));
    const projection = cols.rows.map(r => `"${r.column_name}"`).join(",");
    const old = await pool.query(`SELECT count(*) AS rows,md5(coalesce(string_agg(md5(row_to_json(a)::text),'' ORDER BY md5(row_to_json(a)::text)),'')) AS fingerprint FROM (SELECT ${projection} FROM addons) a`);
    const added = await pool.query("SELECT count(*) AS non_default_rows FROM addons WHERE pricing_confirmed IS DISTINCT FROM false");
    if (before.get("addons") === `addons,${old.rows[0].rows},${old.rows[0].fingerprint}` && added.rows[0].non_default_rows === "0") {
      addon.fingerprint = old.rows[0].fingerprint;
      schemaAdditions.push("addons.pricing_confirmed: new false default; every original column matches baseline");
    }
  }
  const fingerprints = "table_name,rows,fingerprint\n" + result.rows.map(r => `${r.table_name},${r.rows},${r.fingerprint}\n`).join("");
  const changedTables = result.rows.filter(r => before.get(r.table_name) !== `${r.table_name},${r.rows},${r.fingerprint}`).map(r => r.table_name);
  const report = { capturedAt: new Date().toISOString(), tableCount: result.rows.length, status: changedTables.length ? "requires-review" : "passed", changedTables, schemaAdditions, fingerprints, fullSchemaFingerprints };
  writeFileSync(`${dir}/development-final-readback.json`, JSON.stringify(report, null, 2));
  assert.deepEqual(changedTables, [], "Existing Development rows differ from the pre-QA baseline.");
  console.info(`All ${result.rows.length} original Development table fingerprints match on original columns. ${schemaAdditions.join("; ")}`);
} finally { await pool.end(); }

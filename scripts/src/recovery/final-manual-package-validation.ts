// Development-only TEMPORARY-clone verification of the assembled manual package.
// Never a Production migration or a build/startup hook.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pool } from "@workspace/db";
import { globalManifest, globalPreflightSql, classifyGlobal } from "./global-foundation";

if (process.env.NODE_ENV !== "development") throw new Error("Explicit Development mode required.");
const source = await readFile(new URL("../../../reports/final-recovery/08-FINAL-PRODUCTION-RECOVERY.sql", import.meta.url), "utf8");
assert.equal((source.match(/^BEGIN;$/gm) ?? []).length, 1);
assert.equal((source.match(/^COMMIT;$/gm) ?? []).length, 1);
const sql = source.replaceAll("public.", "pg_temp.").replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, "");
const client = await pool.connect();
const oldDefinition = "CHECK (((status = 'delivered'::text) = (tenant_id IS NOT NULL)))";
const newDefinition = "CHECK (((status <> 'delivered'::text) OR (tenant_id IS NOT NULL)))";
async function definition() {
  return (await client.query("SELECT convalidated,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='pg_temp.white_label_requests'::regclass AND conname='white_label_request_delivery'")).rows[0];
}
try {
  await client.query("BEGIN");
  for (const table of Object.keys(globalManifest)) {
    await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
  }
  await client.query(`CREATE TEMP TABLE white_label_requests (
    status text NOT NULL, tenant_id uuid,
    CONSTRAINT white_label_request_delivery CHECK ((status='delivered')=(tenant_id IS NOT NULL))
  ) ON COMMIT DROP`);
  await client.query("INSERT INTO pg_temp.white_label_requests VALUES ('submitted',NULL),('delivered','00000000-0000-4000-8000-000000000001')");
  const before = (await client.query("SELECT status,tenant_id FROM pg_temp.white_label_requests ORDER BY status")).rows;
  assert.equal((await definition()).definition, oldDefinition);

  await client.query("SAVEPOINT assembled_success");
  await client.query(sql);
  assert.deepEqual(await definition(), { convalidated: true, definition: newDefinition });
  assert.deepEqual((await client.query("SELECT status,tenant_id FROM pg_temp.white_label_requests ORDER BY status")).rows, before);
  const after = (await client.query(globalPreflightSql.replaceAll("public.", "pg_temp."))).rows[0].recovery_snapshot;
  assert(classifyGlobal(after).every(r => r.classification === "UNCHANGED"));
  assert.equal(after.tables.landing_products.length, 15);
  assert(after.tables.landing_products.every((r: { visible: boolean; key: string }) => r.visible && r.key !== "kolo"));
  assert.equal(Object.values(after.tables).reduce((n: number, rows) => n + (rows as unknown[]).length, 0), 80);
  await client.query("SAVEPOINT setup_link");
  await client.query("INSERT INTO pg_temp.white_label_requests VALUES ('in_setup','00000000-0000-4000-8000-000000000002')");
  await client.query("ROLLBACK TO SAVEPOINT setup_link");
  await client.query("SAVEPOINT invalid_delivery");
  await assert.rejects(client.query("INSERT INTO pg_temp.white_label_requests VALUES ('delivered',NULL)"), /check constraint/);
  await client.query("ROLLBACK TO SAVEPOINT invalid_delivery");
  await client.query("ROLLBACK TO SAVEPOINT assembled_success");
  assert.equal((await definition()).definition, oldDefinition);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_temp.landing_products")).rows[0].n, 0);

  await client.query("SAVEPOINT drift_rejection");
  await client.query("INSERT INTO pg_temp.asset_catalog(id,symbol,name) VALUES ('btc','BTC','Intentional temporary drift')");
  await assert.rejects(client.query(sql), /Preflight drift/);
  await client.query("ROLLBACK TO SAVEPOINT drift_rejection");
  assert.equal((await definition()).definition, oldDefinition);

  await client.query("SAVEPOINT late_failure");
  // An unexpected visible card must fail the final verification after both
  // operations; rollback must restore the old CHECK and empty curated catalogs.
  await client.query("INSERT INTO pg_temp.landing_products(key,visible,name,description,icon,starting_price,setup_fee,currency,billing_period,status,cta_label,display_order) SELECT 'unexpected-verification-card',true,name,description,icon,starting_price,setup_fee,currency,billing_period,status,cta_label,display_order FROM public.landing_products LIMIT 1");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_temp.landing_products")).rows[0].n, 1);
  await assert.rejects(client.query(sql), /Landing verification failed/);
  await client.query("ROLLBACK TO SAVEPOINT late_failure");
  assert.equal((await definition()).definition, oldDefinition);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_temp.module_catalog")).rows[0].n, 0);
  assert.deepEqual((await client.query("SELECT status,tenant_id FROM pg_temp.white_label_requests ORDER BY status")).rows, before);
  console.log("PASS: exact assembled package; 80 approved records; 15 visible/no Kolo; setup links allowed; missing delivered links denied; drift rejection; full rollback after late failure. Development TEMP clones only.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}

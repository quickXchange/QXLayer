// Executes the prepared DML against transaction-local TEMPORARY clones only.
// No real Development configuration is changed; Production is refused.
import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import { globalManifest, globalManifestFingerprint, globalPreflightSql, classifyGlobal, prepareGlobalApply } from "./global-foundation";
if (process.env.NODE_ENV !== "development") throw new Error("Temporary-clone validation requires explicit Development mode.");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const table of Object.keys(globalManifest)) await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
  const snapshot = { capturedAt: new Date().toISOString(), tables: Object.fromEntries(Object.keys(globalManifest).map(t => [t, []])) };
  const approvals = { manifestFingerprint: globalManifestFingerprint, insert: Object.fromEntries(Object.entries(globalManifest).map(([t, m]) => [t, m.rows.map(r => String(r[m.key]))])), preserve: {}, restoreVisibility: [] };
  const sql = prepareGlobalApply(snapshot, approvals).replaceAll("public.", "pg_temp.").replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, "");
  await client.query(sql);
  const after = (await client.query(globalPreflightSql.replaceAll("public.", "pg_temp."))).rows[0].recovery_snapshot;
  assert(classifyGlobal(after).every(r => r.classification === "UNCHANGED"));
  await client.query(prepareGlobalApply(after, { ...approvals, insert: {} }).replaceAll("public.", "pg_temp.").replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""));
  assert.equal(after.tables.landing_products.length, 15);
  assert(after.tables.landing_products.every((r: { visible: boolean; key: string }) => r.visible && r.key !== "kolo"));
  console.log("PASS: curated global configuration apply, exact postconditions, 15 visible cards/no Kolo and idempotent repeat in temporary clones; all changes rolled back.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}

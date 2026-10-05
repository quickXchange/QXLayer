import assert from "node:assert/strict";
import { pool, applicationTableNames } from "@workspace/db";

// Explicit development maintenance only. No deployment/build/startup invocation.
if (process.env.NODE_ENV === "production") throw new Error("Development access migration refused in production.");
const identifier = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error("Unexpected SQL identifier.");
  return `"${name}"`;
};
const ownedTables = new Set(applicationTableNames());
const c = await pool.connect();
async function fingerprint(tables: string[]) {
  const result: Record<string, { count: string; hash: string }> = {};
  for (const table of tables) {
    const r = await c.query(`SELECT count(*)::text AS count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS hash
      FROM public.${identifier(table)} t`);
    result[table] = r.rows[0];
  }
  return result;
}
try {
  await c.query("BEGIN");
  await c.query("SET LOCAL lock_timeout='10s'");
  const tables = (await c.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  )).rows.map(t => t.tablename);
  // Hold writes while comparing every public table, including access assignments.
  if (tables.length) await c.query(`LOCK TABLE ${tables.map(t => `public.${identifier(t)}`).join(",")} IN SHARE ROW EXCLUSIVE MODE`);
  const before = await fingerprint(tables);
  const role = await c.query("SELECT oid FROM pg_roles WHERE rolname='private_label_runtime'");
  if (role.rowCount) {
    const owns = await c.query("SELECT 1 FROM pg_shdepend WHERE refobjid=$1 AND deptype='o' LIMIT 1", [role.rows[0].oid]);
    if (owns.rowCount) throw new Error("Legacy runtime role owns objects; refusing to delete or reassign them.");
  }
  for (const table of tables.filter(t => ownedTables.has(t))) {
    const policies = await c.query<{ policyname: string }>(
      "SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=$1", [table],
    );
    for (const p of policies.rows) await c.query(`DROP POLICY ${identifier(p.policyname)} ON public.${identifier(table)}`);
    await c.query(`ALTER TABLE public.${identifier(table)} NO FORCE ROW LEVEL SECURITY`);
    await c.query(`ALTER TABLE public.${identifier(table)} DISABLE ROW LEVEL SECURITY`);
  }
  if (role.rowCount) {
    // Retire only the legacy role's ACLs, never user/customer assignment records.
    await c.query("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM private_label_runtime");
    await c.query("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM private_label_runtime");
    await c.query("REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM private_label_runtime");
    await c.query("REVOKE ALL PRIVILEGES ON SCHEMA public FROM private_label_runtime");
    await c.query("DROP ROLE private_label_runtime");
  }
  assert.deepEqual(await fingerprint(tables), before, "Data changed; rolling back access migration.");
  await c.query("COMMIT");
  console.log(`PASS: retired database RLS/custom-role metadata; all ${tables.length} public-table row counts and content fingerprints unchanged.`);
} catch (error) {
  await c.query("ROLLBACK");
  throw error;
} finally {
  c.release();
  await pool.end();
}

/** Development operator command only. Never imported by an app/build/release hook. */
import { getTableConfig } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { pool } from "./index";
import * as schema from "./schema";
import { rowPolicies } from "./row-security";

if (!process.argv.includes("--development-only") || process.env.NODE_ENV !== "development")
  throw new Error("Explicit Development-only invocation is required.");
const tableArgs = process.argv.filter(arg => arg.startsWith("--table="));
if (tableArgs.length > 1) throw new Error("Only one Development table scope is permitted.");
const selectedTable = tableArgs[0]?.slice("--table=".length);
const tables = Object.values(schema).filter(t => is(t, PgTable))
  .filter(table => selectedTable === undefined || getTableConfig(table).name === selectedTable);
if (!tables.length) throw new Error("Unknown Development table scope.");
const c = await pool.connect();
try {
  const target = await c.query("SELECT current_database() AS db,current_user AS actor");
  if (target.rows[0].db !== "heliumdb" || target.rows[0].actor !== "postgres")
    throw new Error("Refusing an unrecognized target; this command is restricted to the current managed Development database.");
  await c.query("BEGIN");
  if (!selectedTable) await c.query("GRANT USAGE ON SCHEMA public TO pg_database_owner");
  for (const table of tables) {
    const config = getTableConfig(table);
    if (!/^[a-z_]+$/.test(config.name)) throw new Error("Invalid schema table name.");
    const name = `"${config.name}"`;
    const p = rowPolicies(config.name, config.columns.some(col => col.name === "tenant_id"));
    const before = await c.query(`SELECT count(*)::text AS n FROM public.${name}`);
    const old = await c.query("SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=$1", [config.name]);
    for (const row of old.rows) {
      if (!/^[a-z_]+$/.test(row.policyname)) throw new Error("Unexpected policy name.");
      await c.query(`DROP POLICY "${row.policyname}" ON public.${name}`);
    }
    await c.query(`CREATE POLICY qx_read ON public.${name} FOR SELECT USING (${p.read})`);
    await c.query(`CREATE POLICY qx_write ON public.${name} FOR ALL USING (${p.write}) WITH CHECK (${p.write})`);
    await c.query(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY`);
    await c.query(`ALTER TABLE public.${name} FORCE ROW LEVEL SECURITY`);
    await c.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON public.${name} TO pg_database_owner`);
    if (config.name === "pricing_rules") {
      await c.query(`REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.${name} FROM PUBLIC`);
      await c.query(`GRANT SELECT ON public.${name} TO PUBLIC`);
    }
    const after = await c.query(`SELECT count(*)::text AS n FROM public.${name}`);
    if (before.rows[0].n !== after.rows[0].n) throw new Error("Table count changed.");
  }
  // Serial request numbers use sequences; the restricted role cannot alter them.
  if (!selectedTable) await c.query("GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO pg_database_owner");
  await c.query("COMMIT");
  console.log("Development policies and built-in role privileges installed atomically; table counts unchanged.");
} catch (error) { await c.query("ROLLBACK"); throw error; }
finally { c.release(); await pool.end(); }

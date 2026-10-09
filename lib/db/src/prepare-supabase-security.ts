/**
 * Generates an EXTERNAL Supabase migration package; no database connections,
 * credential reads, SQL execution, publishing, or runtime changes.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { rowPolicies } from "./row-security";

const root = resolve(import.meta.dirname, "../../..");
const out = resolve(root, "generated-artifacts/supabase");
const source = JSON.parse(await readFile(resolve(root, "reports/supabase-migration/source-inventory.json"), "utf8"));
const tables = Object.values(schema).filter(t => is(t, PgTable)).map(t => getTableConfig(t))
  .sort((a, b) => a.name.localeCompare(b.name));
const identifier = (name: string) => {
  if (!/^[a-z_]+$/.test(name)) throw Error("Invalid migration identifier");
  return `"${name}"`;
};
const names = new Set(tables.map(t => t.name));
for (const name of source.inventory.tables) {
  if (!names.has(name)) throw Error(`Production table ${name} has no target definition`);
  const target = tables.find(t => t.name === name)!;
  for (const c of source.inventory.columns.filter((c: any) => c.table === name))
    if (!target.columns.some(t => t.name === c.column)) throw Error(`Target loses ${name}.${c.column}`);
}

const statements = [
  "-- Supabase-only target preparation. NOT a Replit Production migration.",
  "-- Plan approval and a pinned empty target project are required before execution.",
  "-- This does not transfer data, set passwords, enable logins, or change DNS.",
  "BEGIN;",
  "SET LOCAL lock_timeout='5s';",
  `DO $guard$ BEGIN
    IF current_database()<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_admin')
      OR coalesce(current_setting('qxlayer.external_migration_authorized',true),'')<>'yes' THEN
      RAISE EXCEPTION 'Refusing an unapproved or non-Supabase target';
    END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('qxlayer_runtime','qxlayer_app')) THEN
      RAISE EXCEPTION 'Bootstrap requires fresh QXLayer roles; existing roles require a versioned upgrade';
    END IF;
  END $guard$;`,
  "CREATE ROLE qxlayer_runtime NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;",
  "CREATE ROLE qxlayer_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;",
  "GRANT qxlayer_runtime TO qxlayer_app WITH INHERIT FALSE;",
  "GRANT USAGE ON SCHEMA public TO qxlayer_runtime;",
];
const manifest = tables.map(t => {
  const p = rowPolicies(t.name, t.columns.some(c => c.name === "tenant_id"));
  const target = `public.${identifier(t.name)}`;
  statements.push(
    `REVOKE ALL ON TABLE ${target} FROM PUBLIC;`,
    `DO $acl$ DECLARE r text; BEGIN
      FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
        EXECUTE format('REVOKE ALL ON TABLE ${target} FROM %I',r);
      END LOOP;
    END $acl$;`,
    `DROP POLICY IF EXISTS qx_read ON ${target};`,
    `DROP POLICY IF EXISTS qx_write ON ${target};`,
    `CREATE POLICY qx_read ON ${target} FOR SELECT TO qxlayer_runtime USING (${p.read});`,
    `CREATE POLICY qx_write ON ${target} FOR ALL TO qxlayer_runtime USING (${p.write}) WITH CHECK (${p.write});`,
    `ALTER TABLE ${target} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${target} FORCE ROW LEVEL SECURITY;`,
    `GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE ${target} TO qxlayer_runtime;`,
  );
  return { name: t.name, columns: t.columns.map(c => c.name), policies: p };
});
const sequences = new Set<string>(source.inventory.sequences ?? []);
for (const table of tables) for (const c of table.columns)
  if (/serial/i.test(c.getSQLType())) sequences.add(`${table.name}_${c.name}_seq`);
for (const sequence of [...sequences].sort()) {
  statements.push(`GRANT USAGE,SELECT ON SEQUENCE public.${identifier(sequence)} TO qxlayer_runtime;`);
}
statements.push("COMMIT;");
const sql = statements.join("\n\n") + "\n";
await mkdir(out, { recursive: true });
await writeFile(resolve(out, "security-bootstrap.sql"), sql);
await writeFile(resolve(root, "reports/supabase-migration/security-manifest.json"), JSON.stringify({
  scope: "External Supabase ONLY; generation is not target execution or migration acceptance.",
  sourceTables: source.inventory.tables, targetTables: manifest, sequences: [...sequences].sort(),
  runtimeRole: "qxlayer_runtime", loginRole: "qxlayer_app",
  sqlSha256: createHash("sha256").update(sql).digest("hex"),
  migrationApplied: false, targetVerified: false, cutoverAuthorized: false,
}, null, 2));
console.log(`Generated ${manifest.length} target definitions / ${manifest.length * 2} complete policies; all Production tables/columns covered. No SQL executed.`);

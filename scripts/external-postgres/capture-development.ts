/**
 * Explicit read-only Development schema capture, never a build/startup hook.
 * No rows, passwords, connection strings or Production reads are exported.
 */
import { pool, applicationTableNames } from "../../lib/db/src/index";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV !== "development" || !process.argv.includes("--development-only") ||
    process.env.QXLAYER_DATABASE_PROVIDER === "supabase")
  throw new Error("Explicit Replit Development capture required.");
try {
  const identity = await pool.query("SELECT current_database() AS db,current_user AS actor");
  if (identity.rows[0].db !== "heliumdb" || identity.rows[0].actor !== "postgres")
    throw new Error("Capture is restricted to the recognized Development database.");
  const names = applicationTableNames().sort();
  const metadata = await pool.query(`SELECT c.relname AS name,c.relrowsecurity AS enabled,
    c.relforcerowsecurity AS forced,
    (SELECT jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,
      'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))
      ORDER BY p.polname) FROM pg_policy p WHERE p.polrelid=c.oid) AS policies
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`);
  if (JSON.stringify(metadata.rows.map(r => r.name)) !== JSON.stringify(names) ||
      metadata.rows.some(r => !r.enabled || !r.forced || r.policies.length !== 2 ||
        r.policies.some((p: { using: string; check: string; command: string }) => !p.using || (p.command === "*" && !p.check))))
    throw new Error("Development schema/policies are incomplete or outside the application allowlist.");
  const dump = spawnSync("pg_dump", ["--schema-only", "--no-owner", "--no-acl", "--schema=public",
    "--dbname", process.env.DATABASE_URL!], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (dump.status !== 0) throw new Error("Development schema-only capture failed; no credentials are logged.");
  const dir = fileURLToPath(new URL("../../deploy/migrations/", import.meta.url));
  try { await access(`${dir}/manifest.json`); throw new Error("The initial migration is immutable. Add a reviewed new version instead."); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await mkdir(dir, { recursive: true });
  const guard = `-- External Supabase schema only. No Production data. Execute through the pinned runner.\n
DO $guard$ BEGIN
 IF current_database()<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_admin')
 OR coalesce(current_setting('qxlayer.external_migration_authorized',true),'')<>'yes'
 THEN RAISE EXCEPTION 'Refusing an unapproved/non-Supabase target'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')) THEN
 RAISE EXCEPTION 'Bootstrap requires an empty application schema'; END IF;
END $guard$;\n`;
  const schema = guard + dump.stdout.split("\n").filter(line => !line.startsWith("\\")).join("\n")
    .replace(/^SET (?:statement_timeout|lock_timeout|idle_in_transaction_session_timeout|transaction_timeout) = .*;\n/gm, "")
    .replace("CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS public;");
  let security = `-- Separate restricted external login/transaction roles; no passwords and no login activation.
CREATE ROLE qxlayer_runtime NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE qxlayer_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT qxlayer_runtime TO qxlayer_app WITH INHERIT FALSE;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO qxlayer_runtime;\n`;
  for (const name of names) {
    security += `REVOKE ALL ON TABLE public."${name}" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
 EXECUTE format('REVOKE ALL ON TABLE public."${name}" FROM %I',r); END LOOP;
END $acl$;
ALTER TABLE public."${name}" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."${name}" FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public."${name}" TO qxlayer_runtime;\n`;
  }
  const sequences = await pool.query("SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename");
  for (const row of sequences.rows) {
    if (!/^[a-z0-9_]+$/.test(row.sequencename)) throw new Error("Unexpected sequence name.");
    security += `REVOKE ALL ON SEQUENCE public."${row.sequencename}" FROM PUBLIC;
GRANT USAGE,SELECT ON SEQUENCE public."${row.sequencename}" TO qxlayer_runtime;\n`;
  }
  const files = [{ file: "0001_application_schema.sql", sql: schema }, { file: "0002_runtime_security.sql", sql: security }];
  for (const { file, sql } of files) await writeFile(`${dir}/${file}`, sql);
  await writeFile(`${dir}/rls-reference.json`, JSON.stringify({ tables: metadata.rows, sequences: sequences.rows.map(r => r.sequencename) }, null, 2) + "\n");
  await writeFile(`${dir}/manifest.json`, JSON.stringify(files.map(({ file, sql }) => ({ file, sha256: createHash("sha256").update(sql).digest("hex") })), null, 2) + "\n");
  console.info(`Captured ${names.length} Development table definitions and complete RLS, schema only.`);
} finally { await pool.end(); }

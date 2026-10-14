import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool } from "@workspace/db";

const url = new URL(process.env.DATABASE_URL ?? "");
if (process.env.NODE_ENV !== "development" || !process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev") ||
    (process.env.QXLAYER_DATABASE_PROVIDER && process.env.QXLAYER_DATABASE_PROVIDER !== "replit") ||
    url.hostname !== process.env.PGHOST || /supabase\.(co|com)$/.test(url.hostname))
  throw new Error("This command is restricted to the existing Replit Development business database.");
const path = new URL("../../../../generated-artifacts/supabase-development-baseline.json", import.meta.url);
async function fingerprints() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    const result: Record<string, { count: number; digest: string }> = {};
    for (const { tablename } of tables.rows) {
      const table = `"${String(tablename).replaceAll('"', '""')}"`;
      const rows = await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${table} t ORDER BY to_jsonb(t)::text`);
      result[tablename] = { count: rows.rowCount ?? 0,
        digest: createHash("sha256").update(rows.rows.map(r => r.row).join("\n")).digest("hex") };
    }
    await client.query("COMMIT");
    return result;
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}
try {
  if (process.argv[2] === "prepare") {
    // Never replace an existing preservation baseline on a retry.
    try { await readFile(path); throw new Error("A baseline already exists; verify it rather than overwrite it."); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    const baseline = await fingerprints();
    const admins = await pool.query("SELECT count(*)::int AS count FROM public.platform_admins WHERE active=true");
    if (admins.rows[0].count !== 1) throw new Error("Expected the existing single active Super Admin; operator review required.");
    await mkdir(new URL(".", path), { recursive: true });
    await writeFile(path, JSON.stringify(baseline), { flag: "wx", mode: 0o600 });
    await pool.query(await readFile(new URL("../../../../deploy/migrations/005-supabase-auth-replit-development.sql", import.meta.url), "utf8"));
    console.log(JSON.stringify({ prepared: true, preservedPublicTables: Object.keys(baseline).length, existingActiveSuperAdmins: 1 }));
  } else if (process.argv[2] === "recovery-prepare") {
    const baseline = JSON.parse(await readFile(path, "utf8"));
    if (JSON.stringify(await fingerprints()) !== JSON.stringify(baseline))
      throw new Error("Business preservation readback failed; recovery schema changes are blocked.");
    await pool.query(await readFile(new URL("../../../../deploy/migrations/006-development-mfa-recovery.sql", import.meta.url), "utf8"));
    console.log(JSON.stringify({ developmentRecoverySchemaPrepared: true, preservedPublicTables: Object.keys(baseline).length }));
  } else if (process.argv[2] === "verify") {
    const baseline = JSON.parse(await readFile(path, "utf8"));
    const after = await fingerprints();
    const same = JSON.stringify(after) === JSON.stringify(baseline);
    console.log(JSON.stringify({ publicDataUnchanged: same, tables: Object.keys(after).length }));
    if (!same) process.exitCode = 1;
  } else throw new Error("Use prepare, recovery-prepare or verify.");
} finally { await pool.end(); }

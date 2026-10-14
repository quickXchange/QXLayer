import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import { developmentSupabaseAuth, supabaseAuthConfiguration } from "../modules/supabase-auth/config";
import { preservesSessionsWithOneOwnerAddition } from "./preserved-session-addition";
if (process.env.NODE_ENV !== "development" || !developmentSupabaseAuth() ||
    new URL(process.env.DATABASE_URL ?? "").hostname !== process.env.PGHOST)
  throw Error("Existing isolated Development database required.");
const cfg = supabaseAuthConfiguration();
const path = new URL(process.argv.includes("--login-email")
  ? "../../../../.local/development-email-login-preservation.json"
  : "../../../../.local/auth-retirement-preservation.json", import.meta.url);
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function snapshot() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const owner = await client.query(`SELECT a.clerk_user_id,l.subject,l.business_id,l.proof_subject
      FROM public.platform_admins a LEFT JOIN vynox_supabase_auth.identity_links l
      ON l.business_id=a.clerk_user_id WHERE a.active=true`);
    if (owner.rowCount !== 1 || !owner.rows[0].subject ||
        owner.rows[0].business_id !== owner.rows[0].proof_subject)
      throw Error("Original linked Owner continuity failed.");
    const tables = await client.query(`SELECT schemaname,tablename FROM pg_tables
      WHERE schemaname NOT IN('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_%'
      ORDER BY schemaname,tablename`);
    const data: Record<string, { count: number; hash: string }> = {};
    let sessions: { digest: string; subject: string }[] = [];
    for (const t of tables.rows) {
      const key = `${t.schemaname}.${t.tablename}`;
      if (key === "vynox_supabase_auth.rate_limits") continue;
      const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
      // Refreshing an existing session legitimately rotates its encrypted envelope.
      const query = key === "vynox_supabase_auth.sessions"
        ? "SELECT digest,subject FROM vynox_supabase_auth.sessions ORDER BY digest"
        : `SELECT to_jsonb(t)::text AS row FROM ${quote(t.schemaname)}.${quote(t.tablename)} t ORDER BY to_jsonb(t)::text`;
      const result = await client.query(query);
      if (key === "vynox_supabase_auth.sessions") sessions = result.rows;
      data[key] = { count: result.rowCount ?? 0, hash: hash(result.rows) };
    }
    await client.query("COMMIT");
    const r = await fetch(`${cfg.providerOrigin}/auth/v1/admin/users/${owner.rows[0].subject}`, {
      headers: { apikey: cfg.apiKey }, redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error("Read-only Owner provider check failed.");
    const u = await r.json() as { email_confirmed_at?: string; factors?: { id: string; status: string; factor_type: string }[] };
    const factors = u.factors?.filter(f => f.status === "verified" && f.factor_type === "totp");
    if (!u.email_confirmed_at || !factors?.length) throw Error("Owner verified email/TOTP missing.");
    return { snapshot: { data, ownerBinding: hash(owner.rows), ownerFactors: hash(factors.map(f => f.id).sort()) },
      sessions, ownerSubject: owner.rows[0].subject };
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}
try {
   const { snapshot: current, sessions, ownerSubject } = await snapshot();
  if (process.argv[2] === "prepare") {
    await mkdir(new URL(".", path), { recursive: true });
    await writeFile(path, JSON.stringify(current), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ preservationBaselineCaptured: true, tables: Object.keys(current.data).length,
      originalLinkedOwnerVerified: true, ownerTotpVerified: true }));
  } else if (process.argv[2] === "verify") {
    const previous = JSON.parse(await readFile(path, "utf8"));
     let ownerSessionAdditions = 0;
     const sessionTable = "vynox_supabase_auth.sessions";
     if (process.argv.includes("--allow-one-new-owner-session") &&
         preservesSessionsWithOneOwnerAddition(previous.data[sessionTable], sessions, ownerSubject)) {
       // Only the comparison is normalized; database rows and baseline are untouched.
       current.data[sessionTable] = previous.data[sessionTable];
       ownerSessionAdditions = 1;
     }
    if (JSON.stringify(previous) !== JSON.stringify(current)) {
      const keys = new Set([...Object.keys(previous.data), ...Object.keys(current.data)]);
      const differences = [...keys].filter(k => JSON.stringify(previous.data[k]) !== JSON.stringify(current.data[k]));
      throw Error(JSON.stringify({ preservationDiff: differences.map(table => ({
        table, beforeCount: previous.data[table]?.count, afterCount: current.data[table]?.count,
      })), originalOwnerBindingUnchanged: previous.ownerBinding === current.ownerBinding,
        originalOwnerFactorsUnchanged: previous.ownerFactors === current.ownerFactors }));
    }
    console.log(JSON.stringify({ businessAndRetiredAuthTablesUnchanged: true,
       identityLinksAndExistingSessionsUnchanged: true, originalOwnerBindingAndTotpUnchanged: true,
       ownerSessionAdditions }));
  } else throw Error("Use prepare or verify.");
} finally { await pool.end(); }

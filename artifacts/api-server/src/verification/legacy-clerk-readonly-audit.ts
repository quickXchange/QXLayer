import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { pool } from "@workspace/db";
import { developmentSupabaseAuth } from "../modules/supabase-auth/config";

if (process.env.NODE_ENV !== "development" || !developmentSupabaseAuth() ||
    !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    new URL(process.env.DATABASE_URL ?? "").hostname !== process.env.PGHOST)
  throw Error("Existing Development database and test Clerk directory required.");
type User = { id: string; banned?: boolean; locked?: boolean; password_enabled?: boolean;
  totp_enabled?: boolean; external_accounts?: unknown[];
  email_addresses?: { verification?: { status?: string } }[] };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function get(path: string) {
  const r = await fetch(`https://api.clerk.com/v1${path}`, { method: "GET", redirect: "error",
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error(`Read-only legacy directory HTTP ${r.status}.`);
  return r.json();
}
async function directory(): Promise<User[]> {
  const users: User[] = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const batch = await get(`/users?limit=100&offset=${offset}`) as User[];
    if (!Array.isArray(batch)) throw Error("Unexpected directory response.");
    users.push(...batch);
    if (batch.length < 100) return users.sort((a, b) => a.id.localeCompare(b.id));
  }
  throw Error("Directory exceeds bounded audit limit.");
}
const before = await directory();
const ids = before.map(u => u.id);
if (new Set(ids).size !== ids.length) throw Error("Duplicate directory identity.");
const client = await pool.connect();
try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const links = (await client.query("SELECT subject,business_id,proof_subject FROM vynox_supabase_auth.identity_links")).rows;
  const admins = (await client.query("SELECT clerk_user_id,active FROM public.platform_admins")).rows;
  const memberships = (await client.query("SELECT clerk_user_id,role,permissions FROM public.tenant_memberships")).rows;
  const columns = (await client.query(`SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name IN('clerk_user_id','customer_user_id','user_id','actor_id')
    AND data_type IN('text','character varying') ORDER BY table_name,column_name`)).rows;
  const refs = new Map<string, Record<string, number>>();
  const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
  for (const column of columns) {
    const key = `${column.table_name}.${column.column_name}`;
    const result = await client.query(`SELECT ${quote(column.column_name)} AS id,count(*)::int AS count
      FROM public.${quote(column.table_name)} WHERE ${quote(column.column_name)}=ANY($1::text[])
      GROUP BY ${quote(column.column_name)}`, [ids]);
    for (const row of result.rows) {
      const record = refs.get(row.id) ?? {}; record[key] = row.count; refs.set(row.id, record);
    }
  }
  const accounts = before.map((user, index) => ({
    alias: `legacy-${String(index + 1).padStart(3, "0")}`,
    proofLinked: links.some(l => l.business_id === user.id && l.proof_subject === user.id),
    activeSuperAdmin: admins.some(a => a.clerk_user_id === user.id && a.active),
    assignedRoles: memberships.filter(m => m.clerk_user_id === user.id).map(m => m.role).sort(),
    businessReferences: refs.get(user.id) ?? {},
    verifiedEmail: !!user.email_addresses?.some(e => e.verification?.status === "verified"),
    passwordEnabled: !!user.password_enabled, totpEnabled: !!user.totp_enabled,
    externalProviderCount: user.external_accounts?.length ?? 0, banned: !!user.banned, locked: !!user.locked,
  }));
  await client.query("COMMIT");
  const after = await directory();
  if (hash(before) !== hash(after)) throw Error("Legacy directory changed during audit; no continuity sign-off.");
  const count = await get("/users/count") as { total_count: number };
  if (count.total_count !== accounts.length) throw Error("Provider count does not match full pagination.");
  const summary = { directoryAccounts: accounts.length, directoryUnchangedDuringAudit: true,
    proofLinked: accounts.filter(a => a.proofLinked).length,
    unlinked: accounts.filter(a => !a.proofLinked).length,
    activeSuperAdmins: accounts.filter(a => a.activeSuperAdmin).length,
    unlinkedWithBusinessReferences: accounts.filter(a => !a.proofLinked && Object.keys(a.businessReferences).length).length,
    unlinkedWithTenantRoles: accounts.filter(a => !a.proofLinked && a.assignedRoles.length).length,
    existingAccountAndRoleWrites: 0, emailBasedOwnershipMatching: false,
    fingerprint: hash(before) };
  const output = new URL("../../../../generated-artifacts/auth-security/legacy-audit.json", import.meta.url);
  await mkdir(new URL(".", output), { recursive: true });
  await writeFile(output, JSON.stringify({ summary, accounts }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(summary));
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await pool.end(); }

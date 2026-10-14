import { readFile, unlink } from "node:fs/promises";
import { pool } from "@workspace/db";
import { developmentSupabaseAuth, supabaseAuthConfiguration } from "../modules/supabase-auth/config";

if (process.env.NODE_ENV !== "development" || !developmentSupabaseAuth() ||
    !["", "replit"].includes(process.env.QXLAYER_DATABASE_PROVIDER ?? "") ||
    new URL(process.env.DATABASE_URL ?? "").hostname !== process.env.PGHOST)
  throw Error("Existing isolated Development business database required.");
const cfg = supabaseAuthConfiguration();
const path = new URL("../../../../.local/development-mail-qa-scope.json", import.meta.url);
type Scope = { project: string; subject: string; marker: string; email: string; recoveryRequestedAt: string };
type ProviderUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  user_metadata?: { development_mail_qa?: string };
  factors?: { id: string; status: string; factor_type: string }[];
};
async function provider(route: string, method = "GET") {
  const r = await fetch(`${cfg.providerOrigin}/auth/v1/admin/users/${route}`, {
    method, headers: { apikey: cfg.apiKey }, redirect: "error", signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw Error(`Scoped Development provider request failed (${r.status}).`);
  return r.status === 204 ? {} : await r.json() as ProviderUser;
}
async function ownerSnapshot() {
  const owners = await pool.query(`SELECT a.clerk_user_id, l.subject, l.business_id, l.proof_subject
    FROM public.platform_admins a LEFT JOIN vynox_supabase_auth.identity_links l
    ON l.business_id=a.clerk_user_id WHERE a.active=true ORDER BY a.clerk_user_id`);
  if (owners.rowCount !== 1 || !owners.rows[0].subject ||
      owners.rows[0].proof_subject !== owners.rows[0].business_id)
    throw Error("Existing Owner identity continuity check failed.");
  const subject = owners.rows[0].subject;
  const sessions = await pool.query(`SELECT digest, expires_at FROM vynox_supabase_auth.sessions
    WHERE subject=$1 ORDER BY digest`, [subject]);
  const user = await provider(subject);
  const factors = (user.factors ?? []).filter((f: { status: string }) => f.status === "verified");
  if (!user.email_confirmed_at || !factors.length) throw Error("Owner verified email/MFA check failed.");
  return JSON.stringify({ owners: owners.rows, sessions: sessions.rows, factors });
}
try {
  const scope: Scope = JSON.parse(await readFile(path, "utf8"));
  if (scope.project !== "nktstksmfpcsjnjbeqsk" ||
      !/^[a-f0-9-]{36}$/.test(scope.subject ?? "") || !scope.marker || !scope.recoveryRequestedAt)
    throw Error("Complete exact disposable mail scope required.");
  const before = await ownerSnapshot();
  const user = await provider(scope.subject);
  if (user.id !== scope.subject || user.email !== scope.email ||
      user.user_metadata?.development_mail_qa !== scope.marker ||
      !user.email_confirmed_at || !user.last_sign_in_at ||
      Date.parse(user.last_sign_in_at) < Date.parse(scope.recoveryRequestedAt))
    throw Error("Disposable native verification/recovery/sign-in readback failed.");
  const business = `supabase:${scope.subject}`;
  const used = await pool.query(`SELECT
    EXISTS(SELECT 1 FROM public.platform_admins WHERE clerk_user_id=$1) OR
    EXISTS(SELECT 1 FROM public.tenant_memberships WHERE clerk_user_id=$1) OR
    EXISTS(SELECT 1 FROM public.white_label_requests WHERE customer_user_id=$1) OR
    EXISTS(SELECT 1 FROM vynox_supabase_auth.identity_links WHERE subject=$2) AS used`,
  [business, scope.subject]);
  if (used.rows[0].used) throw Error("Fixture has business records or an identity link; cleanup blocked.");
  const sessions = await pool.query(`SELECT count(*)::int AS count
    FROM vynox_supabase_auth.sessions WHERE subject=$1 AND expires_at>now()`, [scope.subject]);
  if (sessions.rows[0].count < 1) throw Error("Native app sign-in session was not found.");
  await provider(scope.subject, "DELETE");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of ["sessions", "recovery_codes", "recovery_events"])
      await client.query(`DELETE FROM vynox_supabase_auth.${table} WHERE subject=$1`, [scope.subject]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
  const absent = await fetch(`${cfg.providerOrigin}/auth/v1/admin/users/${scope.subject}`, {
    headers: { apikey: cfg.apiKey }, redirect: "error", signal: AbortSignal.timeout(30000),
  });
  if (absent.status !== 404) throw Error("Disposable provider deletion readback failed.");
  const remaining = await pool.query(`SELECT
    (SELECT count(*) FROM vynox_supabase_auth.sessions WHERE subject=$1) +
    (SELECT count(*) FROM vynox_supabase_auth.recovery_codes WHERE subject=$1) +
    (SELECT count(*) FROM vynox_supabase_auth.recovery_events WHERE subject=$1) AS count`, [scope.subject]);
  if (Number(remaining.rows[0].count) || before !== await ownerSnapshot())
    throw Error("Post-cleanup preservation check failed; manifest retained.");
  await unlink(path);
  console.log(JSON.stringify({ nativeEmailVerificationRecorded: true, postRecoverySignInRecorded: true,
    nativeAppSessionRecorded: true, disposableProviderIdentityRemoved: true,
    disposableAppSessionsAndRecoveryDataRemoved: true, ownerIdentityMfaAndSessionsUnchanged: true }));
} finally { await pool.end(); }

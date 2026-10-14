// Isolated native-provider verification, never a role grant or Owner sign-in.
// SMTP acceptance and seeded native-token verification do NOT prove inbox receipt.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { pool } from "@workspace/db";
import { supabaseAuthConfiguration, developmentSupabaseAuth } from "../modules/supabase-auth/config";
import { authRequest, type SupabaseTokens } from "../modules/supabase-auth/provider";
import { sendEmailLogin, verifyEmailLogin, EMAIL_LOGIN_COOKIE } from "../modules/supabase-auth/development-email-login";
import { readSession, SESSION_COOKIE } from "../modules/supabase-auth/session";
import { performAction } from "../modules/supabase-auth/actions";
import type { Request, Response } from "express";

if (process.env.NODE_ENV !== "development" || !developmentSupabaseAuth() ||
    process.env.QXLAYER_DEVELOPMENT_EMAIL_NATIVE_QA_APPROVED !== "true")
  throw Error("Explicit isolated Development native QA approval required.");
const cfg = supabaseAuthConfiguration();
const marker = randomUUID();
const manifest = new URL("../../../../.local/development-email-native-qa.json", import.meta.url);
let subject: string | undefined;
let stage = "prepare";
let scopeCreated = false;
let creationAttempted = false;
const realQuery = pool.query.bind(pool);
interface QaNativeUser { id: string; email: string; user_metadata?: { development_email_native_qa?: string } }
async function admin<T = unknown>(path: string, body?: unknown, method = body ? "POST" : "GET"): Promise<T> {
  const r = await fetch(`${cfg.providerOrigin}/auth/v1/admin${path}`, {
    method, redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw Error(`Disposable native operation refused (${r.status}).`);
  return (r.status === 204 ? {} : await r.json()) as T;
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret) bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map(v => parseInt(v, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, "0");
}
try {
  // Derive a unique address within the user's existing verified Gmail mailbox.
  // The original subject is read only. Only the NEW marked subject is mutated.
  const owners = await realQuery(`SELECT l.subject FROM public.platform_admins a
    JOIN vynox_supabase_auth.identity_links l ON l.business_id=a.clerk_user_id WHERE a.active=true`);
  assert.equal(owners.rowCount, 1);
  const owner = await admin<QaNativeUser>(`/users/${owners.rows[0].subject}`);
  assert.match(owner.email, /^[^@\s]+@gmail\.com$/i);
  const recipient = `${owner.email.split("@")[0].split("+")[0]}+vynox-native-qa-${marker.slice(0, 8)}@gmail.com`;
  const password = `Aa1${randomBytes(24).toString("base64url")}`;
  await writeFile(manifest, JSON.stringify({ marker, project: "nktstksmfpcsjnjbeqsk" }), { flag: "wx", mode: 0o600 });
  scopeCreated = true;
  stage = "create-disposable";
  creationAttempted = true;
  const u = await admin<QaNativeUser>("/users", { email: recipient, password, email_confirm: true,
    user_metadata: { development_email_native_qa: marker } });
  subject = u.id;
  assert(subject && subject !== owners.rows[0].subject);
  await writeFile(manifest, JSON.stringify({ marker, subject, project: "nktstksmfpcsjnjbeqsk" }), { mode: 0o600 });
  stage = "enroll-disposable";
  const login = await authRequest<SupabaseTokens>("/token?grant_type=password",
    { method: "POST", body: { email: recipient, password } });
  const factor = await authRequest<{ id: string; totp: { secret: string } }>("/factors",
    { method: "POST", accessToken: login.access_token, body: { factor_type: "totp", friendly_name: marker } });
  const challenge = await authRequest<{ id: string }>(`/factors/${factor.id}/challenge`,
    { method: "POST", accessToken: login.access_token });
  const enrolled = await authRequest<SupabaseTokens>(`/factors/${factor.id}/verify`,
    { method: "POST", accessToken: login.access_token, body: { challenge_id: challenge.id, code: totp(factor.totp.secret) } });
  await authRequest("/logout?scope=local", { method: "POST", accessToken: enrolled.access_token });
  // Simulate authorization only inside THIS process for THIS new subject.
  // No platform_admins or identity_links records are created or changed.
  mock.method(pool, "query", async (...args: unknown[]) => {
    const [sql, values] = args as [string, unknown[]];
    if (sql.includes("SELECT DISTINCT COALESCE")) return { rowCount: 1, rows: [{ subject }] };
    if (sql.includes("SELECT EXISTS(SELECT 1 FROM public.platform_admins") && values[0] === `supabase:${subject}`)
      return { rowCount: 1, rows: [{ eligible: true }] };
    return Reflect.apply(realQuery, pool, args);
  });
  const jar = new Map<string, string>();
  const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" }, get: () => cfg.origin } as unknown as Request;
  Object.defineProperty(req.headers, "cookie", { get: () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ") });
  const res = { cookie: (k: string, v: string) => jar.set(k, v), clearCookie: (k: string) => jar.delete(k) } as unknown as Response;
  stage = "native-mail-request";
  await sendEmailLogin(recipient, req, res);
  assert(jar.has(EMAIL_LOGIN_COOKIE));
  // Seed a known native OTP without printing/storing it. This can replace the
  // sent token: do not represent this as testing the code in the actual email.
  stage = "seed-native-otp";
  const link = await admin<{ email_otp?: string; properties?: { email_otp?: string } }>("/generate_link",
    { type: "magiclink", email: recipient });
  const code = link.email_otp ?? link.properties?.email_otp;
  assert(code);
  assert.match(code, /^[0-9]{6}$/);
  stage = "app-native-otp-verification";
  await verifyEmailLogin(recipient, code, req, res);
  assert(jar.has(SESSION_COOKIE) && !jar.has(EMAIL_LOGIN_COOKIE));
  const pending = await readSession(req);
  assert(pending?.payload.emailPrimary && !pending.aal2);
  stage = "mandatory-native-totp";
  await new Promise(resolve => setTimeout(resolve, 31000 - Date.now() % 30000));
  await performAction({ action: "mfa-verify", code: totp(factor.totp.secret) }, req, res);
  const verified = await readSession(req);
  assert(verified?.aal2 && verified.payload.emailPrimaryTotpVerified);
  console.log(JSON.stringify({ nativeOtpSendAccepted: true, seededNativeOtpAppVerificationPassed: true,
    nativeTotpAfterEmailLoginPassed: true, authorizationSimulatedWithoutRoleWrites: true,
    deliveredGmailCodeAndInboxReceiptVerified: false }));
} catch {
  console.error(JSON.stringify({ developmentNativeQaFailedAt: stage }));
  process.exitCode = 1;
} finally {
  mock.restoreAll();
  if (scopeCreated && creationAttempted && !subject) {
    const roster = await admin<{ users: QaNativeUser[] }>("/users?page=1&per_page=100");
    assert(roster.users.length < 100, "Ambiguous cleanup scope; manifest retained.");
    const matches = roster.users.filter(u => u.user_metadata?.development_email_native_qa === marker);
    assert(matches.length <= 1, "Ambiguous cleanup scope; manifest retained.");
    subject = matches[0]?.id;
    if (subject) await writeFile(manifest, JSON.stringify({ marker, subject,
      project: "nktstksmfpcsjnjbeqsk" }), { mode: 0o600 });
  }
  if (subject) {
    const u = await admin<QaNativeUser>(`/users/${subject}`);
    assert.equal(u.user_metadata?.development_email_native_qa, marker);
    const used = await realQuery(`SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE clerk_user_id=$1)
      OR EXISTS(SELECT 1 FROM vynox_supabase_auth.identity_links WHERE subject=$2) AS used`, [`supabase:${subject}`, subject]);
    assert.equal(used.rows[0].used, false);
    await admin(`/users/${subject}`, undefined, "DELETE");
    await realQuery("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [subject]);
  }
  if (scopeCreated) await unlink(manifest);
  await pool.end();
}

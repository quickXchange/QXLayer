import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { pool } from "@workspace/db";
import { createOwnedAuth, authDatabase, ownedBusinessId } from "../modules/owned-auth/service";
import * as schema from "../modules/owned-auth/schema";

if (process.env.NODE_ENV !== "development" || process.env.QXLAYER_DATABASE_PROVIDER === "supabase" ||
    process.env.QXLAYER_OWNED_AUTH_QA_APPROVED !== "true") throw Error("Disposable Development QA only.");
const origin = "https://qxlayer-auth-qa.invalid", inbox: string[] = [];
const auth = createOwnedAuth(origin, randomUUID() + randomUUID(), async (_to, _subject, url) => { inbox.push(url); });
const email = `owned-auth-${randomUUID()}@example.com`;
let password = `QA-only-${randomUUID()}`;
const cookies = new Map<string, string>(); let userId: string | undefined;
async function request(path: string, body?: object, crossOrigin = false) {
  const r = await auth.handler(new Request(`${origin}/api/auth${path}`, {
    method: body ? "POST" : "GET", headers: {
      Origin: crossOrigin ? "https://untrusted.invalid" : origin, "Content-Type": "application/json",
      Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join(";"),
    }, ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  for (const value of r.headers.getSetCookie()) {
    const first = value.split(";")[0]!, i = first.indexOf("=");
    const k = first.slice(0,i), v = first.slice(i+1);
    if (!v || /Max-Age=0/i.test(value)) cookies.delete(k); else cookies.set(k,v);
  }
  const text = await r.text(); let data: Record<string, any> = {};
  try { data = JSON.parse(text); } catch { /* redirects */ }
  return { status: r.status, data, headers: r.headers };
}
try {
  assert.equal((await request("/sign-up/email", { name: "Disposable owned-auth QA", email, password }, true)).status, 403);
  const signup = await request("/sign-up/email", { name: "Disposable owned-auth QA", email, password });
  assert.equal(signup.status, 200); assert.equal(inbox.length, 1);
  userId = (await authDatabase.select().from(schema.user).where(eq(schema.user.email, email)))[0]?.id;
  assert.ok(userId);
  assert.equal(await ownedBusinessId(userId), `owned:${userId}`);
  assert.equal((await request("/get-session")).data, null);
  const blocked = await request("/sign-in/email", { email, password });
  assert.equal(blocked.status, 403);
  const token = new URL(inbox[0]!).searchParams.get("token");
  assert.ok(token);
  assert.ok((await request(`/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(origin)}`)).status < 400);
  assert.equal((await request("/sign-in/email", { email, password: `${password}-wrong` })).status, 401);
  const signed = await request("/sign-in/email", { email, password });
  assert.equal(signed.status, 200);
  assert.match(signed.headers.getSetCookie().join(";"), /HttpOnly/i);
  assert.match(signed.headers.getSetCookie().join(";"), /Secure/i);
  assert.match(signed.headers.getSetCookie().join(";"), /SameSite=Lax/i);
  assert.equal((await request("/get-session")).data.user.email, email);
  assert.equal((await request("/update-user", { name: "QA profile updated" })).status, 200);
  assert.equal((await request("/get-session")).data.user.name, "QA profile updated");
  const firstToken = (await request("/get-session")).data.session.token;
  assert.equal((await request("/sign-in/email", { email, password })).status, 200);
  assert.equal((await request("/list-sessions")).data.length, 2);
  assert.equal((await request("/revoke-session", { token: firstToken })).status, 200);
  assert.equal((await request("/list-sessions")).data.length, 1);
  const changedPassword = `QA-only-changed-${randomUUID()}`;
  assert.equal((await request("/change-password", { currentPassword: password,
    newPassword: changedPassword, revokeOtherSessions: true })).status, 200);
  password = changedPassword;
  const factor = await request("/two-factor/enable", { password });
  assert.equal(factor.status, 200); assert.ok(factor.data.totpURI);
  // Use the library's independent OTP implementation, never print its secret.
  const { createHmac } = await import("node:crypto");
  const secret32 = new URL(factor.data.totpURI).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = "";
  for (const char of secret32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(char).toString(2).padStart(5,"0");
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map(v => parseInt(v,2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const mac = createHmac("sha1", bytes).update(counter).digest(), offset = mac[mac.length-1]! & 15;
  const code = String((mac.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,"0");
  assert.equal((await request("/two-factor/verify-totp", { code })).status, 200);
  assert.equal((await request("/get-session")).data.user.twoFactorEnabled, true);
  assert.equal((await request("/sign-out", {})).status, 200);
  assert.equal((await request("/get-session")).data, null);
  // Remove ONLY the QA per-path bucket before the next legitimate challenge.
  await authDatabase.delete(schema.rateLimit).where(eq(schema.rateLimit.key, "127.0.0.1:/sign-in/email"));
  const challenged = await request("/sign-in/email", { email, password });
  assert.equal(challenged.status, 200); assert.equal(challenged.data.twoFactorRedirect, true);
  assert.equal((await request("/get-session")).data, null);
  const backup = factor.data.backupCodes[0];
  assert.equal((await request("/two-factor/verify-backup-code", { code: backup })).status, 200);
  assert.equal((await request("/get-session")).data.user.id, userId);
  const before = inbox.length;
  assert.equal((await request("/request-password-reset", { email, redirectTo: `${origin}/reset-password` })).status, 200);
  assert.equal(inbox.length, before+1);
  const resetToken = new URL(inbox[inbox.length-1]!).searchParams.get("token") ??
    new URL(inbox[inbox.length-1]!).pathname.split("/").pop()!;
  const replacement = `QA-only-replacement-${randomUUID()}`;
  assert.equal((await request("/reset-password", { token: resetToken, newPassword: replacement })).status, 200);
  assert.equal((await request("/get-session")).data, null);
  assert.notEqual((await request("/reset-password", { token: resetToken, newPassword: password })).status, 200);
  console.log("Owned auth QA passed: origin denial, signup/verification, passwords/change, cookies, profile, session list/revoke, TOTP, backup challenge, logout, recovery/replay and session revocation.");
} finally {
  const rows = await authDatabase.select().from(schema.user).where(eq(schema.user.email, email));
  for (const row of rows) await authDatabase.delete(schema.user).where(eq(schema.user.id, row.id));
  // Scoped to the synthetic test host: private QA never leaves credentials behind.
  await authDatabase.delete(schema.verification).where(eq(schema.verification.identifier, email));
  await pool.end();
}

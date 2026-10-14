import test, { mock } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { performAction } from "./actions";
import { SESSION_COOKIE } from "./session";
import { sessionCodec } from "./crypto";
import { requireAuthentication } from "../../middlewares/authentication";

const secret = "synthetic-independent-development-password-recovery-key";
const subject = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const factor = "11111111-2222-3333-4444-555555555555";
const user = { id: subject, email: "fictional@example.test", email_confirmed_at: "2026-01-01",
  factors: [{ id: factor, factor_type: "totp", status: "verified" }] };
const token = (aal: string) => `synthetic.${Buffer.from(JSON.stringify({ aal })).toString("base64url")}.synthetic`;

async function scenario(aal: string, run: (req: Request, res: Response, writes: string[], read: () => { recovery: boolean }) => Promise<void>,
    expired = false) {
  const before = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "test", QXLAYER_EXTERNAL_ENVIRONMENT: "development",
    QXLAYER_AUTH_PROVIDER: "supabase", QXLAYER_DATABASE_PROVIDER: "replit",
    REPLIT_DEV_DOMAIN: "recovery-test.replit.dev",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL: "https://recovery-test.replit.dev",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF: "nktstksmfpcsjnjbeqsk",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY: "sb_secret_synthetic_test",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET: secret });
  const codec = sessionCodec(secret);
  let envelope = codec.seal({ accessToken: token(aal), refreshToken: "synthetic-refresh", subject,
    tokenExpires: Date.now() + 3600000, recovery: true, created: Date.now() - (expired ? 16 * 60000 : 1000) });
  const writes: string[] = [];
  const client = { async query(sql: string) {
    return sql.includes("SELECT envelope") ? { rowCount: 1, rows: [{ envelope }] } : { rowCount: 1, rows: [] };
  }, release() {} };
  mock.method(pool, "connect", async () => client);
  mock.method(pool, "query", async (sql: string, values: unknown[] = []) => {
    if (sql.startsWith("UPDATE vynox_supabase_auth.sessions")) envelope = String(values[1]);
    if (!sql.includes("rate_limits")) writes.push(sql);
    return { rowCount: 1, rows: [{ hits: 1 }] };
  });
  mock.method(globalThis, "fetch", async (raw: string | URL, options?: RequestInit) => {
    const path = new URL(String(raw)).pathname;
    if (options?.method === "PUT") { writes.push("provider-password-update"); return new globalThis.Response("{}"); }
    if (path.endsWith("/challenge")) return new globalThis.Response(JSON.stringify({ id: "synthetic-challenge" }));
    if (path.endsWith("/verify")) return new globalThis.Response(JSON.stringify({
      user, access_token: token("aal2"), refresh_token: "synthetic-refresh", expires_in: 3600 }));
    if (path.endsWith("/logout")) return new globalThis.Response("{}");
    return new globalThis.Response(JSON.stringify(user));
  });
  const req = { headers: { cookie: `${SESSION_COOKIE}=${"a".repeat(43)}` }, method: "GET", get() { return undefined; },
    socket: { remoteAddress: "127.0.0.1" } } as Request;
  const res = { clearCookie() {} } as unknown as Response;
  try { await run(req, res, writes, () => codec.open<{ recovery: boolean }>(envelope)); }
  finally {
    mock.restoreAll();
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
}
test("a recovery email never bypasses an existing authenticator during password reset", async () => {
  await scenario("aal1", async (req, res, writes) => {
    await assert.rejects(performAction({ action: "reset-password", password: "Synthetic-new-password" }, req, res),
      (e: unknown) => (e as { status: number }).status === 428);
    assert(!writes.includes("provider-password-update"));
  });
});
test("MFA can elevate recovery assurance but never grants business or Admin access", async () => {
  await scenario("aal1", async (req, res, _writes, read) => {
    await performAction({ action: "mfa-verify", code: "123456" }, req, res);
    assert.equal(read().recovery, true);
    await assert.rejects(async () => requireAuthentication(req, res, () => assert.fail("Recovery entered protected routes")),
      (e: unknown) => (e as { status: number }).status === 401);
  });
});
test("MFA-verified recovery changes only the password and revokes all subject sessions", async () => {
  await scenario("aal2", async (req, res, writes) => {
    await performAction({ action: "reset-password", password: "Synthetic-new-password" }, req, res);
    assert(writes.includes("provider-password-update"));
    assert(writes.some(sql => sql.includes("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1")));
    assert(writes.every(sql => !/identity_links|platform_admins|tenant_memberships/.test(sql)));
  });
});
test("an expired recovery context cannot start MFA verification", async () => {
  await scenario("aal1", async (req, res) => {
    await assert.rejects(performAction({ action: "mfa-verify", code: "123456" }, req, res),
      (e: unknown) => (e as { status: number }).status === 401);
  }, true);
});

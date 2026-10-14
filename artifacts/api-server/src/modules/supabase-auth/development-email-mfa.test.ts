import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import { sessionCodec } from "./crypto";
import { applicationMfaSatisfied, emailMfaEligible, sendEmailChallenge, verifyEmailChallenge } from "./development-email-mfa";
import { input, performAction } from "./actions";
import { readSession, SESSION_COOKIE, type AuthSession, type Payload } from "./session";
import type { Request } from "express";

async function fixture(run: (f: {
  s: AuthSession; code: () => string; payload: () => Payload; write: (p: Payload) => void;
  eligible: (b: boolean) => void; delivery: (b: boolean) => void; advance: (n: number) => void;
  sent: () => number;
}) => Promise<void>) {
  const before = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "test", QXLAYER_EXTERNAL_ENVIRONMENT: "development",
    QXLAYER_AUTH_PROVIDER: "supabase", QXLAYER_DATABASE_PROVIDER: "replit",
    REPLIT_DEV_DOMAIN: "email-mfa-test.replit.dev",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL: "https://email-mfa-test.replit.dev",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF: "nktstksmfpcsjnjbeqsk",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY: "sb_secret_synthetic_test",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET: "synthetic-independent-development-email-mfa-key",
    QXLAYER_DEVELOPMENT_RESEND_SMTP_KEY: "synthetic-send-only-fixture-key" });
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const codec = sessionCodec(process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET!);
  const accessToken = `fixture.${Buffer.from('{"aal":"aal1"}').toString("base64url")}.fixture`;
  const s: AuthSession = { digest: "synthetic-session-digest", aal2: false,
    user: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", email: "synthetic@gmail.com",
      email_confirmed_at: "2026-01-01", factors: [{ id: "11111111-2222-3333-4444-555555555555", status: "verified", factor_type: "totp" }] },
    payload: { subject: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", accessToken, refreshToken: "synthetic-refresh",
      tokenExpires: Date.now() + 3600000, recovery: false, created: Date.now() } };
  let envelope = codec.seal(s.payload), deliveredCode = "", sent = 0, eligible = true, delivery = true;
  const limits = new Map<string, { hits: number; reset: number }>();
  let tail = Promise.resolve();
  mock.method(pool, "connect", async () => {
    let unlock: (() => void) | undefined;
    return {
      async query(sql: string, args: unknown[] = []) {
        if (sql === "BEGIN") {
          const previous = tail; tail = new Promise<void>(resolve => { unlock = resolve; }); await previous;
        }
        if (sql === "COMMIT" || sql === "ROLLBACK") { unlock?.(); unlock = undefined; }
        if (sql.includes("UPDATE vynox_supabase_auth.sessions")) envelope = String(args[1]);
        return sql.includes("SELECT envelope") ? { rowCount: 1, rows: [{ envelope }] } : { rowCount: 1, rows: [] };
      }, release() { unlock?.(); },
    };
  });
  mock.method(pool, "query", async (sql: string, args: unknown[] = []) => {
    if (sql.includes("UPDATE vynox_supabase_auth.sessions")) envelope = String(args[1]);
    if (sql.includes("public.platform_admins")) return { rows: [{ eligible }] };
    if (sql.includes("identity_links")) return { rows: [{ business_id: "synthetic-preserved-business-id" }] };
    if (sql.includes("make_interval")) {
      const key = String(args[0]), old = limits.get(key);
      const value = old && old.reset > Date.now() ? { ...old, hits: old.hits + 1 }
        : { hits: 1, reset: Date.now() + Number(args[1]) * 1000 };
      limits.set(key, value); return { rows: [{ hits: value.hits }] };
    }
    return { rows: [{ hits: 1 }] };
  });
  mock.method(globalThis, "fetch", async (url: string | URL, options?: RequestInit) => {
    if (String(url) === "https://api.resend.com/emails") {
      sent++;
      const body = JSON.parse(String(options?.body));
      assert.deepEqual(body.to, ["synthetic@gmail.com"]);
      deliveredCode = body.text.match(/\b\d{6}\b/)[0];
      return new Response("{}", { status: delivery ? 200 : 503 });
    }
    if (String(url).endsWith("/challenge")) return new Response('{"id":"synthetic-challenge"}');
    if (String(url).endsWith("/verify")) return new Response(JSON.stringify({
      user: s.user, access_token: `fixture.${Buffer.from('{"aal":"aal2"}').toString("base64url")}.fixture`,
      refresh_token: "synthetic-refresh", expires_in: 3600 }));
    if (String(url).includes("grant_type=refresh_token")) return new Response(JSON.stringify({
      user: s.user, access_token: accessToken, refresh_token: "synthetic-rotated-refresh", expires_in: 3600 }));
    return new Response(JSON.stringify(s.user));
  });
  try {
    await run({ s, code: () => deliveredCode, payload: () => codec.open<Payload>(envelope),
      write: p => { envelope = codec.seal(p); }, eligible: b => { eligible = b; },
      delivery: b => { delivery = b; }, advance: n => mock.timers.tick(n), sent: () => sent });
  } finally {
    mock.restoreAll(); mock.timers.reset();
    for (const k of Object.keys(process.env)) if (!(k in before)) delete process.env[k];
    Object.assign(process.env, before);
  }
}

test("email MFA is restricted to active Super Admins, verified Gmail, existing TOTP and password sessions", async () => {
  await fixture(async f => {
    assert(await emailMfaEligible(f.s));
    for (const change of [
      () => f.eligible(false),
      () => { f.s.user.email_confirmed_at = null; },
      () => { f.s.user.email = "synthetic@example.test"; },
      () => { f.s.user.factors = []; },
      () => { f.s.payload.recovery = true; },
      () => { process.env.QXLAYER_EXTERNAL_ENVIRONMENT = "staging"; },
    ]) {
      const user = structuredClone(f.s.user), p = structuredClone(f.s.payload);
      change(); assert.equal(await emailMfaEligible(f.s), false);
      await assert.rejects(sendEmailChallenge(f.s), { status: 403 });
      f.s.user = user; f.s.payload = p; f.eligible(true);
      process.env.QXLAYER_EXTERNAL_ENVIRONMENT = "development";
    }
    assert.equal(f.sent(), 0);
  });
});
test("single-use email code elevates only app assurance and never disables TOTP", async () => {
  await fixture(async f => {
    await sendEmailChallenge(f.s);
    assert.match(f.code(), /^\d{6}$/);
    assert.equal(f.payload().emailChallenge!.expires - Date.now(), 300000);
    assert.notEqual(f.payload().emailChallenge!.hash, f.code());
    assert.equal(await applicationMfaSatisfied(f.s), false);
    await verifyEmailChallenge(f.s, f.code());
    f.s.payload = f.payload();
    assert(await applicationMfaSatisfied(f.s));
    assert.equal(f.s.aal2, false);
    assert.equal(f.s.user.factors![0].status, "verified");
    assert.equal(f.payload().emailChallenge, undefined);
    await assert.rejects(verifyEmailChallenge(f.s, f.code()), { status: 400 });
    f.eligible(false); assert.equal(await applicationMfaSatisfied(f.s), false);
    f.eligible(true); f.s.user.email = "other@gmail.com"; assert.equal(await applicationMfaSatisfied(f.s), false);
  });
});
test("expiry, five wrong attempts and subject-wide send rate limits fail closed", async () => {
  await fixture(async f => {
    await sendEmailChallenge(f.s);
    await assert.rejects(sendEmailChallenge(f.s), { status: 429 });
    const wrong = f.code() === "000000" ? "111111" : "000000";
    for (let n = 1; n <= 5; n++) {
      await assert.rejects(verifyEmailChallenge(f.s, wrong), { status: 400 });
      assert.equal(f.payload().emailChallenge!.attempts, n);
    }
    await assert.rejects(verifyEmailChallenge(f.s, f.code()), { status: 400 });
    f.advance(61000); await sendEmailChallenge(f.s);
    f.advance(300000); await assert.rejects(verifyEmailChallenge(f.s, f.code()), { status: 400 });
  });
});
test("resends invalidate old codes and parallel consumption accepts only one request", async () => {
  await fixture(async f => {
    await sendEmailChallenge(f.s);
    const previous = f.payload().emailChallenge!.hash;
    f.advance(61000); await sendEmailChallenge(f.s);
    assert.notEqual(f.payload().emailChallenge!.hash, previous);
    const results = await Promise.allSettled([verifyEmailChallenge(f.s, f.code()), verifyEmailChallenge(f.s, f.code())]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  });
});
test("mailer failures never record assurance or a usable challenge", async () => {
  await fixture(async f => {
    f.delivery(false); await assert.rejects(sendEmailChallenge(f.s), { status: 503 });
    assert.equal(f.payload().emailMfa, undefined); assert.equal(f.payload().emailChallenge, undefined);
  });
});
test("subject-wide hourly send and fifteen-minute attempt ceilings cannot be bypassed by resends", async () => {
  await fixture(async f => {
    for (let round = 0; round < 4; round++) {
      await sendEmailChallenge(f.s);
      const wrong = f.code() === "000000" ? "111111" : "000000";
      for (let n = 0; n < 5; n++) await assert.rejects(verifyEmailChallenge(f.s, wrong), { status: 400 });
      f.advance(61000);
    }
    await sendEmailChallenge(f.s);
    await assert.rejects(verifyEmailChallenge(f.s, f.code()), { status: 429 });
    f.advance(61000);
    await assert.rejects(sendEmailChallenge(f.s), { status: 429 });
    assert.equal(f.sent(), 5);
  });
});
test("email assurance survives token refresh but expires and cannot follow a changed authenticator", async () => {
  await fixture(async f => {
    await sendEmailChallenge(f.s); await verifyEmailChallenge(f.s, f.code());
    const p = f.payload(); p.tokenExpires = Date.now() - 1; f.write(p);
    const req = { headers: { cookie: `${SESSION_COOKIE}=${"a".repeat(43)}` } } as Request;
    const refreshed = await readSession(req);
    assert(refreshed);
    assert.equal(refreshed.aal2, false);
    assert(await applicationMfaSatisfied(refreshed));
    refreshed.user.factors![0].id = "different-factor";
    assert.equal(await applicationMfaSatisfied(refreshed), false);
    refreshed.user.factors = structuredClone(f.s.user.factors);
    f.advance(12 * 3600000);
    assert.equal(await applicationMfaSatisfied(refreshed), false);
  });
});
test("authenticator verification remains native provider AAL2 and clears an outstanding email code", async () => {
  await fixture(async f => {
    await sendEmailChallenge(f.s);
    const req = { headers: { cookie: `${SESSION_COOKIE}=${"a".repeat(43)}` }, socket: { remoteAddress: "127.0.0.1" } } as Request;
    // The fake DB accepts the test cookie only in this isolated in-memory test.
    await performAction({ action: "mfa-verify", code: "123456" }, req, {} as never);
    assert.equal(f.payload().emailChallenge, undefined);
    const read = await readSession(req);
    assert.equal(read?.aal2, true);
  });
});
test("signup, reset and change use the same Development policy; existing login passwords are unaffected", async () => {
  await fixture(async () => {
    for (const action of ["signup", "reset-password", "change-password"]) {
      const fields = action === "signup" ? { name: "Synthetic", email: "synthetic@example.test" }
        : action === "change-password" ? { currentPassword: "old" } : {};
      assert(input.safeParse({ action, ...fields, password: "Abcdefgh12" }).success);
      for (const password of ["Abcdefg12", "abcdefgh12", "ABCDEFGH12", "Abcdefghij"])
        assert(!input.safeParse({ action, ...fields, password }).success);
    }
    assert(input.safeParse({ action: "login", email: "synthetic@example.test", password: "old" }).success);
    assert(!input.safeParse({ action: "mfa-email-send", email: "attacker@gmail.com" }).success);
    assert(!input.safeParse({ action: "mfa-email-verify", code: "123456", role: "super_admin" }).success);
  });
});

import test, { mock } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { factorFingerprint, recoveryDigest, newRecoveryCodes, generateRecoveryCodes,
  recoverAuthenticator, requireDevelopmentRecovery } from "./development-recovery";
import { input } from "./actions";
import type { AuthSession } from "./session";

const subject = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const factor = "11111111-2222-3333-4444-555555555555";
const other = "aaaaaaaa-bbbb-cccc-dddd-ffffffffffff";
const env = { QXLAYER_EXTERNAL_ENVIRONMENT: "development", QXLAYER_AUTH_PROVIDER: "supabase",
  NODE_ENV: "test", REPLIT_DEV_DOMAIN: "recovery-test.replit.dev", QXLAYER_DATABASE_PROVIDER: "replit",
  QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL: "https://recovery-test.replit.dev",
  QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF: "nktstksmfpcsjnjbeqsk",
  QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY: "sb_secret_synthetic_recovery_test",
  QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET: "synthetic-development-recovery-independent-long-key" };
const session = (aal2 = false): AuthSession => ({ digest: "synthetic", aal2,
  payload: { accessToken: "synthetic-only", refreshToken: "synthetic-only", subject, tokenExpires: 1, recovery: false, created: Date.now() },
  user: { id: subject, email: "fictional@example.test", email_confirmed_at: "2026-01-01",
    factors: [{ id: factor, factor_type: "totp", status: "verified" }] } });
async function scenario(op: "generate" | "recover", options: { used?: boolean; badPassword?: boolean; outage?: boolean; aal2?: boolean } = {}) {
  const previous = { ...process.env }; Object.assign(process.env, env);
  const queries: { sql: string; values?: unknown[] }[] = [];
  const requests: { url: string; method?: string }[] = [];
  let cookiesCleared = false;
  const c = { async query(sql: string, values?: unknown[]) {
    queries.push({ sql, values });
    return { rows: [], rowCount: sql.startsWith("UPDATE vynox_supabase_auth.recovery_codes") ? Number(!options.used) : 1 };
  }, release() {} };
  mock.method(pool, "connect", async () => c);
  mock.method(pool, "query", c.query);
  mock.method(globalThis, "fetch", async (url: string, optionsFetch: RequestInit) => {
    requests.push({ url: String(url), method: optionsFetch?.method });
    if (String(url).includes("grant_type=password")) return new globalThis.Response(JSON.stringify(
      options.badPassword ? { error_code: "invalid_credentials" } :
        { user: { id: subject }, access_token: "synthetic-reauth", refresh_token: "synthetic-reauth" }),
    { status: options.badPassword ? 400 : 200 });
    if (options.outage && optionsFetch?.method === "DELETE") throw new Error("Synthetic provider outage");
    return new globalThis.Response("{}", { status: 200 });
  });
  let error: unknown; let codes: string[] | undefined;
  try {
    if (op === "generate") codes = await generateRecoveryCodes(session(options.aal2 ?? true));
    else await recoverAuthenticator(session(), "fictional-password", newRecoveryCodes()[0],
      {} as Request, { clearCookie() { cookiesCleared = true; } } as unknown as Response);
  } catch (e) { error = e; }
  finally {
    mock.restoreAll();
    for (const k of Object.keys(process.env)) if (!(k in previous)) delete process.env[k];
    Object.assign(process.env, previous);
  }
  return { error, codes, queries, requests, cookiesCleared };
}
test("codes have 128 bits of random entropy and subject-bound normalized digests", () => {
  const codes = newRecoveryCodes(); assert.equal(codes.length, 10); assert.equal(new Set(codes).size, 10);
  assert.match(codes[0], /^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/);
  assert.equal(recoveryDigest(subject, codes[0]), recoveryDigest(subject, codes[0].toUpperCase().replaceAll("-", " ")));
  assert.notEqual(recoveryDigest(subject, codes[0]), recoveryDigest(other, codes[0]));
  assert.throws(() => recoveryDigest(subject, "short"));
});
test("codes cannot survive authenticator replacement", () => {
  assert.notEqual(factorFingerprint(session().user), factorFingerprint({ id: subject, factors: [{ id: other, factor_type: "totp", status: "verified" }] }));
});
test("recovery input requires explicit destructive confirmation and rejects caller-selected identities", () => {
  const a = { action: "mfa-recover", currentPassword: "fictional", recoveryCode: "a".repeat(32), confirmReset: true };
  assert(input.safeParse(a).success);
  assert(!input.safeParse({ ...a, confirmReset: false }).success);
  assert(!input.safeParse({ ...a, subject: other }).success);
  assert(!input.safeParse({ ...a, businessId: "owner" }).success);
  assert(!input.safeParse({ action: "mfa-recovery-generate", currentPassword: "fictional", code: "123456" }).success);
});
test("unverified sessions cannot generate recovery codes", async () => {
  const r = await scenario("generate", { aal2: false }); assert.equal((r.error as { status: number }).status, 403);
  assert.equal(r.queries.length, 0);
});
test("generation persists only hashes and audits the operation", async () => {
  const r = await scenario("generate"); assert.equal(r.error, undefined); assert.equal(r.codes?.length, 10);
  for (const q of r.queries) for (const value of q.values ?? []) assert(!r.codes?.includes(String(value)));
  assert(r.queries.some(q => q.sql.includes("recovery_events")));
  assert(r.queries.every(q => !/public\./.test(q.sql)));
});
test("wrong password cannot consume a code, revoke sessions or delete a factor", async () => {
  const r = await scenario("recover", { badPassword: true }); assert(r.error); assert.equal(r.queries.length, 0);
  assert(!r.requests.some(r => r.method === "DELETE")); assert.equal(r.cookiesCleared, false);
});
test("used or foreign codes cannot reset a factor or revoke sessions", async () => {
  const r = await scenario("recover", { used: true }); assert.equal((r.error as { status: number }).status, 403);
  assert(!r.queries.some(q => q.sql.startsWith("DELETE"))); assert(!r.requests.some(r => r.method === "DELETE"));
  assert(r.queries.some(q => q.sql === "ROLLBACK"));
});
test("recovery consumes once, revokes only the subject's sessions and deletes only its bound factor", async () => {
  const r = await scenario("recover"); assert.equal(r.error, undefined); assert.equal(r.cookiesCleared, true);
  const consume = r.queries.find(q => q.sql.startsWith("UPDATE vynox_supabase_auth.recovery_codes"));
  assert.deepEqual([consume?.values?.[0], consume?.values?.[2]], [subject, factorFingerprint(session().user)]);
  assert.deepEqual(r.queries.find(q => q.sql.startsWith("DELETE FROM vynox_supabase_auth.sessions"))?.values, [subject]);
  assert(r.requests.some(r => r.method === "DELETE" && r.url === `https://nktstksmfpcsjnjbeqsk.supabase.co/auth/v1/admin/users/${subject}/factors/${factor}`));
  assert(r.queries.every(q => !/public\./.test(q.sql)));
});
test("provider failure leaves the code consumed, sessions revoked and a failed audit outcome", async () => {
  const r = await scenario("recover", { outage: true }); assert.equal((r.error as { status: number }).status, 503);
  assert(r.cookiesCleared); assert(r.queries.some(q => q.sql === "COMMIT"));
  assert(r.queries.some(q => q.sql.includes("outcome='failed'")));
});
test("Staging cannot activate Development recovery", () => {
  const old = process.env.QXLAYER_EXTERNAL_ENVIRONMENT;
  process.env.QXLAYER_EXTERNAL_ENVIRONMENT = "staging";
  try { assert.throws(() => requireDevelopmentRecovery(), e => (e as { status: number }).status === 404); }
  finally { if (old === undefined) delete process.env.QXLAYER_EXTERNAL_ENVIRONMENT; else process.env.QXLAYER_EXTERNAL_ENVIRONMENT = old; }
});

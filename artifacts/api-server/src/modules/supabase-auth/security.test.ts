import assert from "node:assert/strict";
import test from "node:test";
import { supabaseAuthEnabled, supabaseAuthConfiguration, supabaseBusinessId } from "./config";
import { sessionCodec, cookieDigest, pkcePair } from "./crypto";
import { randomBytes, createHash } from "node:crypto";

const env = {
  QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_AUTH_PROVIDER: "supabase",
  QXLAYER_SUPABASE_AUTH_URL: "https://auth-trial.example.com",
  QXLAYER_SUPABASE_AUTH_PROJECT_REF: "muvedavhbpgpdrrnjrih",
  QXLAYER_SUPABASE_AUTH_SERVER_KEY: "synthetic-test-only-key",
};
test("Clerk remains the default; storage/database configuration does not activate Supabase Auth", () => {
  assert.equal(supabaseAuthEnabled({ QXLAYER_DATABASE_PROVIDER: "supabase" }), false);
  assert.equal(supabaseAuthEnabled({ QXLAYER_AUTH_PROVIDER: "clerk" }), false);
});
test("Production and unscoped trials are refused", () => {
  assert.throws(() => supabaseAuthEnabled({ ...env, QXLAYER_EXTERNAL_ENVIRONMENT: "production" }));
  assert.throws(() => supabaseAuthEnabled({ QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED: "true" }));
});
test("authentication origin must be exact HTTPS; project and server key are mandatory", () => {
  assert.equal(supabaseAuthConfiguration(env).origin, env.QXLAYER_SUPABASE_AUTH_URL);
  for (const url of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?redirect=evil"])
    assert.throws(() => supabaseAuthConfiguration({ ...env, QXLAYER_SUPABASE_AUTH_URL: url }));
  assert.throws(() => supabaseAuthConfiguration({ ...env, QXLAYER_SUPABASE_AUTH_PROJECT_REF: "other" }));
  assert.throws(() => supabaseAuthConfiguration({ ...env, QXLAYER_SUPABASE_AUTH_SERVER_KEY: "" }));
});
test("email readiness is explicit, never a silent verification bypass", () => {
  assert.equal(supabaseAuthConfiguration(env).mailReady, false);
  assert.equal(supabaseAuthConfiguration({ ...env, QXLAYER_SUPABASE_AUTH_MAIL_READY: "true" }).mailReady, true);
});
test("new identities are namespaced without changing legacy IDs or matching emails", () => {
  assert.equal(supabaseBusinessId("00000000-0000-4000-8000-000000000001"), "supabase:00000000-0000-4000-8000-000000000001");
  assert.throws(() => supabaseBusinessId("user_existing_clerk"));
});
test("session envelopes authenticate before use, and reject tampering/wrong keys", () => {
  const codec = sessionCodec("synthetic-stage-signing-secret-long-enough");
  const envelope = codec.seal({ access_token: "synthetic-private-token" });
  assert.deepEqual(codec.open(envelope), { access_token: "synthetic-private-token" });
  assert(!envelope.includes("synthetic-private-token"));
  const damaged = Buffer.from(envelope, "base64url"); damaged[damaged.length - 1] ^= 1;
  assert.throws(() => codec.open(damaged.toString("base64url")));
  assert.throws(() => sessionCodec("different-synthetic-signing-secret-long-enough").open(envelope));
  assert.throws(() => sessionCodec("short"));
});
test("opaque cookies are hashed; PKCE uses random S256 proof", () => {
  const cookie = randomBytes(32).toString("base64url");
  assert.equal(cookieDigest(cookie).length, 64);
  assert.throws(() => cookieDigest("attacker"));
  const a = pkcePair(), b = pkcePair();
  assert.notEqual(a.verifier, b.verifier);
  assert.equal(a.challenge, createHash("sha256").update(a.verifier).digest("base64url"));
});

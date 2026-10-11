import test from "node:test";
import assert from "node:assert/strict";
import { applicationUserId, assertStagingClerk, assertFrontendClerk, stagingClerk } from "./index.mjs";
const host = "synthetic.clerk.accounts.dev";
const pk = `pk_test_${Buffer.from(`${host}$`).toString("base64")}`;
const env = { QXLAYER_DATABASE_PROVIDER: "supabase", QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
  CLERK_PUBLISHABLE_KEY: pk, CLERK_SECRET_KEY: "sk_test_synthetic",
  QXLAYER_CLERK_DEVELOPMENT_HOST: host };

test("Explicit external Staging accepts only the pinned existing Development instance", () => {
  assert.doesNotThrow(() => assertStagingClerk(env));
  for (const override of [
    { CLERK_PUBLISHABLE_KEY: "pk_live_synthetic" }, { CLERK_SECRET_KEY: "sk_live_synthetic" },
    { CLERK_SECRET_KEY: undefined }, { QXLAYER_CLERK_DEVELOPMENT_HOST: "other.clerk.accounts.dev" },
    { CLERK_PROXY_PUBLIC_URL: "https://live.invalid/api/__clerk" },
  ]) assert.throws(() => assertStagingClerk({ ...env, ...override }));
});

test("Staging frontend compilation rejects live keys, mixed instances and a live proxy", () => {
  const front = { ...env, VITE_CLERK_PUBLISHABLE_KEY: pk };
  assert.doesNotThrow(() => assertFrontendClerk(front));
  assert.throws(() => assertFrontendClerk({ ...front, VITE_CLERK_PUBLISHABLE_KEY: "pk_live_synthetic" }));
  assert.throws(() => assertFrontendClerk({ ...front, VITE_CLERK_PROXY_URL: "https://live.invalid" }));
  assert.throws(() => assertFrontendClerk({ ...front, QXLAYER_CLERK_DEVELOPMENT_HOST: "other.clerk.accounts.dev" }));
});

test("No identity guessing: unknown users and client-supplied aliases do not gain copied roles", () => {
  assert.equal(applicationUserId("user_dev", env), null);
  const mapped = { ...env, QXLAYER_STAGING_IDENTITY_BINDINGS:
    JSON.stringify({ user_dev: "user_original" }) };
  assert.equal(applicationUserId("user_dev", mapped), "user_original");
  assert.equal(applicationUserId("user_stranger", mapped), null);
  for (const bindings of ['[]', 'null', '{', '{"user_a":"user_old","user_b":"user_old"}',
    '{"__proto__":"user_owner"}']) {
    assert.throws(() => assertStagingClerk({ ...env, QXLAYER_STAGING_IDENTITY_BINDINGS: bindings }));
  }
});

test("Identity mapping leaves original record IDs, Super Admin and tenant permissions intact", () => {
  const records = { admins: ["user_owner"], memberships: [
    { userId: "user_customer", tenantId: "tenant_original", role: "client_admin", permissions: ["branding.manage"] },
  ] };
  const before = JSON.stringify(records);
  const mapped = { ...env, QXLAYER_STAGING_IDENTITY_BINDINGS:
    '{"user_devowner":"user_owner","user_devcustomer":"user_customer"}' };
  assert.ok(records.admins.includes(applicationUserId("user_devowner", mapped)));
  assert.equal(records.memberships.find(m => m.userId === applicationUserId("user_devcustomer", mapped)).role, "client_admin");
  assert.equal(JSON.stringify(records), before);
});

test("Replit and Production identity behavior is unchanged, even with stray Staging bindings", () => {
  for (const outside of [{}, { QXLAYER_EXTERNAL_ENVIRONMENT: "staging" },
    { ...env, QXLAYER_EXTERNAL_ENVIRONMENT: "production" }]) {
    assert.equal(stagingClerk(outside), false);
    assert.equal(applicationUserId("user_original", { ...outside, QXLAYER_STAGING_IDENTITY_BINDINGS: "invalid" }), "user_original");
    assert.doesNotThrow(() => assertStagingClerk(outside));
  }
});

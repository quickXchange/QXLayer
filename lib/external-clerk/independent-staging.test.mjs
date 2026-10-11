import test from "node:test";
import assert from "node:assert/strict";
import { independentStagingCandidate } from "./independent-staging.mjs";
const key = host => `pk_test_${Buffer.from(`${host}.clerk.accounts.dev$`).toString("base64")}`;
const current = {
  QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_DATABASE_PROVIDER: "supabase",
  CLERK_PUBLISHABLE_KEY: key("managed"), CLERK_SECRET_KEY: "sk_test_managed",
  QXLAYER_STAGING_IDENTITY_BINDINGS: '{"user_managed":"user_business"}',
};
const candidate = {
  ownerControlConfirmed: true, CLERK_PUBLISHABLE_KEY: key("independent"),
  CLERK_SECRET_KEY: "sk_test_independent",
  QXLAYER_STAGING_IDENTITY_BINDINGS: '{"user_independent":"user_business"}',
};
test("Independent candidate preserves business authority and never activates", () => {
  const result = independentStagingCandidate(current, candidate);
  assert.equal(result.ownerBusinessAuthorizationPreserved, true);
  assert.equal(result.activationApproved, false);
  assert.equal(result.productionAuthenticationChanged, false);
});
test("Reject Production, live keys, managed reuse and changed owner authority", () => {
  assert.throws(() => independentStagingCandidate({ ...current, QXLAYER_EXTERNAL_ENVIRONMENT: "production" }, candidate));
  assert.throws(() => independentStagingCandidate(current, { ...candidate, CLERK_SECRET_KEY: "sk_live_invalid" }));
  assert.throws(() => independentStagingCandidate(current, { ...candidate, ownerControlConfirmed: false }));
  assert.throws(() => independentStagingCandidate(current, { ...candidate, CLERK_PUBLISHABLE_KEY: current.CLERK_PUBLISHABLE_KEY }));
  assert.throws(() => independentStagingCandidate(current, { ...candidate, QXLAYER_STAGING_IDENTITY_BINDINGS: '{"user_independent":"user_different"}' }));
});

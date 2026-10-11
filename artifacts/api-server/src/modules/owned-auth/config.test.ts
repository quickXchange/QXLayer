import { test } from "node:test";
import assert from "node:assert/strict";
import { ownedAuthentication, authOrigin } from "./config";
test("default and Production retain Clerk", () => {
  assert.equal(ownedAuthentication({} as NodeJS.ProcessEnv), false);
  assert.throws(() => ownedAuthentication({ QXLAYER_AUTH_PROVIDER: "owned", QXLAYER_EXTERNAL_ENVIRONMENT: "production" }));
  assert.throws(() => ownedAuthentication({ QXLAYER_AUTH_PROVIDER: "owned", NODE_ENV: "production" }));
  assert.throws(() => ownedAuthentication({ QXLAYER_AUTH_PROVIDER: "owned", QXLAYER_DATABASE_PROVIDER: "supabase", NODE_ENV: "development" }));
});
test("explicit Development and Staging only", () => {
  assert.equal(ownedAuthentication({ QXLAYER_AUTH_PROVIDER: "owned", NODE_ENV: "development" }), true);
  assert.equal(ownedAuthentication({ QXLAYER_AUTH_PROVIDER: "owned", QXLAYER_EXTERNAL_ENVIRONMENT: "staging", NODE_ENV: "production" }), true);
});
test("origin cannot include credentials, redirects or insecure non-test transport", () => {
  for (const value of ["http://example.com", "https://example.com/x", "https://a:b@example.com/", "https://example.com/?x=1"])
    assert.throws(() => authOrigin({ QXLAYER_AUTH_URL: value, NODE_ENV: "development" }));
  assert.equal(authOrigin({ QXLAYER_PLATFORM_URL: "https://example.com/" }), "https://example.com");
  assert.equal(authOrigin({ QXLAYER_PLATFORM_URL: "https://production.invalid",
    QXLAYER_AUTH_URL: "https://development.invalid" }), "https://development.invalid");
});

import test from "node:test";
import assert from "node:assert/strict";
import { supabaseAuthConfiguration, supabaseSessionSecret, supabaseEmailLoginEnabled } from "./config";

const production = {
  NODE_ENV: "production", QXLAYER_AUTH_PROVIDER: "supabase",
  QXLAYER_EXTERNAL_ENVIRONMENT: "production",
  QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED: "true",
  QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF: "abcdefghijklmnopqrst",
  QXLAYER_PRODUCTION_SUPABASE_AUTH_URL: "https://www.quicklychan.xyz",
  QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY: "sb_secret_synthetic_production_only",
  QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET: "synthetic-independent-production-session-key",
};
test("explicit approved Production uses only independent Production settings", () => {
  const cfg = supabaseAuthConfiguration(production);
  assert.equal(cfg.providerOrigin, "https://abcdefghijklmnopqrst.supabase.co");
  assert.equal(cfg.origin, production.QXLAYER_PRODUCTION_SUPABASE_AUTH_URL);
  assert.equal(cfg.apiKey, production.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY);
  assert.equal(cfg.mailReady, false);
  assert.equal(supabaseEmailLoginEnabled(production), true);
});
test("no Production activation through trial flags, build mode, or missing approval", () => {
  for (const patch of [
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED: "" },
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED: "false" },
    { NODE_ENV: "development" },
    { QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED: "true" },
    { QXLAYER_DEVELOPMENT_SUPABASE_AUTH_TRIAL_ENABLED: "true" },
  ]) assert.throws(() => supabaseAuthConfiguration({ ...production, ...patch }));
});
test("Production rejects cross-environment projects, credentials and canonical origin drift", () => {
  for (const ref of ["nktstksmfpcsjnjbeqsk", "muvedavhbpgpdrrnjrih", "", "malformed"])
    assert.throws(() => supabaseAuthConfiguration({ ...production, QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF: ref }));
  for (const url of ["https://preview.replit.dev", "https://quicklychan.xyz", "https://www.quicklychan.xyz/", "http://www.quicklychan.xyz"])
    assert.throws(() => supabaseAuthConfiguration({ ...production, QXLAYER_PRODUCTION_SUPABASE_AUTH_URL: url }));
  for (const key of ["", "sb_publishable_synthetic", "sk_live_synthetic"])
    assert.throws(() => supabaseAuthConfiguration({ ...production, QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY: key }));
  assert.throws(() => supabaseAuthConfiguration({ ...production,
    QXLAYER_SUPABASE_AUTH_SERVER_KEY: production.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY }));
  for (const name of ["SESSION_SECRET", "QXLAYER_SUPABASE_AUTH_SESSION_SECRET", "QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET"])
    assert.throws(() => supabaseSessionSecret({ ...production, [name]: production.QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET }));
});
test("Production never inherits other environments' mail readiness", () => {
  assert.equal(supabaseAuthConfiguration({ ...production, QXLAYER_SUPABASE_AUTH_MAIL_READY: "true",
    QXLAYER_DEVELOPMENT_SUPABASE_AUTH_MAIL_READY: "true" }).mailReady, false);
  assert.equal(supabaseAuthConfiguration({ ...production,
    QXLAYER_PRODUCTION_SUPABASE_AUTH_MAIL_READY: "true" }).mailReady, true);
});

test("isolated acceptance allows only its pinned protected origin without approving Live cutover", () => {
  const acceptance = { ...production, QXLAYER_EXTERNAL_CANDIDATE: "true",
    QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED: "true",
    QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED: "false",
    QXLAYER_PRODUCTION_SUPABASE_AUTH_URL: "https://qxlayer-acceptance-vynox3.vercel.app" };
  assert.equal(supabaseAuthConfiguration(acceptance).origin, acceptance.QXLAYER_PRODUCTION_SUPABASE_AUTH_URL);
  for (const patch of [{ QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED: "false" },
    { QXLAYER_EXTERNAL_CANDIDATE: "false" },
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_URL: "https://www.quicklychan.xyz" }])
    assert.throws(() => supabaseAuthConfiguration({ ...acceptance, ...patch }));
});

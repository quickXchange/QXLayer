import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareProductionMail, SMTP_POLICY } from "./supabase-production-mail.mjs";
import { PRODUCTION_REF, MAIL_TEMPLATES } from "./supabase-production-auth-preparation.mjs";

const key = "re_synthetic_noncredential_value_12345";
function fixture() {
  const plan = JSON.parse(readFileSync("deploy/production-supabase-auth-bootstrap.json", "utf8"));
  // Unit tests must not depend on ignored, operator-owned provisioning state.
  const state = { phase: "FREE_PROJECT_CREATED_AUTH_NOT_ACTIVATED",
    productionProjectRef: PRODUCTION_REF, organization: plan.organization,
    liveChangesApproved: false, migrateAccountsApproved: false, republishApproved: false };
  let cfg = { ...plan.proposedAuthConfig,
    ...Object.fromEntries(Object.keys(MAIL_TEMPLATES).map(k => [k, "default"])),
    ...Object.fromEntries(Object.keys(SMTP_POLICY).map(k => [k, null])),
    smtp_pass: null, protected_value: "synthetic-private-setting",
    external_email_enabled: true, external_anonymous_users_enabled: false,
    mfa_phone_enroll_enabled: false, mfa_phone_verify_enabled: false };
  const calls = [];
  const request = async (method, path, body) => {
    calls.push({ method, path, body });
    if (path === `/projects/${PRODUCTION_REF}`) return { id: PRODUCTION_REF,
      organization_id: plan.organization, status: "ACTIVE_HEALTHY" };
    if (method === "PATCH") cfg = { ...cfg, ...body, smtp_pass: "opaque-provider-value" };
    return structuredClone(cfg);
  };
  return { plan, state, request, calls, smtpKey: key, checkKeyPermission: async () => true,
    checkSmtp: async () => ({ smtpAuthenticated: true, senderEnvelopeAccepted: true,
      tlsVerified: true, messageSent: false }), setConfig: values => Object.assign(cfg, values) };
}
test("verification is read-only and requires no SMTP key", async () => {
  const f = fixture(); const r = await prepareProductionMail({ ...f, smtpKey: undefined });
  assert.equal(r.smtpConfigured, false); assert(f.calls.every(c => c.method === "GET"));
});
test("configured sender requires send-only and verified TLS; no mail or accounts are created", async () => {
  const f = fixture(); const r = await prepareProductionMail({ ...f, apply: true });
  const patch = f.calls.find(c => c.method === "PATCH");
  assert.equal(patch.path, `/projects/${PRODUCTION_REF}/config/auth`);
  assert(Object.keys(patch.body).every(k => Object.hasOwn(SMTP_POLICY, k) || k === "smtp_pass"));
  assert.equal(r.smtpConfigured, true); assert.equal(r.messageSent, false);
  assert.equal(r.accountsCreatedOrMigrated, false);
  assert(!JSON.stringify(r).includes(key)); assert(!JSON.stringify(r).includes("opaque-provider-value"));
});
test("wrong target, reused keys, broad credentials and incomplete TLS evidence stop before writes", async () => {
  const cases = [
    f => { f.plan.projectRef = "nktstksmfpcsjnjbeqsk"; },
    f => { f.otherKeys = [key]; },
    f => { f.otherKeys = [` ${key} `]; },
    f => { f.checkKeyPermission = async () => false; },
    f => { f.checkSmtp = async () => ({ tlsVerified: false }); },
    f => { f.setConfig({ disable_signup: false }); },
  ];
  for (const change of cases) {
    const f = fixture(); change(f);
    await assert.rejects(prepareProductionMail({ ...f, apply: true }));
    assert(f.calls.every(c => c.method === "GET"));
  }
});
test("existing mismatched SMTP is not overwritten and matching configuration is idempotent", async () => {
  const f = fixture(); f.setConfig({ smtp_host: "other.example.invalid", smtp_pass: "opaque" });
  await assert.rejects(prepareProductionMail({ ...f, apply: true }));
  assert(f.calls.every(c => c.method === "GET"));
  const g = fixture(); await prepareProductionMail({ ...g, apply: true }); g.calls.length = 0;
  await prepareProductionMail({ ...g, apply: true }); assert(g.calls.every(c => c.method === "GET"));
});
test("unrelated provider drift is rejected without exposing private fields", async () => {
  const f = fixture(), request = f.request;
  f.request = async (...args) => {
    const result = await request(...args);
    if (args[0] === "PATCH") f.setConfig({ protected_value: "synthetic-drift" });
    return result;
  };
  await assert.rejects(prepareProductionMail({ ...f, apply: true }));
});

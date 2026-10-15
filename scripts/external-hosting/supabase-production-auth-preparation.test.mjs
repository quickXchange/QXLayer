import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareProductionAuth, PRODUCTION_REF, MAIL_TEMPLATES, safeProductionFailure } from "./supabase-production-auth-preparation.mjs";

function fixture() {
  const plan = JSON.parse(readFileSync("deploy/production-supabase-auth-bootstrap.json", "utf8"));
  const state = { productionProjectRef: PRODUCTION_REF, organization: plan.organization,
    phase: "FREE_PROJECT_CREATED_AUTH_NOT_ACTIVATED",
    liveChangesApproved: false, migrateAccountsApproved: false, republishApproved: false };
  let config = { ...plan.proposedAuthConfig,
    ...Object.fromEntries(Object.keys(MAIL_TEMPLATES).map(k => [k, "provider-default"])),
    site_url: "http://localhost:3000", uri_allow_list: "", disable_signup: false,
    password_min_length: 6, password_required_characters: null, mailer_otp_length: 8,
    external_anonymous_users_enabled: false, mfa_phone_enroll_enabled: false,
    mfa_phone_verify_enabled: false, external_email_enabled: true,
    smtp_host: null, smtp_pass: null, protected_value: "synthetic-private-provider-value",
    mailer_subjects_custom_contents: { UNRELATED_SUBJECT: false },
    mailer_templates_custom_contents: { UNRELATED_TEMPLATE: false } };
  const calls = [];
  const request = async (method, path, body) => {
    calls.push({ method, path, body });
    if (path === `/projects/${PRODUCTION_REF}`) return {
      id: PRODUCTION_REF, organization_id: plan.organization, status: "ACTIVE_HEALTHY" };
    if (path !== `/projects/${PRODUCTION_REF}/config/auth`) throw Error("Unexpected path");
    if (method === "PATCH") {
      config = { ...config, ...body };
      for (const key of Object.keys(body).filter(k => Object.hasOwn(MAIL_TEMPLATES, k))) {
        const group = key.startsWith("mailer_subjects_") ? "mailer_subjects_custom_contents" : "mailer_templates_custom_contents";
        config[group] = { ...config[group], [key.toUpperCase()]: true };
      }
    }
    return structuredClone(config);
  };
  return { plan, state, request, calls, setConfig: patch => Object.assign(config, patch) };
}

test("read-only verification never patches provider defaults", async () => {
  const f = fixture(), result = await prepareProductionAuth(f);
  assert(f.calls.every(c => c.method === "GET"));
  assert.equal(result.applied, false); assert(result.pendingFields.length);
});
test("approved preparation patches only the isolated project and preserves unrelated settings", async () => {
  const f = fixture(), result = await prepareProductionAuth({ ...f, apply: true });
  assert.equal(f.calls.filter(c => c.method === "PATCH").length, 1);
  assert(f.calls.every(c => c.path.startsWith(`/projects/${PRODUCTION_REF}`)));
  assert.equal(result.nativeReadbackVerified, true);
  assert.equal(result.accountsCreatedOrMigrated, false);
  assert.equal(result.applicationRuntimeActivated, false);
  assert.equal(result.smtpConfigured, false);
  assert.equal(result.templatesVerified, false);
  assert.equal(result.status, "CORE_PREPARED_CUSTOM_SMTP_REQUIRED");
  assert(result.pendingFields.every(key => Object.hasOwn(MAIL_TEMPLATES, key)));
  assert(!f.calls.find(c => c.method === "PATCH").body.mailer_templates_magic_link_content);
  assert(!JSON.stringify(result).includes("synthetic-private-provider-value"));
});
test("templates are prepared only after independent SMTP is configured", async () => {
  const f = fixture();
  f.setConfig({ smtp_host: "smtp.example.invalid", smtp_pass: "synthetic-private-smtp" });
  const result = await prepareProductionAuth({ ...f, apply: true });
  assert.equal(result.templatesVerified, true);
  assert.equal(result.nativeEmailDeliveryVerified, false);
  assert.equal(result.pendingFields.length, 0);
  assert(!JSON.stringify(result).includes("synthetic-private-smtp"));
});
test("wrong projects and unlocked deployment boundaries fail before provider requests", async () => {
  for (const ref of ["muvedavhbpgpdrrnjrih", "nktstksmfpcsjnjbeqsk"]) {
    const f = fixture(); f.plan.projectRef = ref;
    await assert.rejects(prepareProductionAuth({ ...f, apply: true })); assert.equal(f.calls.length, 0);
  }
  const f = fixture(); f.state.liveChangesApproved = true;
  await assert.rejects(prepareProductionAuth({ ...f, apply: true })); assert.equal(f.calls.length, 0);
});
test("unknown secret fields and weakened policy cannot enter the patch", async () => {
  for (const patch of [{ smtp_pass: "synthetic-not-a-real-key" }, { disable_signup: false }]) {
    const f = fixture(); Object.assign(f.plan.proposedAuthConfig, patch);
    await assert.rejects(prepareProductionAuth({ ...f, apply: true })); assert.equal(f.calls.length, 0);
  }
});
test("unexpected native capabilities stop before mutation", async () => {
  for (const patch of [{ external_anonymous_users_enabled: true }, { mfa_phone_verify_enabled: true },
    { mailer_otp_length: undefined }]) {
    const f = fixture(); f.setConfig(patch);
    await assert.rejects(prepareProductionAuth({ ...f, apply: true }));
    assert(f.calls.every(c => c.method === "GET"));
  }
});
test("unchanged configured policy is idempotent and unrelated readback drift is rejected", async () => {
  const f = fixture(); await prepareProductionAuth({ ...f, apply: true });
  f.calls.length = 0;
  await prepareProductionAuth({ ...f, apply: true }); assert(f.calls.every(c => c.method === "GET"));
  const g = fixture(), request = g.request;
  g.request = async (...args) => {
    const result = await request(...args);
    if (args[0] === "PATCH") g.setConfig({ protected_value: "synthetic-drift" });
    return result;
  };
  await assert.rejects(prepareProductionAuth({ ...g, apply: true }));
});
test("diagnostics expose static check codes and HTTP status, never arbitrary private errors", () => {
  assert.equal(safeProductionFailure(Error("PRODUCTION_AUTH_HTTP_403")), "PROVIDER_HTTP_403");
  assert.equal(safeProductionFailure(Error("Auth policy/template readback mismatch.")), "POLICY_READBACK_MISMATCH");
  assert.equal(safeProductionFailure(Error("synthetic-private-credential")), "PRIVATE_FAILURE_DETAILS_SUPPRESSED");
});

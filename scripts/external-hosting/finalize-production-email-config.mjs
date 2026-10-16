import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { SMTP_POLICY } from "./supabase-production-mail.mjs";
const ref = "qcgvhlphalxqzzsxqjhi", origin = "https://qxlayer-acceptance-vynox3.vercel.app";
assert.equal(process.env.VYNOX_PRODUCTION_EMAIL_CONFIGURATION_APPROVED, "true");
const headers = { Authorization: `Bearer ${process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SETUP_TOKEN}`,
  "Content-Type": "application/json" };
const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
async function call(method, body) {
  const r = await fetch(url, { method, headers, redirect: "error", signal: AbortSignal.timeout(25000),
    ...(body ? { body: JSON.stringify(body) } : {}) });
  assert(r.ok, `Pinned email configuration HTTP ${r.status}`); return r.json();
}
try {
  const before = await call("GET");
  assert(Object.entries(SMTP_POLICY).every(([key, value]) => String(before[key]) === String(value)));
  assert(before.smtp_pass && before.disable_signup && !before.mailer_autoconfirm &&
    before.mfa_totp_enroll_enabled && before.mfa_totp_verify_enabled);
  const redirects = new Set((before.uri_allow_list ?? "").split(",").filter(Boolean));
  redirects.add(`${origin}/verify-email`); redirects.add(`${origin}/reset-password`);
  const patch = { site_url: origin, uri_allow_list: [...redirects].join(",") };
  if (Object.entries(patch).some(([k,v]) => before[k] !== v)) await call("PATCH", patch);
  const after = await call("GET");
  assert(Object.entries(patch).every(([k,v]) => after[k] === v));
  assert(Object.keys(before).every(k => Object.hasOwn(patch,k) || JSON.stringify(before[k]) === JSON.stringify(after[k])));
  // The Production mail flag stays false until genuine delivery/ownership proof.
  // No legacy, Development or Staging sender is copied into this runtime.
  const report = { projectPinned: true, productionSmtpConfigured: true, templatesRetained: true,
    protectedAcceptanceEmailOriginConfigured: true, canonicalRedirectsRetained: true,
    signupDisabled: after.disable_signup, emailConfirmationRequired: !after.mailer_autoconfirm,
    totpEnrollmentAndVerificationEnabled: after.mfa_totp_enroll_enabled && after.mfa_totp_verify_enabled,
    unrelatedSettingsPreserved: true, deliveryReadinessNotSilentlyEnabled: true,
    identityMigrationExecuted: false, publicLiveChanged: false, dnsChanged: false };
  await mkdir("generated-artifacts/external-finalization", { recursive: true });
  await writeFile("generated-artifacts/external-finalization/production-email-configuration.json",JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} catch {
  console.error("Pinned Production email configuration failed; private provider details suppressed.");
  process.exitCode = 1;
}

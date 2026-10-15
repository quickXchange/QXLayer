import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { prepareProductionAuth, PRODUCTION_REF, MAIL_TEMPLATES, safeProductionFailure } from "./supabase-production-auth-preparation.mjs";
import { checkProductionSmtp } from "./supabase-production-smtp-check.mjs";

export const SMTP_POLICY = {
  smtp_host: "smtp.resend.com", smtp_port: "465", smtp_user: "resend",
  smtp_admin_email: "production-auth@quicklychan.xyz",
  smtp_sender_name: "VYNOX LAYER Production", rate_limit_email_sent: 30,
};

export async function prepareProductionMail({ plan, state, request, smtpKey, otherKeys = [],
  checkKeyPermission, checkSmtp, apply = false }) {
  const core = await prepareProductionAuth({ plan, state, request, apply: false });
  assert(core.pendingFields.every(key => Object.hasOwn(MAIL_TEMPLATES, key)), "CORE_POLICY_NOT_PREPARED");
  const path = `/projects/${PRODUCTION_REF}/config/auth`;
  const before = await request("GET", path);
  assert(Object.keys(SMTP_POLICY).every(key => Object.hasOwn(before, key)), "SMTP_FIELDS_UNSUPPORTED");
  if (apply) {
    assert(/^re_[A-Za-z0-9_-]{20,200}$/.test(smtpKey ?? "") &&
      !otherKeys.filter(Boolean).map(key => key.trim()).includes(smtpKey), "SMTP_KEY_MISSING_OR_REUSED");
    assert(await checkKeyPermission(smtpKey), "SEND_ONLY_PERMISSION_NOT_CONFIRMED");
    const smtpProof = await checkSmtp(smtpKey);
    assert(smtpProof.smtpAuthenticated === true && smtpProof.senderEnvelopeAccepted === true &&
      smtpProof.tlsVerified === true && smtpProof.messageSent === false, "SMTP_PROOF_INCOMPLETE");
    // Never compare opaque provider password readback to the supplied credential.
    // Avoid rewriting existing SMTP automatically on a second execution.
    const matches = Object.entries(SMTP_POLICY).every(([key, value]) => String(before[key]) === String(value));
    assert(!before.smtp_pass || matches, "EXISTING_SMTP_REVIEW_REQUIRED");
    if (!matches || !before.smtp_pass) await request("PATCH", path, { ...SMTP_POLICY, smtp_pass: smtpKey });
  }
  const after = await request("GET", path);
  const configured = Object.entries(SMTP_POLICY).every(([key, value]) => String(after[key]) === String(value)) &&
    !!after.smtp_pass;
  if (apply) {
    assert(configured, "SMTP_READBACK_MISMATCH");
    const all = new Set([...Object.keys(before), ...Object.keys(after)]);
    assert([...all].every(key => Object.hasOwn(SMTP_POLICY, key) || key === "smtp_pass" ||
      JSON.stringify(before[key]) === JSON.stringify(after[key])), "SMTP_UNRELATED_SETTING_CHANGED");
  }
  return { projectRef: PRODUCTION_REF, environment: "production", smtpConfigured: configured,
    applied: apply, sendOnlyPermissionConfirmed: apply, smtpAuthenticated: apply,
    senderEnvelopeAccepted: apply, tlsVerified: apply, messageSent: false,
    requestedDomainRestriction: "quicklychan.xyz", domainRestrictionIndependentlyVerified: false,
    unrelatedSettingsPreserved: apply, nativeEmailDeliveryVerified: false,
    accountsCreatedOrMigrated: false, liveModified: false, republished: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const mode = process.argv[2] ?? "verify";
    assert(["verify", "configure"].includes(mode), "SMTP_MODE_INVALID");
    const apply = mode === "configure";
    assert(!apply || process.env.QXLAYER_ISOLATED_PRODUCTION_AUTH_PREPARATION_APPROVED === "true", "SMTP_APPROVAL_REQUIRED");
    assert(process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0", "SMTP_TLS_REQUIRED");
    const token = process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SETUP_TOKEN;
    assert(token, "SMTP_SETUP_TOKEN_MISSING");
    const request = async (method, path, body) => {
      assert(method === "GET" && [`/projects/${PRODUCTION_REF}`, `/projects/${PRODUCTION_REF}/config/auth`].includes(path) ||
        apply && method === "PATCH" && path === `/projects/${PRODUCTION_REF}/config/auth`, "SMTP_SCOPE_MISMATCH");
      if (body) assert(Object.keys(body).every(key => Object.hasOwn(SMTP_POLICY, key) || key === "smtp_pass"), "SMTP_PATCH_FIELDS_INVALID");
      const r = await fetch(`https://api.supabase.com/v1${path}`, {
        method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: "error", signal: AbortSignal.timeout(30000),
      });
      assert(r.ok, `PRODUCTION_AUTH_HTTP_${r.status}`);
      return r.json();
    };
    const report = await prepareProductionMail({
      plan: JSON.parse(await readFile("deploy/production-supabase-auth-bootstrap.json", "utf8")),
      state: JSON.parse(await readFile(".local/free-production-provisioning.json", "utf8")),
      request, smtpKey: process.env.QXLAYER_PRODUCTION_RESEND_SMTP_KEY?.trim(),
      otherKeys: [process.env.QXLAYER_DEVELOPMENT_RESEND_SMTP_KEY,
        process.env.QXLAYER_STAGING_RESEND_SETUP_KEY, token],
      apply, checkSmtp: checkProductionSmtp,
      checkKeyPermission: async key => {
        const r = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${key}` },
          redirect: "error", signal: AbortSignal.timeout(20000),
        });
        // A send-only key must be denied management access, not merely invalid.
        if (![401, 403].includes(r.status)) return false;
        const data = await r.json().catch(() => null);
        return data?.name === "restricted_api_key";
      },
    });
    await mkdir("generated-artifacts/auth-security", { recursive: true });
    await writeFile("generated-artifacts/auth-security/production-smtp-readback.json",
      JSON.stringify({ ...report, capturedAt: new Date().toISOString() }, null, 2) + "\n");
    console.log(JSON.stringify(report));
  } catch (error) {
    const codes = new Set(["CORE_POLICY_NOT_PREPARED", "SMTP_FIELDS_UNSUPPORTED",
      "SMTP_KEY_MISSING_OR_REUSED", "SEND_ONLY_PERMISSION_NOT_CONFIRMED", "SMTP_PROOF_INCOMPLETE",
      "EXISTING_SMTP_REVIEW_REQUIRED", "SMTP_READBACK_MISMATCH", "SMTP_UNRELATED_SETTING_CHANGED",
      "SMTP_MODE_INVALID", "SMTP_APPROVAL_REQUIRED", "SMTP_TLS_REQUIRED", "SMTP_SETUP_TOKEN_MISSING",
      "SMTP_SCOPE_MISMATCH", "SMTP_PATCH_FIELDS_INVALID", "SMTP_CONNECTION_FAILED",
      "SMTP_AUTH_OR_ENVELOPE_FAILED", "SMTP_TLS_FAILED"]);
    const code = codes.has(error?.message) ? error.message : safeProductionFailure(error);
    await mkdir(".local", { recursive: true }).then(() => writeFile(
      ".local/production-smtp-diagnostic.json", JSON.stringify({ code, credentialDetailsStored: false,
        capturedAt: new Date().toISOString() }) + "\n", { mode: 0o600 })).catch(() => {});
    console.error(`Production SMTP preparation stopped (${code}); private errors suppressed. No activation or publishing.`);
    process.exitCode = 1;
  }
}

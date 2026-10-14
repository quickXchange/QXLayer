// Development-only OTP template / bounded SMTP quota. No account or factor writes.
const ref = "nktstksmfpcsjnjbeqsk";
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.QXLAYER_DEVELOPMENT_EMAIL_LOGIN_APPROVED !== "true" ||
    process.env.NODE_ENV !== "development" || process.env.QXLAYER_EXTERNAL_ENVIRONMENT !== "development" ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF !== ref ||
    !/^https:\/\/[a-z0-9.-]+\.replit\.dev$/.test(origin) ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL !== origin)
  throw Error("Explicit pinned Development email-login approval is required.");
const token = process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SETUP_TOKEN;
if (!token) throw Error("Development-only setup authorization is missing.");
async function request(body) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: body ? "PATCH" : "GET", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw Error(`Development email-login configuration failed (${r.status}).`);
  return r.json();
}
const before = await request();
if (before.site_url !== origin || before.mailer_autoconfirm !== false ||
    !before.mfa_totp_enroll_enabled || !before.mfa_totp_verify_enabled || !before.smtp_host)
  throw Error("Development email/MFA safety settings differ.");
const changes = {
  mailer_otp_length: 6,
  rate_limit_email_sent: 30,
  mailer_subjects_magic_link: "Your VYNOX LAYER Development sign-in code",
  mailer_templates_magic_link_content: '<h2>VYNOX LAYER Development</h2><p>Your sign-in code is:</p><p style="font-size:28px;font-weight:bold">{{ .Token }}</p><p>Enter it in the Development login page within 5 minutes. It can be used once. Google Authenticator is required next. Do not share this code.</p><p>If you did not request this, ignore this email. This is not a password reset and does not remove your existing MFA.</p>',
};
if (Object.entries(changes).some(([key, value]) => before[key] !== value)) await request(changes);
const after = await request();
for (const [key, value] of Object.entries(changes))
  if (after[key] !== value) throw Error(`Development readback differs for ${key}.`);
const aliases = {
  mailer_subjects_custom_contents: { MAILER_SUBJECTS_MAGIC_LINK: true },
  mailer_templates_custom_contents: { MAILER_TEMPLATES_MAGIC_LINK_CONTENT: true },
};
for (const [key, expected] of Object.entries(aliases)) {
  for (const [field, value] of Object.entries(after[key] ?? {})) {
    if (field in expected) {
      if (value !== expected[field]) throw Error(`Development derived template readback differs: ${field}.`);
    } else if (JSON.stringify(value) !== JSON.stringify(before[key]?.[field]))
      throw Error(`Unrelated Development mail template changed: ${field}.`);
  }
}
for (const key of Object.keys(before))
  if (!(key in changes) && !(key in aliases) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    throw Error(`Unrelated Development setting changed: ${key}.`);
// Login challenge expiry is enforced by the app. Preserve existing confirmation
// and password-recovery link lifetimes rather than shortening them globally.
console.log(JSON.stringify({ developmentOnly: true, otpLength: 6, smtpMessagesPerHour: 30,
  applicationLoginCodeLifetimeSeconds: 300, otherSettingsPreserved: true,
  existingConfirmationAndRecoveryExpiryPreserved: true }));

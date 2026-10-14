// Explicitly authorized, two-field Development policy update. Never logs secrets.
const ref = "nktstksmfpcsjnjbeqsk";
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.QXLAYER_DEVELOPMENT_PASSWORD_POLICY_APPROVED !== "true" ||
    process.env.NODE_ENV !== "development" || process.env.QXLAYER_EXTERNAL_ENVIRONMENT !== "development" ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF !== ref ||
    !/^https:\/\/[a-z0-9.-]+\.replit\.dev$/.test(origin) ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL !== origin)
  throw Error("Explicit pinned Development password-policy approval is required.");
const token = process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SETUP_TOKEN;
if (!token) throw Error("Development-only setup authorization is missing.");
const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
async function request(body) {
  const r = await fetch(url, { method: body ? "PATCH" : "GET", redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw Error(`Development password-policy operation failed (${r.status}).`);
  return r.json();
}
const before = await request();
if (before.site_url !== origin || before.mailer_autoconfirm !== false ||
    before.mfa_totp_enroll_enabled !== true || before.mfa_totp_verify_enabled !== true)
  throw Error("Existing Development email/MFA safety settings differ.");
// GoTrue expects disjoint literal character sets, not symbolic class names.
const expected = { password_min_length: 10,
  password_required_characters: "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789" };
await request(expected);
const after = await request();
for (const [key, value] of Object.entries(expected))
  if (after[key] !== value) throw Error(`Development policy readback differs for ${key}.`);
for (const key of Object.keys(before))
  if (!(key in expected) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    throw Error(`An unrelated Development setting changed: ${key}. Review before proceeding.`);
console.log(JSON.stringify({ developmentOnly: true, minimum: 10, uppercase: true, lowercase: true,
  numbers: true, specialCharactersRequired: false, otherAuthSettingsPreserved: true }));

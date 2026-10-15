// Bounded native HTTP acceptance using ONLY the tracked non-admin QA broker.
// No credentials, email links or token hashes are printed or written.
if (process.env.NODE_ENV !== "development" ||
    process.env.QXLAYER_EXTERNAL_ENVIRONMENT !== "development" ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF !== "nktstksmfpcsjnjbeqsk" ||
    !process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev"))
  throw Error("Pinned Development runtime required.");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`, broker = "http://127.0.0.1:9384";
const fixture = await (await fetch(`${broker}/fixture`)).json();
const currentPassword = process.argv.includes("--password-already-reset") ? `${fixture.password}-reset` : fixture.password;
if (!fixture.subject || !fixture.name?.startsWith("Disposable Development QA "))
  throw Error("Tracked disposable fixture required.");
const provider = "https://nktstksmfpcsjnjbeqsk.supabase.co/auth/v1";
const ph = { apikey: process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY, "Content-Type": "application/json" };
const check = await fetch(`${provider}/admin/users/${fixture.subject}`, { headers: ph, redirect: "error" });
const u = await check.json();
if (!check.ok || u.id !== fixture.subject || u.user_metadata?.name !== fixture.name)
  throw Error("Disposable custody check failed.");
// Retire only this fixture's prior test enrollment, never an official account.
for (const f of u.factors ?? []) {
  const r = await fetch(`${provider}/admin/users/${fixture.subject}/factors/${f.id}`, { method: "DELETE", headers: ph, redirect: "error" });
  if (!r.ok) throw Error(`Exact disposable factor reset failed (${r.status}).`);
}
const jar = new Map();
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
async function action(body, expected = 200, waited = false) {
  const r = await fetch(`${origin}/api/supabase-auth/action`, { method: "POST", redirect: "error",
    headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie() }, body: JSON.stringify(body) });
  for (const c of r.headers.getSetCookie()) {
    const p = c.split(";")[0], i = p.indexOf("="); jar.set(p.slice(0, i), p.slice(i + 1));
  }
  const data = await r.json();
  if (r.status === 429 && !waited) {
    // Respect the real rate limit. Do not disable it or remove its database rows.
    await new Promise(resolve => setTimeout(resolve, 65000));
    return action(body, expected, true);
  }
  if (r.status !== expected) throw Error(`Native ${body.action} returned ${r.status}; expected ${expected}. Private payload omitted.`);
  return data;
}
async function status(path, expected) {
  const r = await fetch(`${origin}${path}`, { headers: { Cookie: cookie() }, redirect: "error" });
  if (r.status !== expected) throw Error(`Status ${path}: ${r.status}, expected ${expected}.`);
}
await action({ action: "login", email: fixture.email, password: currentPassword });
await status("/api/me", 200); await status("/api/platform-management", 403);
const enroll = await action({ action: "mfa-enroll", currentPassword });
const code = async () => (await (await fetch(`${broker}/totp`, { method: "POST",
  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: enroll.secret }) })).json()).code;
await action({ action: "mfa-verify", code: await code(), factorId: enroll.factorId });
await action({ action: "logout" }); await status("/api/me", 401);
const login = await action({ action: "login", email: fixture.email, password: currentPassword });
if (!login.mfaRequired) throw Error("MFA requirement missing.");
await status("/api/me", 428);
await action({ action: "mfa-verify", code: "000000" }, 400);
await action({ action: "mfa-verify", code: await code() });
await status("/api/me", 200); await status("/api/platform-management", 403);
console.log(JSON.stringify({ passwordLoginPassed: true, customerAccessPassed: true, nonAdminDeniedAdmin: true,
  totpEnrollmentAndLoginPassed: true, wrongTotpRejected: true, pendingMfaDeniedBusinessAccess: true }));
const reset = await (await fetch(`${broker}/recovery-link`, { method: "POST" })).json();
if (!reset.url) throw Error("Disposable recovery token unavailable.");
await action({ action: "verify", token: new URL(reset.url).searchParams.get("token_hash"), tokenType: "recovery" });
await status("/api/me", 401);
await action({ action: "reset-password", password: "short" }, 400);
const password = `${currentPassword}-reset`;
await action({ action: "reset-password", password }, 428);
await action({ action: "mfa-verify", code: await code() }); await status("/api/me", 401);
await action({ action: "reset-password", password }); await status("/api/me", 401);
await action({ action: "login", email: fixture.email, password: currentPassword }, 401);
const next = await action({ action: "login", email: fixture.email, password });
if (!next.mfaRequired) throw Error("Password reset removed MFA.");
await action({ action: "mfa-verify", code: await code() });
await status("/api/me", 200); await status("/api/platform-management", 403);
await action({ action: "link-existing" }, 410);
await action({ action: "logout" }); await status("/api/me", 401);
for (const path of ["/api/auth/get-session", "/api/owned-auth/status", "/api/__clerk/v1/client"]) await status(path, 404);
console.log(JSON.stringify({ recoveryRequiresExistingMfa: true, recoveryDeniedBusinessBeforeAndAfterMfa: true,
  passwordResetPassed: true, oldPasswordRejected: true, mfaPreservedAfterPasswordReset: true,
  logoutRevokedAccess: true, retiredEndpointsRejected: true, testTokenIssuanceOnly: true, inboxDeliveryRetested: false,
  browserUiTested: false }));

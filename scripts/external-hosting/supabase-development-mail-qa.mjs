import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// No email links, passwords, provider response bodies or session tokens are logged.
const ref = "nktstksmfpcsjnjbeqsk";
if (process.env.QXLAYER_EXTERNAL_ENVIRONMENT !== "development" ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF !== ref ||
    !["development", "test"].includes(process.env.NODE_ENV ?? "") ||
    !process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev") ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL !== `https://${process.env.REPLIT_DEV_DOMAIN}`)
  throw Error("Pinned isolated Development runtime required.");
const key = process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY;
if (!key?.startsWith("sb_secret_")) throw Error("Development server authorization required.");
const path = new URL("../../.local/development-mail-qa-scope.json", import.meta.url);
const mode = process.argv[2];
if (!["begin", "status", "recover"].includes(mode)) throw Error("Use begin, status or recover.");
async function request(route, method = "GET", body) {
  const r = await fetch(`https://${ref}.supabase.co/auth/v1${route}`, {
    method, redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { apikey: key, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw Error(`Development mail QA request failed (${r.status}); inspect tracked scope before retrying.`);
  return r.status === 204 ? {} : r.json();
}
async function findEmail(email) {
  const matches = [];
  for (let page = 1; page <= 100; page++) {
    const { users } = await request(`/admin/users?page=${page}&per_page=100`);
    if (!Array.isArray(users)) throw Error("Invalid provider user list.");
    matches.push(...users.filter(u => u.email?.toLowerCase() === email));
    if (users.length < 100) return matches;
  }
  throw Error("Provider account scan exceeded bounded limit.");
}
if (mode === "begin") {
  const email = (process.argv[3] ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("A controlled unused test recipient is required.");
  if ((await findEmail(email)).length) throw Error("Recipient already exists. No account changed and no message sent.");
  const scope = { project: ref, email, marker: randomUUID(), startedAt: new Date().toISOString() };
  await mkdir(new URL(".", path), { recursive: true });
  await writeFile(path, JSON.stringify(scope), { flag: "wx", mode: 0o600 });
  // Random password is discarded; the recipient chooses a password through recovery.
  // Use native signup, never admin confirmation or admin-generated email links.
  const result = await request("/signup", "POST", {
    email, password: randomBytes(32).toString("base64url"),
    data: { name: "Disposable Development Mail QA", development_mail_qa: scope.marker },
  });
  const user = result.user ?? result;
  if (!user.id || user.user_metadata?.development_mail_qa !== scope.marker || user.email_confirmed_at)
    throw Error("Unexpected signup state; tracked scope retained for review.");
  scope.subject = user.id;
  scope.verificationRequestedAt = new Date().toISOString();
  await writeFile(path, JSON.stringify(scope), { mode: 0o600 });
  const persisted = JSON.parse(await readFile(path, "utf8"));
  if (persisted.subject !== user.id) throw Error("Fixture tracking readback failed.");
  console.log(JSON.stringify({ unusedRecipientChecked: true, disposableScopeTracked: true,
    nativeVerificationRequestAccepted: true, emailConfirmed: false, inboxReceiptVerified: false }));
} else {
  const scope = JSON.parse(await readFile(path, "utf8"));
  if (scope.project !== ref || !scope.marker) throw Error("Invalid tracked Development scope.");
  const matches = await findEmail(scope.email);
  if (matches.length !== 1) throw Error("Disposable account match is missing or ambiguous.");
  const user = matches[0];
  if ((scope.subject && scope.subject !== user.id) ||
      user.user_metadata?.development_mail_qa !== scope.marker ||
      Date.parse(user.created_at) < Date.parse(scope.startedAt) - 5000)
    throw Error("Disposable identity custody mismatch.");
  if (!scope.subject) {
    scope.subject = user.id;
    await writeFile(path, JSON.stringify(scope), { mode: 0o600 });
  }
  if (mode === "recover") {
    if (!user.email_confirmed_at) throw Error("Native email verification must finish before recovery.");
    if (scope.recoveryRequestedAt) throw Error("Recovery was already requested; do not spend another send.");
    // Persist intent before sending so ambiguous failures cannot silently resend.
    scope.recoveryRequestedAt = new Date().toISOString();
    await writeFile(path, JSON.stringify(scope), { mode: 0o600 });
    await request("/recover", "POST", { email: scope.email });
    console.log(JSON.stringify({ nativeRecoveryRequestAccepted: true, inboxReceiptVerified: false }));
  } else {
    console.log(JSON.stringify({ disposableScopeVerified: true, emailConfirmed: Boolean(user.email_confirmed_at),
      recoveryRequested: Boolean(scope.recoveryRequestedAt), verifiedTotpFactors:
        (user.factors ?? []).filter(f => f.factor_type === "totp" && f.status === "verified").length }));
  }
}

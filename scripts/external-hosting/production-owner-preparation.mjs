import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { sourceEnvironment } from "../release/production-business-backup.mjs";
const { Client } = createRequire(new URL("../../lib/db/package.json", import.meta.url))("pg");
const hash = x => createHash("sha256").update(x).digest("hex");
const target = "qcgvhlphalxqzzsxqjhi";
const folder = "generated-artifacts/external-finalization";
let stage = "original-identity";
export async function loadOriginalOwnerAndVerifiedRecipient() {
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "Verified provider transport required");
  const protectedManifest = JSON.parse(await readFile("generated-artifacts/auth-security/protected-production-administrator-manifest.json"));
  assert.equal(protectedManifest.administrators.length, 1);
  const original = protectedManifest.administrators[0];
  const tools = "/nix/store/" + (await readdir("/nix/store")).find(x => x.endsWith("-postgresql-17.6")) + "/bin";
  const env = sourceEnvironment(process.env.QXLAYER_EXPORT_DATABASE_URL, process.env.QXLAYER_EXPORT_EXPECTED_HOST, tools);
  const sql = `BEGIN READ ONLY; SET LOCAL app.is_super_admin='true';
    SELECT coalesce(json_agg(a),'[]'::json)::text FROM public.platform_admins a WHERE active; ROLLBACK;`;
  const raw = execFileSync(`${tools}/psql`, ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const admins = JSON.parse(raw.split("\n").find(x => x.startsWith("[")));
  const candidates = admins.filter(a => hash(a.clerk_user_id) === original.canonicalBusinessIdSha256);
  assert.equal(candidates.length, 1, "Original immutable business identity must still be active");
  const owner = candidates[0];
  stage = "original-linked-identity";
  const development = new Client({ connectionString: process.env.DATABASE_URL });
  let link;
  let productionIdentityLinkAlreadyProven = false;
  await development.connect();
  try {
    await development.query("BEGIN READ ONLY");
    const links = await development.query("SELECT subject,business_id,proof_subject FROM vynox_supabase_auth.identity_links WHERE business_id=$1", [owner.clerk_user_id]);
    assert(links.rowCount <= 1);
    if (links.rowCount === 1) {
      link = links.rows[0];
      productionIdentityLinkAlreadyProven = true;
    } else {
      // A verified Development Owner may receive a delivery diagnostic, but
      // their different identity MUST NOT silently become the Production Owner.
      await development.query("SELECT set_config('app.is_super_admin','true',true)");
      const recipients = await development.query(`SELECT l.subject,l.business_id,l.proof_subject
        FROM vynox_supabase_auth.identity_links l JOIN public.platform_admins p ON p.clerk_user_id=l.business_id
        WHERE p.active`);
      assert.equal(recipients.rowCount, 1, "One verified existing Owner required for the mail-only diagnostic");
      link = recipients.rows[0];
    }
  } finally { await development.query("ROLLBACK").catch(() => {}); await development.end(); }
  assert(/^[a-f0-9-]{36}$/i.test(link.subject));
  const native = await fetch(`https://nktstksmfpcsjnjbeqsk.supabase.co/auth/v1/admin/users/${link.subject}`, {
    headers: { apikey: process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY,
      Authorization: `Bearer ${process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY}` },
    redirect: "error", signal: AbortSignal.timeout(20000) });
  assert(native.ok);
  const user = await native.json();
  assert.equal(user.id, link.subject);
  assert(user.email_confirmed_at && /^[^@\s]+@gmail\.com$/i.test(user.email),
    "Require the confirmed original Gmail identity, never a caller-supplied email");
  const factors = (user.factors ?? []).filter(f => f.factor_type === "totp" && f.status === "verified");
  assert(factors.length > 0, "Existing source authenticator must remain protected");
  return { owner, user, original, factors, productionIdentityLinkAlreadyProven };
}
async function main() {
  const { owner, user, original, factors, productionIdentityLinkAlreadyProven } =
    await loadOriginalOwnerAndVerifiedRecipient();
  stage = "target-preservation";
  const headers = { apikey: process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY,
    Authorization: `Bearer ${process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY}` };
  const users = await fetch(`https://${target}.supabase.co/auth/v1/admin/users?page=1&per_page=100`, { headers });
  assert(users.ok);
  const directory = await users.json();
  assert.equal(directory.users.length, 0, "Existing target identities require reconciliation, never overwrite");
  const report = { originalBusinessIdentityVerified: true, originalRole: original.role,
    originalActive: owner.active, canonicalBusinessIdSha256: hash(owner.clerk_user_id),
    productionIdentityLinkAlreadyProven, deliveryRecipientIsVerifiedDevelopmentOwner: true,
    deliveryRecipientEmailConfirmed: true, deliveryRecipientIsGmail: true,
    deliveryRecipientVerifiedTotpFactors: factors.length, sourceFactorsUnchanged: true,
    originalProductionNativeEmailAndFactorsIndependentlyRead: false,
    targetUsersBefore: 0, irreversibleMigrationExecuted: false,
    migrationPlan: { preserveOriginalBusinessId: true, copyExactActiveAdministratorRow: true,
      explicitTargetIdentityLink: true, inferRolesFromEmail: false, substituteOwner: false,
      copyPasswordOrMfaCiphertext: false, originalSourceAccessUnchanged: true,
      newTargetTotpEnrollmentRequired: true, migrationRequiresExplicitApproval: true,
      differentDevelopmentIdentityMustNotBeSilentlyPromoted: !productionIdentityLinkAlreadyProven,
      originalOwnerGmailBindingRequiresExplicitConfirmation: !productionIdentityLinkAlreadyProven },
    liveChanged: false, dnsChanged: false };
  if (process.argv.includes("--send-delivery-test")) {
    stage = "gmail-delivery-send";
    const key = process.env.QXLAYER_PRODUCTION_RESEND_SMTP_KEY?.trim();
    assert(key && key !== process.env.QXLAYER_DEVELOPMENT_RESEND_SMTP_KEY);
    const sent = await fetch("https://api.resend.com/emails", { method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        "Idempotency-Key": `vynox-production-owner-mail-check-${hash(owner.clerk_user_id).slice(0,16)}-20261016` },
      body: JSON.stringify({ from: "VYNOX LAYER Production <production-auth@quicklychan.xyz>",
        to: [user.email], subject: "VYNOX LAYER Production email delivery verification",
        text: "This is the authorized VYNOX LAYER Production email delivery check. No account has been created, migrated, or modified. This message contains no login link, password, or verification code. Existing account access and authenticator settings remain unchanged." }),
      redirect: "error", signal: AbortSignal.timeout(25000) });
    assert(sent.ok, `Mail send HTTP ${sent.status}`);
    report.deliveryTest = { messageId: (await sent.json()).id, sentToVerifiedExistingOwnerGmail: true,
      actualDeliveryVerified: false, noAuthenticationCodeSent: true };
  }
  await mkdir(folder, { recursive: true });
  await writeFile(`${folder}/production-owner-auth-preparation.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  console.error(JSON.stringify({ blockedAt: stage, code: error.code ?? "ASSERTION", privateDetailsSuppressed: true }));
  process.exitCode = 1;
});

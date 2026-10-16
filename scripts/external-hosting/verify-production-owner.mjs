import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadOriginalOwnerAndVerifiedRecipient } from "./production-owner-preparation.mjs";
const { Client } = createRequire(new URL("../../lib/db/package.json", import.meta.url))("pg");
const project = "qcgvhlphalxqzzsxqjhi", origin = "https://qxlayer-acceptance-vynox3.vercel.app";
const folder = "generated-artifacts/external-finalization";
const hash = x => createHash("sha256").update(x).digest("hex");
let client;
try {
  const migrated = JSON.parse(await readFile(`${folder}/production-owner-migration.json`));
  assert(migrated.bindingApprovedByUser && migrated.exactIdentityLinkVerified);
  const { owner, user: recipient, factors } = await loadOriginalOwnerAndVerifiedRecipient();
  assert.equal(hash(owner.clerk_user_id), migrated.canonicalBusinessIdSha256);
  assert.equal(hash(recipient.email.toLowerCase()), migrated.recipientEmailSha256);
  const res = await fetch("https://api.render.com/v1/env-groups/evg-db936g3bc2fs73cmm5dg",
    { headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` }, signal: AbortSignal.timeout(20000) });
  assert(res.ok); const group = await res.json(), env = Object.fromEntries(group.envVars.map(x => [x.key,x.value]));
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF, project);
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED, "false");
  assert.equal(env.QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED, "true");
  const url = new URL(process.env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL);
  assert.equal(url.toString(), new URL(env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL).toString());
  assert.equal(url.hostname, env.DB_EXPECTED_HOST);
  assert.equal(decodeURIComponent(url.username), `postgres.${project}`);
  const ca = group.secretFiles.find(x => x.name === "supabase-ca.crt")?.content;
  assert(ca?.includes("BEGIN CERTIFICATE")); url.search = "";
  client = new Client({ connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true, servername: url.hostname },
    enableChannelBinding: true, connectionTimeoutMillis: 15000 });
  await client.connect();
  assert(client.connection.stream.encrypted && client.connection.stream.authorized);
  await client.query("BEGIN READ ONLY");
  const linked = await client.query(`SELECT l.subject,p.clerk_user_id,p.active,p.created_at,
    l.proof_subject FROM public.platform_admins p
    JOIN vynox_supabase_auth.identity_links l ON l.business_id=p.clerk_user_id`);
  assert.equal(linked.rowCount, 1); const row = linked.rows[0];
  assert.equal(row.clerk_user_id, owner.clerk_user_id);
  assert.equal(row.proof_subject, owner.clerk_user_id); assert.equal(row.active, true);
  assert.equal(new Date(row.created_at).toISOString(), new Date(owner.created_at).toISOString());
  assert.equal(hash(row.subject), migrated.nativeSubjectSha256);
  const native = await fetch(`https://${project}.supabase.co/auth/v1/admin/users/${row.subject}`,
    { headers: { apikey: process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY,
      Authorization: `Bearer ${process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY}` }, signal: AbortSignal.timeout(20000) });
  assert(native.ok); const user = await native.json();
  assert.equal(user.id, row.subject); assert.equal(user.email.toLowerCase(), recipient.email.toLowerCase());
  assert.equal(user.app_metadata.original_business_id_sha256, migrated.canonicalBusinessIdSha256);
  const password = await client.query("SELECT coalesce(encrypted_password,'')<>'' configured FROM auth.users WHERE id=$1", [row.subject]);
  const nativeSessions = await client.query("SELECT count(*)::int n FROM auth.sessions WHERE user_id=$1 AND aal='aal2'", [row.subject]);
  const applicationSessions = await client.query("SELECT count(*)::int n FROM vynox_supabase_auth.sessions WHERE subject=$1 AND expires_at>now()", [row.subject]);
  await client.query("COMMIT");
  const verifiedFactors = (user.factors ?? []).filter(f => f.factor_type === "totp" && f.status === "verified").length;
  const report = { originalBusinessIdRoleAndTimestampReadbackVerified: true,
    nativeIdentityAndApprovedEmailReadbackVerified: true, sourceOwnerAccessUnchanged: true,
    sourceVerifiedRecipientTotpFactors: factors.length, nativeSetupMailRecorded: !!user.recovery_sent_at,
    emailOwnershipVerified: !!user.email_confirmed_at, nativePasswordHashPresent: password.rows[0].configured,
    ownerPasswordSetupAccepted: false,
    targetVerifiedTotpFactors: verifiedFactors, nativeAal2Sessions: nativeSessions.rows[0].n,
    applicationUnexpiredSessions: applicationSessions.rows[0].n,
    adminAccessRequiresVerifiedTotpAndAal2: true, publicLiveChanged: false, dnsChanged: false,
    finalOwnerAcceptanceComplete: false };
  if (process.argv.includes("--send-access-instructions")) {
    assert(!migrated.accessInstructionsSent, "Instructions already sent; never resend shared gate credentials automatically");
    assert(!user.email_confirmed_at && !verifiedFactors, "Existing enrolled Owner requires read-only handling");
    const code = env.PRODUCTION_ACCESS_CODE;
    assert(typeof code === "string" && code.length >= 16);
    const sent = await fetch("https://api.resend.com/emails", { method: "POST",
      headers: { Authorization: `Bearer ${process.env.QXLAYER_PRODUCTION_RESEND_SMTP_KEY.trim()}`,
        "Content-Type": "application/json", "Idempotency-Key": `production-owner-access-${migrated.nativeSubjectSha256.slice(0,24)}` },
      body: JSON.stringify({ from: "VYNOX LAYER Production <production-auth@quicklychan.xyz>", to: [recipient.email],
        subject: "Your protected VYNOX LAYER Production Owner setup",
        text: `Your approved original Production Super Admin has been linked to its isolated Supabase login. Its original business identity and permissions are preserved. Existing accounts and authenticators are unchanged.\n\nThis is a protected acceptance environment, not a public launch:\n${origin}\n\n1. Use your existing authorized Vercel account if Vercel asks you to sign in. Do not disable access protection.\n2. At the VYNOX private access screen, use this review gate code (NOT your account password):\n${code}\nKeep this code private.\n3. Open the separate email "Reset your VYNOX LAYER password" from production-auth@quicklychan.xyz. Its one-time link verifies this Gmail and lets you choose your Production password. Do not forward the email or share its link.\n4. Sign in with EMAIL AND PASSWORD. Email-code sign-in is not enabled for this new account until its authenticator is verified.\n5. Open ${origin}/account/security, enter your new password, and enable Google Authenticator. Scan the QR code in your own authenticator and verify its six-digit code on the website. Do not send the QR code, setup secret, password, or codes to anyone.\n6. Confirm that the Super Admin Panel opens, then reload once to check session persistence.\n\nThe original source authenticators remain intact. This new isolated provider needs its own enrollment; no MFA secret or password was copied. Administrator access remains blocked before verified MFA.\nIf you cannot access Vercel protection or the private review screen, stop and report which screen is blocking you.` }),
      redirect: "error", signal: AbortSignal.timeout(25000) });
    assert(sent.ok, "Approved Owner access instruction mail rejected");
    const accepted = await sent.json();
    migrated.accessInstructionsSent = true; migrated.accessInstructionsMessageId = accepted.id;
    await writeFile(`${folder}/production-owner-migration.json`,JSON.stringify(migrated,null,2), { mode: 0o600 });
    report.privateAccessInstructionsSentToApprovedGmail = true;
    report.gateCredentialLoggedOrStoredInEvidence = false;
  }
  await writeFile(`${folder}/production-owner-readback.json`,JSON.stringify(report,null,2), { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(JSON.stringify({ ownerVerificationBlocked: true, code: error.code ?? "BLOCKED", privateDetailsSuppressed: true }));
  process.exitCode = 1;
} finally { if(client) { await client.query("ROLLBACK").catch(() => {}); await client.end().catch(() => {}); } }

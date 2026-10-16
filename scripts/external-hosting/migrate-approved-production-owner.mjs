import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { loadOriginalOwnerAndVerifiedRecipient } from "./production-owner-preparation.mjs";
const { Client } = createRequire(new URL("../../lib/db/package.json", import.meta.url))("pg");
const project = "qcgvhlphalxqzzsxqjhi", groupId = "evg-db936g3bc2fs73cmm5dg";
const receipt = "generated-artifacts/external-finalization/production-owner-migration.json";
const hash = x => createHash("sha256").update(x).digest("hex");
let stage = "approval", client, subject, committing = false, committed = false, created = false;
const nativeHeaders = { apikey: process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY,
  Authorization: `Bearer ${process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY}`, "Content-Type": "application/json" };
async function native(path, method = "GET", body) {
  const r = await fetch(`https://${project}.supabase.co/auth/v1${path}`, { method, headers: nativeHeaders,
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: "error", signal: AbortSignal.timeout(25000) });
  assert(r.ok, `Native request HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}
try {
  assert.equal(process.env.VYNOX_ORIGINAL_PRODUCTION_OWNER_BINDING_APPROVED, "true");
  const { owner, user, factors } = await loadOriginalOwnerAndVerifiedRecipient();
  const preparation = JSON.parse(await readFile("generated-artifacts/external-finalization/production-owner-auth-preparation.json"));
  assert.equal(hash(owner.clerk_user_id), preparation.canonicalBusinessIdSha256);
  assert.equal(preparation.originalRole, "super_admin");
  stage = "pinned-target";
  const response = await fetch(`https://api.render.com/v1/env-groups/${groupId}`,
    { headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` }, signal: AbortSignal.timeout(20000) });
  assert(response.ok);
  const group = await response.json(), env = Object.fromEntries(group.envVars.map(x => [x.key,x.value]));
  assert(group.serviceLinks.some(x => x.id === "srv-db5b47qjnfac739s374g"));
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF, project);
  assert.equal(env.QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED, "true");
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED, "false");
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_MAIL_READY, "false");
  const url = new URL(process.env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL);
  assert.equal(url.toString(), new URL(env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL).toString());
  assert.equal(url.hostname, env.DB_EXPECTED_HOST);
  assert.equal(decodeURIComponent(url.username), `postgres.${project}`);
  const ca = group.secretFiles.find(x => x.name === "supabase-ca.crt")?.content;
  assert(ca?.includes("BEGIN CERTIFICATE"));
  url.search = "";
  client = new Client({ connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true, servername: url.hostname },
    enableChannelBinding: true, connectionTimeoutMillis: 15000, query_timeout: 30000 });
  await client.connect();
  assert(client.connection.stream.encrypted && client.connection.stream.authorized);
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["original-production-owner-binding"]);
  const previous = await client.query("SELECT count(*)::int n FROM public.platform_admins");
  const links = await client.query("SELECT count(*)::int n FROM vynox_supabase_auth.identity_links");
  assert.equal(previous.rows[0].n, 0, "Never replace an existing administrator");
  assert.equal(links.rows[0].n, 0, "Never replace an existing identity binding");
  const directory = await native("/admin/users?page=1&per_page=100");
  assert.equal(directory.users.length, 0, "Never replace an existing native user");
  const backup = JSON.parse(await readFile("generated-artifacts/external-finalization/production-initialization-backup.json"));
  assert(backup.remoteCiphertextReadbackVerified, "Retained encrypted backup required");
  stage = "native-identity-create";
  subject = randomUUID();
  const fresh = await native("/admin/users", "POST", { id: subject, email: user.email, email_confirm: false,
    app_metadata: { enrollment: "original-production-owner-explicitly-approved",
      original_business_id_sha256: hash(owner.clerk_user_id) },
    user_metadata: { name: user.user_metadata?.name ?? "Owner" } });
  assert.equal(fresh.id, subject);
  created = true;
  assert(!fresh.email_confirmed_at && !(fresh.factors ?? []).some(f => f.status === "verified"));
  stage = "exact-business-identity-binding";
  await client.query("INSERT INTO public.platform_admins(clerk_user_id,active,created_at) VALUES($1,$2,$3)",
    [owner.clerk_user_id, owner.active, owner.created_at]);
  await client.query("INSERT INTO vynox_supabase_auth.identity_links(subject,business_id,proof_subject) VALUES($1,$2,$3)",
    [subject, owner.clerk_user_id, owner.clerk_user_id]);
  const exact = await client.query(`SELECT p.clerk_user_id=$1 AND p.active=$2 AND p.created_at=$3::timestamptz
    AND l.subject=$4 AND l.proof_subject=$1 AS exact FROM public.platform_admins p
    JOIN vynox_supabase_auth.identity_links l ON l.business_id=p.clerk_user_id`, [owner.clerk_user_id,owner.active,owner.created_at,subject]);
  assert.equal(exact.rowCount, 1); assert.equal(exact.rows[0].exact, true);
  committing = true; await client.query("COMMIT"); committed = true;
  const report = { bindingApprovedByUser: true, originalBusinessIdPreserved: true, originalRolePreserved: true,
    originalAdministratorTimestampAndActiveStatePreserved: true, exactIdentityLinkVerified: true,
    nativeSubjectSha256: hash(subject), canonicalBusinessIdSha256: hash(owner.clerk_user_id),
    recipientEmailSha256: hash(user.email.toLowerCase()), migratedAdministrators: 1,
    emailConfirmed: false, sourceVerifiedRecipientFactorsUnchanged: factors.length,
    targetMfaPendingUserEnrollment: true, passwordsAndFactorsCopied: false,
    sourceAccountUnchanged: true, publicLiveChanged: false, dnsChanged: false, nativeEmailDeliveryVerified: false,
    createdAt: new Date().toISOString(), initialPasswordSetupMailRequested: false };
  await writeFile(receipt, JSON.stringify(report,null,2), { mode: 0o600 });
  stage = "native-password-setup-mail";
  // A provider-generated recovery link proves Gmail custody when redeemed.
  // No OTP, password, link token, or authenticator secret is generated/read by this operator.
  await native("/recover", "POST", { email: user.email });
  const readback = await native(`/admin/users/${subject}`);
  assert(readback.recovery_sent_at, "Provider must record the actual recovery send");
  report.initialPasswordSetupMailRequested = true;
  report.nativeRecoverySentRecorded = true;
  report.privateGateMatchesExistingWorkspaceCode = env.PRODUCTION_ACCESS_CODE === process.env.PRODUCTION_ACCESS_CODE;
  await writeFile(receipt, JSON.stringify(report,null,2), { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch (error) {
  if (client && !committed) await client.query("ROLLBACK").catch(() => {});
  // Ambiguous commits require reconciliation, NEVER deletion of a possibly linked Owner.
  if (created && !committing && !committed) {
    try { await native(`/admin/users/${subject}`, "DELETE"); }
    catch { stage = "operator-reconciliation-required"; }
  }
  console.error(JSON.stringify({ stoppedAt: stage, committed, commitOutcomeUncertain: committing && !committed,
    code: error.code ?? "BLOCKED", privateDetailsSuppressed: true }));
  process.exitCode = 1;
} finally { if (client) await client.end().catch(() => {}); }

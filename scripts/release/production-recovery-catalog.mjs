import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sourceEnvironment } from "./production-business-backup.mjs";

// Catalog supplement only: no passwords, business-row reads, role mutations or
// privilege restoration. Raw catalog values go only into private encryption.
export const catalogSql = `
BEGIN READ ONLY;
WITH RECURSIVE namespaces AS (
 SELECT oid,nspname,nspowner,nspacl FROM pg_namespace
 WHERE nspname IN ('public','vynox_supabase_auth')
), relations AS (
 SELECT c.oid,n.nspname,c.relname,c.relkind,c.relowner,c.relacl,
        c.relrowsecurity,c.relforcerowsecurity
 FROM pg_class c JOIN namespaces n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p','S','v','m')
), functions AS (
 SELECT p.oid,n.nspname,p.proname,oidvectortypes(p.proargtypes) AS arguments,p.proowner,p.proacl
 FROM pg_proc p JOIN namespaces n ON n.oid=p.pronamespace
), referenced_roles AS (
 SELECT nspowner AS oid FROM namespaces UNION SELECT relowner FROM relations
 UNION SELECT (aclexplode(nspacl)).grantee FROM namespaces
 UNION SELECT (aclexplode(relacl)).grantee FROM relations
 UNION SELECT proowner FROM functions UNION SELECT (aclexplode(proacl)).grantee FROM functions
), role_scope AS (
 SELECT oid FROM referenced_roles
 UNION SELECT CASE WHEN m.roleid=s.oid THEN m.member ELSE m.roleid END
 FROM pg_auth_members m JOIN role_scope s ON m.roleid=s.oid OR m.member=s.oid
), defaults AS (
 SELECT a.defaclrole,r.rolname,a.defaclnamespace,a.defaclobjtype,a.defaclacl
 FROM pg_default_acl a JOIN pg_roles r ON r.oid=a.defaclrole
 WHERE a.defaclnamespace IN (SELECT oid FROM namespaces)
 OR a.defaclnamespace=0 AND a.defaclrole IN (SELECT oid FROM referenced_roles)
)
SELECT jsonb_build_object(
 'sourceReadOnly',current_setting('transaction_read_only')='on',
 'schemas',(SELECT coalesce(jsonb_agg(to_jsonb(n)),'[]') FROM namespaces n),
 'relations',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM relations r),
 'functionAcls',(SELECT coalesce(jsonb_agg(to_jsonb(f)),'[]') FROM functions f),
 'rolesWithoutPasswords',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'oid',oid,'name',rolname,'superuser',rolsuper,'inherit',rolinherit,
   'createRole',rolcreaterole,'createDb',rolcreatedb,'login',rolcanlogin,
   'replication',rolreplication,'bypassRls',rolbypassrls)),'[]')
   FROM pg_roles WHERE oid IN (SELECT oid FROM role_scope)),
 'memberships',(SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') FROM pg_auth_members m
   WHERE roleid IN (SELECT oid FROM role_scope)
      OR member IN (SELECT oid FROM role_scope)),
 'defaultAcls',(SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]') FROM defaults d),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM pg_policies p
   WHERE schemaname IN ('public','vynox_supabase_auth'))
);
COMMIT;`;

async function capture() {
  assert(process.env.QXLAYER_READONLY_BUSINESS_BACKUP_APPROVED === "true", "CATALOG_CAPTURE_APPROVAL_REQUIRED");
  const dir = (await readdir("/nix/store")).find(n => /postgresql-17\.6$/.test(n));
  assert(dir, "EXISTING_LOCAL_TOOLS_REQUIRED");
  const tools = `/nix/store/${dir}/bin`;
  const env = sourceEnvironment(process.env.QXLAYER_EXPORT_DATABASE_URL, process.env.QXLAYER_EXPORT_EXPECTED_HOST, tools);
  const kit = resolve("scripts/recovery");
  for (const [name, expected] of [
    ["encrypted_backup.mjs", "ad161dd7bd5e4e03c7e21111ac49e0dee4180ae95b7c7ffa09a9dd6d3d131e3a"],
    ["encrypted_recovery.mjs", "e14c41de329db671731c2c0f944f19e074b386c9e11b5c833748ac693b75190f"],
  ]) assert(createHash("sha256").update(await readFile(`${kit}/${name}`)).digest("hex") === expected);
  const child = spawn(`${tools}/psql`, ["-X", "-qAt", "--no-password", "-v", "ON_ERROR_STOP=1"],
    { env, stdio: ["pipe", "pipe", "ignore"] });
  let raw = "";
  child.stdout.on("data", b => { raw += b; if (raw.length > 1048576) child.kill(); });
  const finished = new Promise((ok, fail) => {
    child.on("error", fail); child.on("close", code => code === 0 ? ok() : fail(Error("READONLY_CATALOG_DENIED")));
  });
  const timer = setTimeout(() => child.kill(), 60000);
  try { child.stdin.end(catalogSql); await finished; } finally { clearTimeout(timer); }
  const catalog = JSON.parse(raw);
  assert(catalog.sourceReadOnly === true && catalog.relations.length > 0);
  const bytes = Buffer.from(JSON.stringify(catalog));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const { seal } = await import(pathToFileURL(`${kit}/encrypted_backup.mjs`));
  const { authenticatedPlaintext } = await import(pathToFileURL(`${kit}/encrypted_recovery.mjs`));
  const file = await seal(Readable.from([bytes]), `vynox-recovery-catalog-${Date.now()}.qxb`, process.env.QXLAYER_BACKUP_PASSPHRASE);
  bytes.fill(0);
  const recovery = await authenticatedPlaintext(file, process.env.QXLAYER_BACKUP_PASSPHRASE, async chunks => {
    const hash = createHash("sha256");
    for await (const chunk of chunks) hash.update(chunk);
    assert(hash.digest("hex") === expectedHash);
  });
  return { status: "DESIGNATED_SOURCE_ENCRYPTED_RECOVERY_CATALOG_VERIFIED", encryptedCiphertextFile: file,
    ciphertextSha256: recovery.ciphertext_sha256,
    sourceReadOnlyVerified: true, rolesWithoutPasswords: true, schemaRelationAndDefaultAclsCaptured: true,
    functionAclsCaptured: true,
    roleMembershipsAndRlsCaptured: true, wholeEnvelopeAndCatalogHashVerified: true,
    productionAclRestoreExecuted: false, liveRuntimeBindingVerified: false, liveModified: false,
    note: "Separate read-only catalog snapshot; not an atomic full-provider backup or authorization to recreate managed roles." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let report;
  try { report = await capture(); }
  catch { report = { status: "RECOVERY_CATALOG_BLOCKED", liveModified: false, privateErrorsSuppressed: true }; process.exitCode = 1; }
  await mkdir("generated-artifacts/auth-security", { recursive: true });
  await writeFile("generated-artifacts/auth-security/production-recovery-catalog.json", JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ status: report.status, liveModified: false }));
}

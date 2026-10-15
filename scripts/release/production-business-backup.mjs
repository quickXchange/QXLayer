import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readdir, readFile, mkdtemp, mkdir, chmod, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

let phase = "INPUT_GUARDS";
let captureRecord;
let restoreFailureCode;
// Read-only designated-source capture. Only ciphertext is retained; restoration
// is exclusively into a disposable, socket-only LOCAL PostgreSQL cluster.
async function command(binary, args, env, input) {
  const child = spawn(binary, args, { env, stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  let privateError = "";
  child.stdout.on("data", b => { output += b; if (output.length > 65536) child.kill(); });
  child.stderr.on("data", b => { if (privateError.length < 16384) privateError += b; });
  const exit = new Promise((ok, fail) => {
    child.on("error", () => fail(Error("LOCAL_OR_SOURCE_COMMAND_FAILED")));
    child.on("close", code => {
      if (code === 0) return ok();
      const reason = /channel.binding/i.test(privateError) ? "CHANNEL_BINDING_UNAVAILABLE" :
        /certificate|sslmode|ssl.*error/i.test(privateError) ? "VERIFIED_TLS_CONNECTION_FAILED" :
        /password authentication|authentication failed/i.test(privateError) ? "SOURCE_AUTHENTICATION_DENIED" :
        /permission denied/i.test(privateError) ? "SOURCE_PERMISSION_DENIED" :
        /does not exist/i.test(privateError) ? "SOURCE_SCHEMA_OR_FUNCTION_UNAVAILABLE" : "LOCAL_OR_SOURCE_COMMAND_FAILED";
      fail(Error(reason));
    });
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 180000);
  try { child.stdin.end(input); await exit; return output.trim(); }
  finally { clearTimeout(timer); }
}

export function sourceEnvironment(urlString, expectedHost, tools) {
  const url = new URL(urlString);
  assert(["postgres:", "postgresql:"].includes(url.protocol) && expectedHost &&
    url.hostname === expectedHost && !["localhost", "127.0.0.1", "::1"].includes(url.hostname),
  "PINNED_EXPORT_SOURCE_REQUIRED");
  return { PATH: tools, LANG: "C", LC_ALL: "C",
    PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: "verify-full", PGSSLROOTCERT: "/etc/ssl/certs/ca-certificates.crt",
    PGSSLMINPROTOCOLVERSION: "TLSv1.2", PGCHANNELBINDING: "require",
    PGCONNECT_TIMEOUT: "15", PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=120000" };
}

export async function captureAndRestore({ restoreExisting = false } = {}) {
  assert(process.env.QXLAYER_READONLY_BUSINESS_BACKUP_APPROVED === "true", "BACKUP_APPROVAL_REQUIRED");
  const dir = (await readdir("/nix/store")).find(name => /postgresql-17\.6$/.test(name));
  assert(dir, "EXISTING_POSTGRES_TOOLS_REQUIRED");
  const tools = `/nix/store/${dir}/bin`;
  const source = restoreExisting ? undefined : sourceEnvironment(process.env.QXLAYER_EXPORT_DATABASE_URL,
    process.env.QXLAYER_EXPORT_EXPECTED_HOST, tools);
  const kit = resolve("scripts/recovery");
  for (const [name, hash] of [
    ["encrypted_backup.mjs", "ad161dd7bd5e4e03c7e21111ac49e0dee4180ae95b7c7ffa09a9dd6d3d131e3a"],
    ["encrypted_recovery.mjs", "e14c41de329db671731c2c0f944f19e074b386c9e11b5c833748ac693b75190f"],
  ]) assert(createHash("sha256").update(await readFile(join(kit, name))).digest("hex") === hash, "REVIEWED_CRYPTO_KIT_REQUIRED");
  const { seal } = await import(pathToFileURL(join(kit, "encrypted_backup.mjs")));
  const { authenticatedPlaintext } = await import(pathToFileURL(join(kit, "encrypted_recovery.mjs")));
  const manifest = JSON.parse(await readFile("generated-artifacts/auth-security/protected-production-administrator-manifest.json", "utf8"));
  const expected = manifest.administrators?.[0]?.legacyNativeIdSha256;
  assert(/^[a-f0-9]{64}$/.test(expected), "PROTECTED_ADMIN_BASELINE_REQUIRED");
  const ownerSql = `SELECT count(*) FROM public.platform_admins WHERE active AND encode(sha256(convert_to(clerk_user_id,'UTF8')),'hex')='${expected}'`;
  const psql = ["-X", "-qAt", "--no-password", "-v", "ON_ERROR_STOP=1"];
  const pass = process.env.QXLAYER_BACKUP_PASSPHRASE;
  assert(pass?.length >= 24, "INDEPENDENT_BACKUP_KEY_REQUIRED");
  let file, plaintextHash;
  if (restoreExisting) {
    captureRecord = JSON.parse(await readFile("generated-artifacts/auth-security/production-business-capture-private.json", "utf8"));
    assert(captureRecord.sourceReadOnlyVerified === true && captureRecord.sourceTlsVerified === true &&
      /^[a-f0-9]{64}$/.test(captureRecord.plaintextHash), "VERIFIED_CAPTURE_RECORD_REQUIRED");
    file = captureRecord.file; plaintextHash = captureRecord.plaintextHash;
  } else {
  phase = "PINNED_SOURCE_READONLY_TLS_AND_OWNER";
  assert(await command(join(tools, "psql"), psql, source, `BEGIN READ ONLY;${ownerSql};COMMIT;`) === "1", "SOURCE_ADMIN_BASELINE_MISMATCH");
  // pg_stat_ssl can describe an unencrypted proxy/backend hop rather than this
  // client's verified TLS connection. Inspect libpq's own connection instead.
  const tlsReadback = await command(join(tools, "psql"), psql, source,
    "\\conninfo\nBEGIN READ ONLY;SELECT current_setting('transaction_read_only')='on';COMMIT;\n");
  assert(/SSL connection \(protocol: TLSv1\.[23]/.test(tlsReadback) &&
    tlsReadback.split("\n").at(-1) === "t", "READONLY_VERIFIED_TLS_REQUIRED");
  phase = "READONLY_CAPTURE_AND_ENCRYPTION";
  const child = spawn(join(tools, "pg_dump"), ["-Fc", "--no-password", "--no-owner", "--no-acl",
    "--schema=public", "--schema=vynox_supabase_auth"], { env: source, stdio: ["ignore", "pipe", "ignore"] });
  let exportCode;
  const finished = new Promise((ok, fail) => {
    child.on("error", () => fail(Error("READONLY_EXPORT_FAILED")));
    child.on("close", code => { exportCode = code; ok(); });
  });
  const hash = createHash("sha256");
  const hashing = new Transform({ transform(chunk, _encoding, done) { hash.update(chunk); done(null, chunk); } });
  child.stdout.pipe(hashing);
  try {
    file = await seal(hashing, `vynox-business-${Date.now()}.qxb`, pass);
    await finished;
    assert(exportCode === 0, "READONLY_EXPORT_FAILED");
  } catch {
    child.kill(); if (file) await rm(file, { force: true });
    throw Error("READONLY_EXPORT_OR_ENCRYPTION_FAILED");
  }
  plaintextHash = hash.digest("hex");
  captureRecord = { file, plaintextHash, sourceReadOnlyVerified: true, sourceTlsVerified: true };
  await mkdir("generated-artifacts/auth-security", { recursive: true });
  await writeFile("generated-artifacts/auth-security/production-business-capture-private.json",
    JSON.stringify(captureRecord) + "\n", { mode: 0o600 });
  }
  phase = "ISOLATED_LOCAL_CLUSTER";
  const root = await mkdtemp(join(tmpdir(), "vynox-private-restore-"));
  await chmod(root, 0o700); await mkdir(join(root, "socket"), { mode: 0o700 });
  const local = { PATH: tools, LANG: "C", LC_ALL: "C", HOME: root,
    PGHOST: join(root, "socket"), PGPORT: "55459", PGUSER: "restore_operator", PGDATABASE: "postgres" };
  let started = false;
  try {
    await command(join(tools, "initdb"), ["-D", join(root, "data"), "--username=restore_operator",
      "--auth-local=trust", "--auth-host=reject", "--encoding=UTF8", "--no-locale"], local);
    await command(join(tools, "pg_ctl"), ["-D", join(root, "data"), "-l", join(root, "server.log"), "-o",
      `-c listen_addresses='' -c unix_socket_directories='${local.PGHOST}' -c port=55459`, "-w", "start"], local);
    started = true;
    // pg_dump includes the public namespace; remove only this disposable empty
    // cluster's default namespace before restoring it from the archive.
    await command(join(tools, "psql"), psql, local, "DROP SCHEMA public CASCADE;");
    phase = "AUTHENTICATED_ARCHIVE_AND_ISOLATED_RESTORE";
    const recovery = await authenticatedPlaintext(file, pass, async chunks => {
      const restoredHash = createHash("sha256");
      const child = spawn(join(tools, "pg_restore"), ["--exit-on-error", "--no-owner", "--no-acl", "-d", "postgres"],
        { env: local, stdio: ["pipe", "ignore", "pipe"] });
      let privateRestoreError = "";
      child.stderr.on("data", b => { if (privateRestoreError.length < 16384) privateRestoreError += b; });
      const ended = new Promise((ok, fail) => {
        child.on("error", () => fail(Error("ISOLATED_RESTORE_FAILED")));
        child.on("close", code => {
          if (code === 0) return ok();
          restoreFailureCode = /role .*does not exist/i.test(privateRestoreError) ? "LOCAL_ROLE_MISSING" :
            /already exists/i.test(privateRestoreError) ? "LOCAL_OBJECT_ALREADY_EXISTS" :
            /permission denied/i.test(privateRestoreError) ? "LOCAL_PERMISSION_DENIED" : "LOCAL_ARCHIVE_RESTORE_ERROR";
          fail(Error("ISOLATED_RESTORE_FAILED"));
        });
      });
      try {
        await pipeline(Readable.from((async function* () {
          for await (const chunk of chunks) { restoredHash.update(chunk); yield chunk; }
        })()), child.stdin);
        await ended;
        assert(restoredHash.digest("hex") === plaintextHash, "WHOLE_ARCHIVE_HASH_MISMATCH");
      } catch { child.kill(); await ended.catch(() => {}); throw Error("ISOLATED_RESTORE_FAILED"); }
    });
    phase = "RESTORED_OWNER_VERIFICATION";
    assert(await command(join(tools, "psql"), psql, local, ownerSql) === "1", "RESTORED_ADMIN_MISMATCH");
    return { status: "DESIGNATED_BUSINESS_SOURCE_BACKUP_AND_LOCAL_RESTORE_VERIFIED",
      realBusinessDataCaptured: true, encryptedCiphertextFile: file, wholeArchiveAuthenticated: true,
      ciphertextSha256: recovery.ciphertext_sha256,
      wholePlaintextArchiveHashMatched: true, protectedAdminRestored: true,
      localSocketOnlyRestore: true, sourceReadOnlyVerified: true, sourceTlsVerified: true,
      liveRuntimeBindingVerified: false, externalDurableCopyVerified: false,
      outsideReplitKeyRecoveryVerified: false, legacyProviderMfaBackupIncluded: false,
      productionBackupFullyAccepted: false, productionWritesExecuted: false };
  } finally {
    if (started) await command(join(tools, "pg_ctl"), ["-D", join(root, "data"), "-m", "immediate", "stop"], local).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let report;
  try {
    assert(process.argv.length === 2 || process.argv.length === 3 &&
      process.argv[2] === "--restore-retained-capture", "BACKUP_MODE_INVALID");
    report = await captureAndRestore({ restoreExisting: process.argv[2] === "--restore-retained-capture" });
  }
  catch (error) { report = { status: "BUSINESS_BACKUP_OR_RESTORE_BLOCKED", phase,
    safeReason: /^[A-Z_]{8,80}$/.test(error?.message ?? "") ? error.message : "PRIVATE_FAILURE_SUPPRESSED",
    restoreFailureCode, encryptedCaptureRetained: !!captureRecord,
    privateErrorsSuppressed: true,
    productionWritesExecuted: false, productionBackupFullyAccepted: false }; process.exitCode = 1; }
  await mkdir("generated-artifacts/auth-security", { recursive: true });
  await writeFile("generated-artifacts/auth-security/production-business-backup-restore.json",
    JSON.stringify({ ...report, capturedAt: new Date().toISOString() }, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ status: report.status, phase: report.phase, safeReason: report.safeReason, realBusinessDataCaptured: report.realBusinessDataCaptured,
    localRestoreVerified: report.wholePlaintextArchiveHashMatched, productionBackupFullyAccepted: false, productionWritesExecuted: false }));
}

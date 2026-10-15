import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, readdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

// Isolated upstream reproduction, not a migration runner. The only database
// target is a fresh private local socket; no source/Production credentials.
const requireDb = createRequire(new URL("../../lib/db/package.json", import.meta.url));
const { generateDrizzleJson, generateMigration, pushSchema } = requireDb("drizzle-kit/api");
const { pgTable, pgSchema, text, pgPolicy } = requireDb("drizzle-orm/pg-core");
const { sql } = requireDb("drizzle-orm");
const { drizzle } = requireDb("drizzle-orm/node-postgres");
const { Pool } = requireDb("pg");
const fixtureNamespace = pgSchema("vynox_supabase_auth");
const fixturePublic = pgTable("native_publish_probe", { id: text("id").primaryKey() }, () => [
  pgPolicy("qx_read", { for: "select", using: sql`current_setting('app.tenant_id', true) = 'synthetic-probe'` }),
  pgPolicy("qx_write", { for: "all",
    using: sql`current_setting('app.can_write', true) = 'true'`,
    withCheck: sql`current_setting('app.can_write', true) = 'true'` }),
]).enableRLS();
const fixturePrivate = fixtureNamespace.table("private_probe", { id: text("id").primaryKey() });
const imports = { fixturePublic, fixtureNamespace, fixturePrivate };
const root = await mkdtemp(join(tmpdir(), "native-publish-upstream-"));
const socket = join(root, "socket");
await mkdir(socket, { mode: 0o700 });
const dir = (await readdir("/nix/store")).find(n => /postgresql-17\.6$/.test(n));
assert(dir, "Existing local PostgreSQL required");
const tools = `/nix/store/${dir}/bin`;
const env = { PATH: tools, HOME: root, LANG: "C", LC_ALL: "C" };
function local(name, args) {
  const r = spawnSync(`${tools}/${name}`, args, { env, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, `SYNTHETIC_LOCAL_${name.toUpperCase()}_FAILED`);
}
let started = false, pool;
try {
  local("initdb", ["-D", join(root, "data"), "--username=publish_probe", "--auth-local=trust", "--auth-host=reject", "--no-locale"]);
  local("pg_ctl", ["-D", join(root, "data"), "-l", join(root, "log"), "-o",
    `-c listen_addresses='' -c unix_socket_directories='${socket}' -c port=55679`, "-w", "start"]);
  started = true;
  pool = new Pool({ host: socket, port: 55679, user: "publish_probe", database: "postgres",
    password: "", ssl: false, options: "-c default_transaction_read_only=on", max: 1 });
  const snapshots = {
    full: generateDrizzleJson(imports, undefined, ["public", "vynox_supabase_auth"]),
    publicOnly: generateDrizzleJson(imports, undefined, ["public"]),
  };
  const migrationSql = await generateMigration(generateDrizzleJson({}), snapshots.full);
  const { statementsToExecute: pushSql } = await pushSchema(imports, drizzle(pool), ["public", "vynox_supabase_auth"]);
  // Never retain or call the returned apply function.
  const policies = list => list.filter(s => /CREATE POLICY/i.test(s));
  const result = {
    syntheticOnly: true, localSocketOnly: true, queriesReadOnly: true, applyCalled: false,
    drizzleKitVersion: JSON.parse(await readFile(join(dirname(requireDb.resolve("drizzle-kit/api")), "package.json"), "utf8")).version,
    nativeImplementationVersionKnown: false,
    migrationPolicies: policies(migrationSql), pushPolicies: policies(pushSql),
    fullSnapshotPrivateTables: Object.keys(snapshots.full.tables).filter(k => k.startsWith("vynox_supabase_auth.")),
    publicFilterPrivateTables: Object.keys(snapshots.publicOnly.tables).filter(k => k.startsWith("vynox_supabase_auth.")),
    lossReproduced: policies(migrationSql).every(s => /\bUSING\s*\(/i.test(s)) &&
      policies(pushSql).every(s => !/\bUSING\s*\(/i.test(s)),
    sourceCodeLossPath: "PgSquasher.squashPolicyPush/unsquashPolicyPush omit using/withCheck; policy SQL converter consumes that stripped object.",
    scopeLossPath: "generateDrizzleJson(..., ['public']) excludes qualified private tables; push introspection defaults to ['public'].",
    caution: "This reproduces the upstream mechanisms, not proof of the private Replit service's deployed package version or call stack.",
  };
  await mkdir("generated-artifacts/native-publish-investigation", { recursive: true });
  await writeFile("generated-artifacts/native-publish-investigation/upstream-reproduction.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool?.end();
  if (started) local("pg_ctl", ["-D", join(root, "data"), "-m", "immediate", "stop"]);
  await rm(root, { recursive: true, force: true });
}

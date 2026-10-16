import { mkdtemp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { migrate } from "./migrate.mjs";
import { verifyTarget } from "./verify-target.mjs";
import { verifyProductionPermissions } from "./production-permissions.mjs";
const { Client } = createRequire(new URL("../../lib/db/package.json", import.meta.url))("pg");
const tools = "/nix/store/" + (await readdir("/nix/store")).find(x => x.endsWith("-postgresql-17.6")) + "/bin";
const root = await mkdtemp(join(tmpdir(), "vynox-production-rehearsal-"));
const run = (name, args) => execFileSync(join(tools, name), args, { encoding: "utf8",
  env: { PATH: tools, HOME: root, LANG: "C", LC_ALL: "C" }, stdio: ["ignore", "pipe", "pipe"] });
let started = false, client;
try {
  run("initdb", ["-D", join(root, "data"), "--username=postgres", "--auth-local=trust", "--auth-host=trust", "--no-locale"]);
  run("pg_ctl", ["-D", join(root, "data"), "-l", join(root, "log"), "-o",
    `-c listen_addresses=127.0.0.1 -c unix_socket_directories=${root} -c port=55682`, "-w", "start"]);
  started = true;
  const connectionString = "postgresql://postgres@127.0.0.1:55682/postgres";
  client = new Client({ connectionString }); await client.connect();
  await client.query("CREATE ROLE supabase_admin; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role");
  const env = { NODE_ENV: "test", QXLAYER_MIGRATION_TEST: "true", QXLAYER_EXTERNAL_ENVIRONMENT: "production",
    SUPABASE_PROJECT_REF: "qcgvhlphalxqzzsxqjhi", VYNOX_PRODUCTION_INITIALIZATION_APPROVED: "true",
    QXLAYER_EXTERNAL_MIGRATIONS_APPROVED: "true", MIGRATION_DATABASE_URL: connectionString };
  await migrate(env); await migrate(env);
  await verifyTarget(client, { policyRole: "qxlayer_runtime" });
  const password = randomBytes(30).toString("base64url");
  await client.query(`ALTER ROLE qxlayer_app LOGIN PASSWORD '${password}'; ALTER ROLE qxlayer_auth_app LOGIN PASSWORD '${password}'`);
  const permissions = await verifyProductionPermissions(
    { connectionString: `postgresql://qxlayer_app:${password}@127.0.0.1:55682/postgres` },
    { connectionString: `postgresql://qxlayer_auth_app:${password}@127.0.0.1:55682/postgres` });
  assert.equal((await client.query("SELECT count(*)::int AS n FROM public.tenants")).rows[0].n, 0);
  console.log(JSON.stringify({ syntheticOnly: true, productionModified: false, idempotentLedger: true, permissions }));
} catch (e) {
  console.error(e.message); process.exitCode = 1;
} finally { await client?.end(); if (started) run("pg_ctl", ["-D", join(root, "data"), "-m", "immediate", "stop"]); await rm(root, { recursive: true, force: true }); }

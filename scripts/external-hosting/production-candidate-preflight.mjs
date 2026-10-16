import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const require = createRequire(new URL("../../lib/db/package.json", import.meta.url));
const { Client } = require("pg");
export const PRODUCTION_PROJECT = "qcgvhlphalxqzzsxqjhi";

export function productionProbeConfiguration(env) {
  assert.equal(env.QXLAYER_EXTERNAL_ENVIRONMENT, "production");
  assert.equal(env.QXLAYER_EXTERNAL_CANDIDATE, "true");
  assert.equal(env.QXLAYER_EXTERNAL_STARTUP_APPROVED, "false");
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED, "false");
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF, PRODUCTION_PROJECT);
  assert(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY?.startsWith("sb_secret_"));
  assert(env.DB_TLS_CA_FILE);
  const url = new URL(env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL);
  const user = decodeURIComponent(url.username);
  assert(["postgres:", "postgresql:"].includes(url.protocol));
  assert((url.hostname === `db.${PRODUCTION_PROJECT}.supabase.co` && user === "postgres") ||
    (/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(url.hostname) && user === `postgres.${PRODUCTION_PROJECT}`));
  assert.equal(url.hostname, env.DB_EXPECTED_HOST);
  assert.equal(url.pathname, "/postgres");
  assert(["", "5432"].includes(url.port) && url.password);
  // Operator credentials are for this READ ONLY probe, never the app pool.
  assert(!env.DATABASE_URL, "Runtime login must remain unset until restricted roles are provisioned");
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, "0");
  url.search = "";
  return url;
}

export async function productionCandidatePreflight(env, dependencies = {}) {
  const result = { preflightComplete: false, databaseConnected: false,
    authenticationReachable: false, authAdminReadVerified: false, schemaReady: false,
    runtimeRolesReady: false, probeReadOnly: true };
  let client;
  try {
    const url = productionProbeConfiguration(env);
    const ca = await (dependencies.readFile ?? readFile)(env.DB_TLS_CA_FILE, "utf8");
    const expected = dependencies.expectedTables ??
      JSON.parse(await readFile(new URL("../../deploy/migrations/rls-reference.json", import.meta.url), "utf8")).tables.map(t => t.name);
    client = (dependencies.client ?? (options => new Client(options)))({
      connectionString: url.toString(), ssl: { rejectUnauthorized: true, ca, servername: url.hostname },
      enableChannelBinding: true, connectionTimeoutMillis: 10000, query_timeout: 10000,
      application_name: "vynox-held-production-readonly",
      options: "-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000",
    });
    await client.connect();
    assert(client.connection.stream.encrypted && client.connection.stream.authorized);
    await client.query("BEGIN READ ONLY");
    const identity = await client.query(`SELECT current_database()='postgres' AS database_matches,
      current_setting('transaction_read_only')='on' AS read_only,
      EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') AS managed`);
    assert(identity.rows[0].database_matches && identity.rows[0].read_only && identity.rows[0].managed);
    const tables = await client.query(`SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
      AND c.relkind='r' AND c.relname=ANY($1::text[])`, [expected]);
    const roles = await client.query(`SELECT rolname FROM pg_roles
      WHERE rolname IN ('qxlayer_app','qxlayer_runtime') AND NOT rolsuper AND NOT rolbypassrls`);
    const privateTables = await client.query(`SELECT count(*)::int AS count
      FROM information_schema.tables WHERE table_schema='vynox_supabase_auth'`);
    await client.query("ROLLBACK");
    Object.assign(result, { databaseConnected: true, tlsVerified: true,
      requiredPublicTables: expected.length, presentPublicTables: tables.rows.length,
      privateAuthTables: privateTables.rows[0].count,
      runtimeRolesReady: roles.rows.length === 2,
      // Object presence is not exact constraint/policy/ACL parity.
      requiredObjectsPresent: tables.rows.length === expected.length &&
        privateTables.rows[0].count === 5 && roles.rows.length === 2 });
  } catch (error) {
    // Never expose driver errors, connection strings, hosts, keys or row data.
    result.databaseCheck = /^[A-Z0-9]{5}$/.test(error?.code ?? "") ? error.code : "BLOCKED";
  } finally {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
      await client.end().catch(() => {});
    }
  }
  try {
    productionProbeConfiguration(env);
    const request = dependencies.fetch ?? fetch;
    const headers = { apikey: env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY,
      Authorization: `Bearer ${env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY}` };
    for (const path of ["/auth/v1/health", "/auth/v1/admin/users?page=1&per_page=1"]) {
      const response = await request(`https://${PRODUCTION_PROJECT}.supabase.co${path}`, {
        method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(10000),
      });
      assert(response.ok);
      await response.body?.cancel();
    }
    result.authenticationReachable = true;
    result.authAdminReadVerified = true;
  } catch {
    result.authCheck = "BLOCKED";
  }
  result.preflightComplete = true;
  result.checkedAt = new Date().toISOString();
  return result;
}

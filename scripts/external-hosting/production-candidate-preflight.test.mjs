import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { productionCandidatePreflight, productionProbeConfiguration } from "./production-candidate-preflight.mjs";
const env = {
  QXLAYER_EXTERNAL_ENVIRONMENT: "production", QXLAYER_EXTERNAL_CANDIDATE: "true",
  QXLAYER_EXTERNAL_STARTUP_APPROVED: "false", QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED: "false",
  QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF: "qcgvhlphalxqzzsxqjhi",
  QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY: ["sb", "secret", "synthetic", "only"].join("_"),
  QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL: "postgresql://postgres.qcgvhlphalxqzzsxqjhi:synthetic@fixture.pooler.supabase.com:5432/postgres",
  DB_EXPECTED_HOST: "fixture.pooler.supabase.com", DB_TLS_CA_FILE: "/fixture/ca",
};
env.QXLAYER_PRODUCTION_DATABASE_CREDENTIAL_PROOF = createHmac("sha256",
  env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY).update(env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL).digest("hex");
test("operator probe cannot enable startup, use other projects or become runtime login", () => {
  productionProbeConfiguration(env);
  for (const change of [{ QXLAYER_EXTERNAL_STARTUP_APPROVED: "true" }, { DATABASE_URL: "anything" },
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED: "true" },
    { QXLAYER_PRODUCTION_DATABASE_CREDENTIAL_PROOF: "0".repeat(64) },
    { QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF: "muvedavhbpgpdrrnjrih" }])
    assert.throws(() => productionProbeConfiguration({ ...env, ...change }));
});
test("probe performs only metadata reads, reports missing schema and closes connection", async () => {
  const statements = []; let closed = false; const paths = [];
  const result = await productionCandidatePreflight(env, {
    expectedTables: ["tenants"], readFile: async () => "synthetic CA",
    client: options => {
      assert.equal(options.ssl.rejectUnauthorized, true);
      assert(options.options.includes("default_transaction_read_only=on"));
      return { connection: { stream: { encrypted: true, authorized: true } }, connect: async () => {},
        end: async () => { closed = true; }, query: async sql => {
          statements.push(sql);
          assert(/^(SELECT|BEGIN READ ONLY|ROLLBACK)/.test(sql));
          if (sql.includes("database_matches")) return { rows: [{ database_matches: true, read_only: true, managed: true }] };
          if (sql.includes("count(*)")) return { rows: [{ count: 0 }] };
          return { rows: [] };
        } };
    },
    fetch: async (url, options) => { paths.push(url); assert.equal(options.method, "GET"); return { ok: true }; },
  });
  assert(closed && statements[0] === "BEGIN READ ONLY");
  assert.equal(paths.length, 2);
  assert.equal(result.databaseConnected, true);
  assert.equal(result.authenticationReachable, true);
  assert.equal(result.presentPublicTables, 0);
  assert.equal(result.schemaReady, false);
  assert.equal(result.runtimeRolesReady, false);
});
test("private connection failures expose only bounded codes, not messages or credentials", async () => {
  const result = await productionCandidatePreflight(env, {
    expectedTables: [], readFile: async () => "CA",
    client: () => ({ connect: async () => { throw Object.assign(Error(env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL), { code: "28P01" }); },
      query: async () => {}, end: async () => {} }),
    fetch: async () => ({ ok: false }),
  });
  assert.equal(result.databaseCheck, "28P01");
  assert.equal(result.authCheck, "BLOCKED");
  assert(!JSON.stringify(result).includes("synthetic"));
});

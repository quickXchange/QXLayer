import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
const headers = { Authorization: `Bearer ${process.env.RENDER_API_KEY}` };
const get = async path => {
  const r = await fetch(`https://api.render.com/v1/${path}`, { headers, redirect: "error", signal: AbortSignal.timeout(30000) });
  assert(r.ok, `Candidate boundary unavailable: HTTP ${r.status}`);
  return r.json();
};
const [api, worker, staging, production, variables] = await Promise.all([
  get("services/srv-db5b47qjnfac739s374g"),
  get("services/srv-db5b48o473hc73ah56d0"),
  get("env-groups/evg-db5ate8473hc73agdon0"),
  get("env-groups/evg-db936g3bc2fs73cmm5dg"),
  get("services/srv-db5b47qjnfac739s374g/env-vars?limit=100"),
]);
// Service-level values override linked groups on Render.
assert(variables.length < 100, "Paginated service configuration needs explicit reconciliation");
const linked = group => group.serviceLinks.some(s => s.id === api.id);
assert.notEqual(linked(staging), linked(production), "Exactly one candidate configuration must be linked");
const group = linked(production) ? production : staging;
const env = Object.fromEntries([...group.envVars, ...variables.map(e => e.envVar)]
  .map(e => [e.key, e.value]));
assert.equal(api.repo, "https://github.com/quickXchange/VYNOX-LAYER");
assert.equal(api.branch, "main");
assert.equal(api.serviceDetails.plan, "starter");
assert.equal(api.serviceDetails.envSpecificDetails.startCommand, "node scripts/external-hosting/start-api.mjs");
assert.equal(api.environmentId, group.environmentId);
assert.equal(worker.suspended, "suspended");
assert.equal(env.QXLAYER_EXTERNAL_STARTUP_APPROVED, "false");
const productionOnly = group.id === production.id;
assert.equal(env.QXLAYER_EXTERNAL_ENVIRONMENT, productionOnly ? "production" : "staging");
if (productionOnly) {
  assert.equal(env.QXLAYER_EXTERNAL_CANDIDATE, "true");
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED, "false");
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF, "qcgvhlphalxqzzsxqjhi");
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_URL, "https://www.quicklychan.xyz");
  assert(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SERVER_KEY?.startsWith("sb_secret_"));
  assert(!env.DATABASE_URL, "Privileged probe URL must not become the application runtime URL");
  const db = new URL(env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL);
  assert(db.hostname === "db.qcgvhlphalxqzzsxqjhi.supabase.co" ||
    (db.hostname.endsWith(".pooler.supabase.com") &&
      decodeURIComponent(db.username) === "postgres.qcgvhlphalxqzzsxqjhi"));
  assert(Object.keys(env).every(k => !k.startsWith("QXLAYER_SUPABASE_AUTH_") &&
    !k.startsWith("QXLAYER_DEVELOPMENT_") && !k.includes("CLERK")));
}
assert.equal(env.QXLAYER_HEALTH_MONITOR_ENABLED, "false");
assert.equal(env.QXLAYER_HEALTH_MONITOR_MODE, "disabled");
assert.equal(env.PRODUCTION_ACCESS_GATE_ENABLED, "true");
assert.equal(process.env.GITHUB_REF_NAME, "main");
console.log("Pinned candidate only: startup hold, access gate and suspended worker verified; no Live activation.");
if (process.env.GITHUB_ENV)
  await appendFile(process.env.GITHUB_ENV,
    `CANDIDATE_AUTH_ENVIRONMENT=${productionOnly ? "production" : "staging"}\n` +
    `CANDIDATE_SUPABASE_PROJECT_REF=${productionOnly ? "qcgvhlphalxqzzsxqjhi" : ""}\n` +
    `CANDIDATE_AUTH_ORIGIN=${productionOnly ? "https://www.quicklychan.xyz" : ""}\n`);

import assert from "node:assert/strict";
const headers = { Authorization: `Bearer ${process.env.RENDER_API_KEY}` };
const get = async path => {
  const r = await fetch(`https://api.render.com/v1/${path}`, { headers, redirect: "error", signal: AbortSignal.timeout(30000) });
  assert(r.ok, `Candidate boundary unavailable: HTTP ${r.status}`);
  return r.json();
};
const [api, worker, group, variables] = await Promise.all([
  get("services/srv-db5b47qjnfac739s374g"),
  get("services/srv-db5b48o473hc73ah56d0"),
  get("env-groups/evg-db5ate8473hc73agdon0"),
  get("services/srv-db5b47qjnfac739s374g/env-vars?limit=100"),
]);
// Service-level values override linked groups on Render.
assert(variables.length < 100, "Paginated service configuration needs explicit reconciliation");
const env = Object.fromEntries([...group.envVars, ...variables.map(e => e.envVar)]
  .map(e => [e.key, e.value]));
assert.equal(api.repo, "https://github.com/quickXchange/VYNOX-LAYER");
assert.equal(api.branch, "main");
assert.equal(api.serviceDetails.plan, "starter");
assert.equal(api.serviceDetails.envSpecificDetails.startCommand, "node scripts/external-hosting/start-api.mjs");
assert.equal(api.environmentId, group.environmentId);
assert.equal(worker.suspended, "suspended");
assert.equal(env.QXLAYER_EXTERNAL_STARTUP_APPROVED, "false");
assert.equal(env.QXLAYER_EXTERNAL_ENVIRONMENT, "staging");
assert.equal(env.QXLAYER_HEALTH_MONITOR_ENABLED, "false");
assert.equal(env.QXLAYER_HEALTH_MONITOR_MODE, "disabled");
assert.equal(env.PRODUCTION_ACCESS_GATE_ENABLED, "true");
assert.equal(process.env.GITHUB_REF_NAME, "main");
console.log("Pinned candidate only: startup hold, access gate and suspended worker verified; no Live activation.");

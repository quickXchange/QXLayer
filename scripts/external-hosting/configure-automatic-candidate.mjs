/**
 * User-authorized candidate configuration only. No Live/DNS/data operations.
 * Reuses the API, Vercel project and GitHub repository. Deployment credentials
 * go directly to GitHub's encrypted secret store, never files or stdout.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { mkdir, writeFile } from "node:fs/promises";
assert.equal(process.env.VYNOX_CANDIDATE_SETUP_APPROVED, "true");
const repo = "quickXchange/VYNOX-LAYER", environment = "vynox-candidate";
async function github(path, method = "GET", body) {
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method, headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  assert(r.ok, `GitHub configuration HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}
const identity = await github("");
assert.equal(identity.full_name, repo);
const sdk = new ReplitConnectors();
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const vr = await sdk.proxy("vercel", `/v9/projects/${project}?teamId=${team}`);
assert(vr.ok);
const vp = await vr.json();
assert.equal(vp.id, project);
assert.equal(vp.autoAssignCustomDomains, false);
assert(!vp.targets?.production, "Existing Production deployment must not be modified");
// Keep the original reviewed Staging environment and its migration credentials
// protected. The new automatic environment has deployment credentials only.
await github(`/environments/${environment}`, "PUT", {
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
});
const policies = await github(`/environments/${environment}/deployment-branch-policies`);
if (!policies.branch_policies.some(p => p.name === "main"))
  await github(`/environments/${environment}/deployment-branch-policies`, "POST", { name: "main", type: "branch" });
const ciEnv = { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN };
function secret(name, value) {
  assert(value, "Missing deployment credential");
  execFileSync("gh", ["secret", "set", name, "--env", environment, "--repo", repo],
    { env: ciEnv, input: value, stdio: ["pipe", "ignore", "pipe"] });
}
const expiresAt = Date.now() + 90 * 86400000;
const tr = await sdk.proxy("vercel", `/v3/user/tokens?teamId=${team}`, {
  method: "POST", body: { name: "VYNOX automatic protected candidate", expiresAt, projectId: project },
});
assert(tr.ok, `Vercel CI credential provisioning HTTP ${tr.status}`);
const token = await tr.json();
assert(token.bearerToken && token.token?.id, "Vercel credential response invalid");
try {
  const check = await fetch(`https://api.vercel.com/v9/projects/${project}?teamId=${team}`, {
    headers: { Authorization: `Bearer ${token.bearerToken}` }, signal: AbortSignal.timeout(30000),
  });
  assert(check.ok && (await check.json()).id === project);
  secret("VERCEL_TOKEN", token.bearerToken);
  secret("RENDER_API_KEY", process.env.RENDER_API_KEY);
} catch {
  await sdk.proxy("vercel", `/v3/user/tokens/${token.token.id}?teamId=${team}`, { method: "DELETE" });
  throw Error("Encrypted CI credential installation failed; token revocation requested");
}
const rh = { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, "Content-Type": "application/json" };
const serviceUrl = "https://api.render.com/v1/services/srv-db5b47qjnfac739s374g";
const before = await (await fetch(serviceUrl, { headers: rh })).json();
assert.equal(before.repo, `https://github.com/${repo}`);
assert.equal(before.serviceDetails.plan, "starter");
assert.equal(before.suspended, "not_suspended");
const update = await fetch(serviceUrl, { method: "PATCH", headers: rh,
  body: JSON.stringify({ branch: "main", autoDeploy: "no",
    serviceDetails: { envSpecificDetails: { startCommand: "node scripts/external-hosting/start-api.mjs" } } }),
  signal: AbortSignal.timeout(30000) });
assert(update.ok, `Render source configuration HTTP ${update.status}`);
for (const [key, value] of Object.entries({
  QXLAYER_EXTERNAL_STARTUP_APPROVED: "false",
  QXLAYER_HEALTH_MONITOR_ENABLED: "false", QXLAYER_HEALTH_MONITOR_MODE: "disabled",
  PRODUCTION_ACCESS_GATE_ENABLED: "true",
})) {
  const result = await fetch(`${serviceUrl}/env-vars/${key}`, {
    method: "PUT", headers: rh, body: JSON.stringify({ value }), signal: AbortSignal.timeout(30000),
  });
  assert(result.ok, "Candidate service-level hold configuration failed");
}
const after = await (await fetch(serviceUrl, { headers: rh })).json();
assert.equal(after.branch, "main");
assert.equal(after.autoDeploy, "no"); // CI controls ordering/checks and exact SHA.
execFileSync("git", ["remote", "set-url", "origin", `https://github.com/${repo}.git`]);
await mkdir("generated-artifacts/external-finalization", { recursive: true });
await writeFile("generated-artifacts/external-finalization/ci-configuration.json", JSON.stringify({
  repository: repo, branch: "main", environment, source: "GitHub push workflow",
  vercelProject: project, renderService: after.id, deploymentOnlySecrets: ["VERCEL_TOKEN", "RENDER_API_KEY"],
  vercelCredentialExpiresAt: expiresAt, tokenId: token.token.id,
  existingStagingReviewProtectionPreserved: true, workerResumed: false,
  databaseChanges: false, dnsChanged: false, liveChanged: false,
}, null, 2));
console.log("Automatic candidate source and encrypted deployment credentials configured; Live and DNS unchanged.");

/** Persist one owner credential in pinned Staging providers; never print its value. */
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { ReplitConnectors } from "@replit/connectors-sdk";

if (process.env.QXLAYER_STAGING_OWNER_ACCESS_APPROVED !== "true")
  throw new Error("Staging owner-access approval required.");
const groupId = "evg-db5ate8473hc73agdon0";
const apiId = "srv-db5b47qjnfac739s374g";
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const key = "QXLAYER_STAGING_ACCESS_CODE";
const sdk = new ReplitConnectors();
async function render(route, method = "GET", body) {
  const r = await fetch(`https://api.render.com/v1/${route}`, {
    method, headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`Scoped Render configuration HTTP ${r.status}.`);
  return r.json();
}
async function vercel(route, method = "GET", body) {
  const r = await sdk.proxy("vercel", `${route}${route.includes("?") ? "&" : "?"}teamId=${team}`,
    { method, ...(body ? { body } : {}) });
  if (!r.ok) throw new Error(`Scoped Vercel configuration HTTP ${r.status}.`);
  return r.json();
}
const [g, p, worker, api] = await Promise.all([
  render(`env-groups/${groupId}`), vercel(`/v9/projects/${project}`),
  render("services/srv-db5b48o473hc73ah56d0"), render(`services/${apiId}`),
]);
const before = Object.fromEntries(g.envVars.map(x => [x.key, x.value]));
if (g.environmentId !== "evm-db5ateflot8c73eam1ug" ||
    api.environmentId !== g.environmentId || api.ownerId !== g.ownerId ||
    g.ownerId !== "tea-db4mt30473hc73euumb0" ||
    before.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" ||
    before.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" ||
    before.PRODUCTION_ACCESS_GATE_ENABLED !== "true" ||
    worker.suspended !== "suspended" || worker.autoDeploy !== "no" ||
    api.serviceDetails.plan !== "starter" || api.autoDeploy !== "no" ||
    p.id !== project || p.name !== "qxlayer-staging" || p.accountId !== team || p.link)
  throw new Error("Pinned Staging scope changed.");
const serviceBefore = Object.fromEntries(
  (await render(`services/${apiId}/env-vars?limit=100`)).map(x => {
    const v = x.envVar ?? x; return [v.key, v.value];
  }));
// The owner-visible service setting takes precedence at Render and is canonical.
// Preserve it during synchronization instead of reverting an owner's existing code.
const code = serviceBefore[key] ?? before[key] ?? randomBytes(32).toString("base64url");
if (!/^[A-Za-z0-9_-]{43,128}$/.test(code)) throw new Error("Review the existing Staging credential securely.");
const envs = (await vercel(`/v10/projects/${project}/env`)).envs;
const existing = envs.filter(x => x.key === key);
if (existing.length > 1 || existing.some(x => x.gitBranch ||
    x.target?.length !== 1 || x.target[0] !== "preview"))
  throw new Error("Staging credential must be Preview-only.");
if (before[key] !== code) await render(`env-groups/${groupId}/env-vars/${key}`, "PUT", { value: code });
if (existing.length) {
  await vercel(`/v9/projects/${project}/env/${existing[0].id}`, "PATCH",
    { value: code, type: "encrypted", target: ["preview"] });
} else {
  await vercel(`/v10/projects/${project}/env`, "POST",
    { key, value: code, type: "encrypted", target: ["preview"] });
}
const after = Object.fromEntries((await render(`env-groups/${groupId}`)).envVars.map(x => [x.key, x.value]));
if (Object.keys(before).some(k => k !== key && before[k] !== after[k]) || after[key] !== code)
  throw new Error("Existing Staging configuration changed unexpectedly.");
const item = (await vercel(`/v10/projects/${project}/env`)).envs.find(x => x.key === key);
const readback = await vercel(`/v1/projects/${project}/env/${item.id}`);
const value = readback.value;
if (typeof value !== "string" || !timingSafeEqual(createHash("sha256").update(code).digest(),
    createHash("sha256").update(value).digest()))
  throw new Error("Staging credential readback did not match.");
// Render lists service variables separately from inherited group variables.
// Keep the owner-visible API setting and inherited group synchronized.
if (serviceBefore[key] !== code)
  await render(`services/${apiId}/env-vars/${key}`, "PUT", { value: code });
const serviceAfter = Object.fromEntries(
  (await render(`services/${apiId}/env-vars?limit=100`)).map(x => {
    const v = x.envVar ?? x; return [v.key, v.value];
  }));
if (serviceAfter[key] !== code ||
    Object.keys(serviceBefore).some(k => k !== key && serviceBefore[k] !== serviceAfter[k]))
  throw new Error("Owner-visible Staging service configuration did not match.");
await writeFile("generated-artifacts/qxlayer-staging-setup/staging-owner-access-configuration.json",
  JSON.stringify({ status: "STAGING_OWNER_CREDENTIAL_PERSISTED", key,
    previewOnly: true, serverSideOnly: true, credentialValuesRecorded: false,
    existingCredentialsPreserved: true, gateEnabled: true, workerSuspended: true,
     ownerVisibleOnStagingApi: true, stagingGroupAndServiceSynchronized: true,
     existingOwnerVisibleCodePreserved: !serviceBefore[key] || serviceBefore[key] === code,
    productionChanged: false, dnsChanged: false }, null, 2) + "\n");
console.info("Staging owner credential persisted and matched across servers; no values recorded.");

/** Approved Staging-only verifier provisioning. Never persist/print a password. */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { ReplitConnectors } from "@replit/connectors-sdk";

if (process.env.QXLAYER_STAGING_OWNER_ACCESS_APPROVED !== "true")
  throw new Error("Staging owner-access approval required.");
const password = process.env.PRODUCTION_ACCESS_CODE;
if (!password || password.length > 512) throw new Error("Existing owner password unavailable or incompatible with the form.");
const groupId = "evg-db5ate8473hc73agdon0", apiId = "srv-db5b47qjnfac739s374g";
const projectId = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", teamId = "team_eoJE6FCcm9esuqnRTUsmopzy";
const sdk = new ReplitConnectors();
async function render(path, method = "GET", body) {
  const r = await fetch(`https://api.render.com/v1/${path}`, {
    method, headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`Scoped Staging configuration HTTP ${r.status}.`);
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
async function vercel(path, method = "GET", body) {
  const r = await sdk.proxy("vercel", `${path}?teamId=${teamId}`, { method, ...(body ? { body } : {}) });
  if (!r.ok) throw new Error(`Scoped Preview configuration HTTP ${r.status}.`);
  return r.json();
}
const [group, service, worker, project, vars, settings] = await Promise.all([
  render(`env-groups/${groupId}`), render(`services/${apiId}`),
  render("services/srv-db5b48o473hc73ah56d0"), vercel(`/v9/projects/${projectId}`),
  render(`services/${apiId}/env-vars?limit=100`), vercel(`/v10/projects/${projectId}/env`),
]);
const before = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
const direct = Object.fromEntries(vars.map(x => { const v = x.envVar ?? x; return [v.key, v.value]; }));
if (group.environmentId !== "evm-db5ateflot8c73eam1ug" ||
    group.ownerId !== "tea-db4mt30473hc73euumb0" ||
    service.environmentId !== group.environmentId || service.ownerId !== group.ownerId ||
    before.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" ||
    before.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" ||
    before.PRODUCTION_ACCESS_GATE_ENABLED !== "true" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(before.QXLAYER_STAGING_ACCESS_CODE ?? "") ||
    direct.QXLAYER_STAGING_ACCESS_CODE !== before.QXLAYER_STAGING_ACCESS_CODE ||
    worker.suspended !== "suspended" || worker.autoDeploy !== "no" ||
    service.serviceDetails.plan !== "starter" || service.autoDeploy !== "no" ||
    service.branch !== "qxlayer-staging" ||
    project.id !== projectId || project.name !== "qxlayer-staging" || project.accountId !== teamId || project.link)
  throw new Error("Pinned Staging scope changed.");
const verifierKey = "QXLAYER_STAGING_OWNER_PASSWORD_VERIFIER";
let verifier = before[verifierKey];
if (/^scrypt-v1\$[A-Za-z0-9_-]{43}\$[A-Za-z0-9_-]{43}$/.test(verifier ?? "")) {
  const [, salt, digest] = verifier.split("$");
  if (!timingSafeEqual(scryptSync(password, Buffer.from(salt, "base64url"), 32), Buffer.from(digest, "base64url")))
    verifier = undefined;
} else verifier = undefined;
if (!verifier) {
  const salt = randomBytes(32);
  verifier = `scrypt-v1$${salt.toString("base64url")}$${scryptSync(password, salt, 32).toString("base64url")}`;
}
const changes = { QXLAYER_STAGING_ACCESS_MODE: "owner-password", [verifierKey]: verifier };
// Validate all destinations before any mutation. No Production targets permitted.
for (const key of Object.keys(changes)) {
  const existing = settings.envs.filter(v => v.key === key);
  if (existing.length > 1 || existing.some(v => v.gitBranch || v.target?.length !== 1 || v.target[0] !== "preview"))
    throw new Error("Owner authentication settings must be Preview-only.");
}
for (const [key, value] of Object.entries(changes)) {
  const existing = settings.envs.find(v => v.key === key);
  if (before[key] !== value) await render(`env-groups/${groupId}/env-vars/${key}`, "PUT", { value });
  if (direct[key] !== value) await render(`services/${apiId}/env-vars/${key}`, "PUT", { value });
  if (existing) await vercel(`/v9/projects/${projectId}/env/${existing.id}`, "PATCH",
    { value, type: "encrypted", target: ["preview"] });
  else await vercel(`/v10/projects/${projectId}/env`, "POST",
    { key, value, type: "encrypted", target: ["preview"] });
}
const after = Object.fromEntries((await render(`env-groups/${groupId}`)).envVars.map(v => [v.key, v.value]));
const serviceAfter = Object.fromEntries((await render(`services/${apiId}/env-vars?limit=100`)).map(x => {
  const v = x.envVar ?? x; return [v.key, v.value];
}));
const updated = (await vercel(`/v10/projects/${projectId}/env`)).envs;
for (const [key, value] of Object.entries(changes)) {
  const item = updated.find(v => v.key === key);
  const preview = item && await vercel(`/v1/projects/${projectId}/env/${item.id}`);
  if (after[key] !== value || serviceAfter[key] !== value || preview?.value !== value)
    throw new Error("Staging owner verifier synchronization failed.");
}
if (Object.keys(before).some(k => !(k in changes) && before[k] !== after[k]) ||
    Object.keys(direct).some(k => !(k in changes) && direct[k] !== serviceAfter[k]) ||
    process.env.PRODUCTION_ACCESS_CODE !== password)
  throw new Error("Unrelated configuration changed.");
await writeFile("generated-artifacts/qxlayer-staging-setup/staging-original-password-configuration.json",
  JSON.stringify({ status: "STAGING_ORIGINAL_PASSWORD_VERIFIER_CONFIGURED",
    originalReplitPasswordUnchanged: true, originalPasswordStoredInProviders: false,
    saltedScryptVerifierSynchronized: true, independentStagingSigningKeyPreserved: true,
    previewOnly: true, gateEnabled: true, workerSuspended: true,
    productionChanged: false, dnsChanged: false, clerkPermissionsChanged: false,
    secretsRecorded: false }, null, 2) + "\n");
console.info("Original owner password verifier synchronized to Staging only; no plaintext password stored or recorded.");

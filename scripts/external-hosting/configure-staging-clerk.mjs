/**
 * Explicit, save-only credential relay to the already approved isolated targets.
 * Never logs credentials, writes them to files, or calls deploy/resume endpoints.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { writeFile } from "node:fs/promises";
import { developmentClerkHost } from "../../lib/external-clerk/index.mjs";

if (process.env.QXLAYER_STAGING_CLERK_CONFIGURATION_APPROVED !== "true")
  throw new Error("Explicit Staging configuration approval is required.");
const groupId = "evg-db5ate8473hc73agdon0";
const environmentId = "evm-db5ateflot8c73eam1ug";
const serviceIds = ["srv-db5b47qjnfac739s374g", "srv-db5b48o473hc73ah56d0"];
const projectId = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const teamId = "team_eoJE6FCcm9esuqnRTUsmopzy";
const host = developmentClerkHost(process.env.CLERK_PUBLISHABLE_KEY);
if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    process.env.VITE_CLERK_PUBLISHABLE_KEY !== process.env.CLERK_PUBLISHABLE_KEY)
  throw new Error("Matching existing Development keys are required; live keys are forbidden.");
const connectors = new ReplitConnectors();
async function render(route, method = "GET", body) {
  const r = await fetch(`https://api.render.com/v1/${route}`, {
    method, headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
      "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`Render configuration request failed (${r.status}).`);
  return r.json();
}
async function vercel(route, method = "GET", body) {
  const r = await connectors.proxy("vercel", `${route}${route.includes("?") ? "&" : "?"}teamId=${teamId}`,
    { method, ...(body ? { body } : {}) });
  if (!r.ok) throw new Error(`Vercel configuration request failed (${r.status}).`);
  return r.json();
}
async function heldTargets() {
  const group = await render(`env-groups/${groupId}`);
  if (group.environmentId !== environmentId ||
      JSON.stringify(group.serviceLinks.map(s => s.id).sort()) !== JSON.stringify([...serviceIds].sort()))
    throw new Error("The group must be scoped exclusively to the approved Staging services.");
  const vars = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
  if (vars.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" ||
      vars.QXLAYER_HEALTH_MONITOR_MODE !== "disabled")
    throw new Error("Staging startup and monitoring must remain disabled.");
  const deployments = [];
  for (const id of serviceIds) {
    const s = await render(`services/${id}`);
    if (s.suspended !== "suspended" || s.autoDeploy !== "no" || s.autoDeployTrigger !== "off" ||
        s.environmentId !== environmentId)
      throw new Error("Every linked service must be suspended with automatic deploys disabled.");
    const d = await render(`services/${id}/deploys?limit=1`);
    deployments.push(d[0]?.deploy?.id ?? d[0]?.id ?? null);
    const ownVars = await render(`services/${id}/env-vars?limit=100`);
    if (ownVars.some(v => ["CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY",
      "QXLAYER_EXTERNAL_ENVIRONMENT", "CLERK_PROXY_PUBLIC_URL",
      "QXLAYER_STAGING_IDENTITY_BINDINGS"].includes(v.envVar?.key ?? v.key)))
      throw new Error("Service-level authentication overrides require separate review.");
  }
  const p = await vercel(`/v9/projects/${projectId}`);
  const d = await vercel(`/v7/deployments?projectId=${projectId}&limit=1`);
  if (p.id !== projectId || p.name !== "qxlayer-staging" || p.link || d.deployments.length)
    throw new Error("The isolated Vercel project must remain unlinked and undeployed.");
  return { group, deployments };
}
const before = await heldTargets();
const check = await fetch("https://api.clerk.com/v1/instance", {
  headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
});
if (!check.ok || (await check.json()).environment_type !== "development")
  throw new Error("Read-only verification of the existing Development instance failed.");
const updates = {
  QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  QXLAYER_CLERK_DEVELOPMENT_HOST: host,
  QXLAYER_STAGING_IDENTITY_BINDINGS: "{}",
};
// Do not overwrite an approved binding manifest on subsequent runs.
const priorBindings = before.group.envVars.find(v => v.key === "QXLAYER_STAGING_IDENTITY_BINDINGS");
if (priorBindings) updates.QXLAYER_STAGING_IDENTITY_BINDINGS = priorBindings.value;
if (before.group.envVars.some(v => v.key === "CLERK_PROXY_PUBLIC_URL" && v.value))
  throw new Error("An existing proxy requires review; it will not be overwritten.");
for (const [key, value] of Object.entries(updates))
  await render(`env-groups/${groupId}/env-vars/${encodeURIComponent(key)}`, "PUT", { value });
const preview = [
  { key: "VITE_CLERK_PUBLISHABLE_KEY", value: process.env.CLERK_PUBLISHABLE_KEY, type: "sensitive" },
  { key: "QXLAYER_EXTERNAL_ENVIRONMENT", value: "staging", type: "plain" },
  { key: "VITE_QXLAYER_EXTERNAL_ENVIRONMENT", value: "staging", type: "plain" },
  { key: "QXLAYER_CLERK_DEVELOPMENT_HOST", value: host, type: "plain" },
  { key: "VITE_CLERK_PROXY_URL", value: "", type: "plain" },
].map(v => ({ ...v, target: ["preview"] }));
const existing = await vercel(`/v10/projects/${projectId}/env`);
if (existing.envs.some(v => preview.some(p => p.key === v.key) &&
    (v.gitBranch || v.target?.some(t => t !== "preview"))))
  throw new Error("Refusing to overwrite a differently scoped Vercel variable.");
await vercel(`/v10/projects/${projectId}/env?upsert=true`, "POST", preview);
const after = await heldTargets();
if (JSON.stringify(before.deployments) !== JSON.stringify(after.deployments))
  throw new Error("Unexpected deployment inventory change; stop without activating anything.");
const saved = Object.fromEntries(after.group.envVars.map(v => [v.key, v.value]));
if (!Object.entries(updates).every(([k, v]) => saved[k] === v))
  throw new Error("Staging credential/configuration readback failed.");
const readback = await vercel(`/v10/projects/${projectId}/env`);
if (!preview.every(p => readback.envs.some(v => v.key === p.key && v.type === p.type &&
    v.target.length === 1 && v.target[0] === "preview")))
  throw new Error("Preview-only environment metadata verification failed.");
const receipt = {
  status: "DEVELOPMENT_CLERK_CONFIGURED_STAGING_HELD",
  existingManagedDevelopmentInstanceVerifiedReadOnly: true,
  renderStagingCredentialReadbackVerified: true,
  vercelPreviewOnlyMetadataVerified: true,
  productionKeysUsed: false,
  originalWorkspaceCredentialsChanged: false,
  applicationsCreatedOrTransferred: false,
  identityOrRoleRecordsWritten: false,
  secretValuesRecorded: false,
  productionChanged: false,
  deploymentInventoryUnchanged: true,
  servicesRemainSuspended: true,
  startupApprovalRemainsFalse: true,
  identityBindingsApproved: Object.keys(JSON.parse(updates.QXLAYER_STAGING_IDENTITY_BINDINGS)).length,
  remainingBlockers: [
    "Exact approved Vercel Preview origin is required for origin and platform settings",
    "Explicit Development-user-to-preserved-record bindings are required for Staging role access",
    "Hosted sign-in verification awaits separately approved source synchronization and deployment",
  ],
};
await writeFile("generated-artifacts/qxlayer-staging-setup/development-clerk-configuration.json",
  JSON.stringify(receipt, null, 2) + "\n");
console.info(JSON.stringify(receipt));

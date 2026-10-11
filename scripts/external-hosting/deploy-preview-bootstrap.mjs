/** Explicitly approved Preview-only upload. No database, Render write or DNS operations. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

if (process.env.QXLAYER_PREVIEW_DEPLOYMENT_APPROVED !== "true")
  throw new Error("Explicit Preview-only deployment approval is required.");
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const group = "evg-db5ate8473hc73agdon0";
const services = ["srv-db5b47qjnfac739s374g", "srv-db5b48o473hc73ah56d0"];
const sdk = new ReplitConnectors();
const receiptPath = "generated-artifacts/qxlayer-staging-setup/preview-deployment.json";
let prior;
try { prior = JSON.parse(await readFile(receiptPath, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (prior?.status === "BLOCKED_PROVIDER_FORCES_FIRST_UPLOAD_TO_PRODUCTION_TARGET")
  throw new Error("Preview target override is unresolved. Investigate read-only; do not upload again.");
async function vercel(route, method = "GET", body, headers) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await sdk.proxy("vercel",
      `${route}${route.includes("?") ? "&" : "?"}teamId=${team}`,
      { method, ...(body !== undefined ? { body } : {}), ...(headers ? { headers } : {}) });
    // Creation is deliberately never retried: an uncertain POST must be reconciled.
    if (r.status === 429 && !route.startsWith("/v13/deployments")) {
      await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
      continue;
    }
    if (!r.ok) {
      let code = "unknown";
      try { code = (await r.json()).error?.code ?? code; } catch {}
      throw new Error(`Vercel ${method} failed: HTTP ${r.status}, ${code}`);
    }
    if (route.startsWith("/v2/files")) return;
    return r.json();
  }
  throw new Error("Vercel upload throttled; no deployment retry.");
}
async function renderState() {
  async function get(route) {
    const r = await fetch(`https://api.render.com/v1/${route}`, {
      headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` },
    });
    if (!r.ok) throw new Error("Read-only Render hold verification failed.");
    return r.json();
  }
  const g = await get(`env-groups/${group}`);
  if (g.environmentId !== "evm-db5ateflot8c73eam1ug" ||
      JSON.stringify(g.serviceLinks.map(s => s.id).sort()) !== JSON.stringify([...services].sort()))
    throw new Error("Unexpected Render group scope.");
  const env = Object.fromEntries(g.envVars.map(v => [v.key, v.value]));
  if (env.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" ||
      env.QXLAYER_HEALTH_MONITOR_MODE !== "disabled")
    throw new Error("Render startup or monitoring is enabled.");
  const states = [];
  for (const id of services) {
    const s = await get(`services/${id}`);
    if (s.suspended !== "suspended" || s.autoDeploy !== "no" || s.autoDeployTrigger !== "off")
      throw new Error("Render is not held.");
    states.push({ service: s, deployments: await get(`services/${id}/deploys?limit=1`) });
  }
  // Values remain in memory only, never in the deployment or evidence.
  return { signature: JSON.stringify({ g, states }), gateCode: env.PRODUCTION_ACCESS_CODE };
}
const beforeRender = await renderState();
const before = await vercel(`/v9/projects/${project}`);
const domainsBefore = await vercel(`/v9/projects/${project}/domains`);
const envBefore = await vercel(`/v10/projects/${project}/env`);
const inventory = await vercel(`/v7/deployments?projectId=${project}&limit=2`);
if (before.id !== project || before.name !== "qxlayer-staging" || before.accountId !== team ||
    before.link || before.autoExposeSystemEnvs === false || inventory.deployments.length)
  throw new Error("The approved isolated first-Preview target is not ready.");
const applicable = envBefore.envs.filter(e => e.target?.includes("preview"));
for (const key of ["VITE_CLERK_PUBLISHABLE_KEY", "QXLAYER_EXTERNAL_ENVIRONMENT",
  "PRODUCTION_ACCESS_CODE", "PRODUCTION_ACCESS_GATE_ENABLED"]) {
  if (!applicable.some(e => e.key === key && !e.gitBranch))
    throw new Error("Required previously configured Preview environment is missing.");
}
if (applicable.some(e => ["DATABASE_URL", "MIGRATION_DATABASE_URL", "CLERK_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_SERVICE_KEY"].includes(e.key)))
  throw new Error("Backend credentials must not be installed on this frontend Preview.");
const root = ".vercel/output";
const config = JSON.parse(await readFile(`${root}/config.json`, "utf8"));
if (JSON.stringify(config.routes) !== JSON.stringify([{ src: "^/(.*)$", dest: "/frontend" }]))
  throw new Error("Preview bootstrap must have no external/API rewrites.");
const uploaded = new Map();
const files = [];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.posix.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Unexpected deployment symlink.");
    if (entry.isDirectory()) await collect(file);
    else {
      // Only prebuilt frontend/gate files; no workspace source, keys or database exports.
      if (entry.name.endsWith(".test.mjs")) continue;
      const bytes = await readFile(file);
      if (/\.(?:js|mjs|html|json)$/.test(file)) {
        const text = bytes.toString("utf8");
        if (/\b(?:sk_(?:live|test)_[A-Za-z0-9]{12,}|pk_live_[A-Za-z0-9]{12,})/.test(text))
          throw new Error("A private or live authentication credential is in the package.");
      }
      const sha = createHash("sha1").update(bytes).digest("hex");
      files.push({ file, sha, size: bytes.length });
      uploaded.set(sha, bytes);
    }
  }
}
await collect(root);
console.info(`Uploading ${files.length} prebuilt files (${uploaded.size} unique blobs); Preview only.`);
const work = [...uploaded.entries()];
let index = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (index < work.length) {
    const [sha, bytes] = work[index++];
    await vercel("/v2/files", "POST", bytes, {
      "Content-Type": "application/octet-stream", "x-vercel-digest": sha,
      "x-now-size": String(bytes.length),
    });
  }
}));
const latest = await vercel(`/v7/deployments?projectId=${project}&limit=1`);
if (latest.deployments.length) throw new Error("Concurrent deployment detected; do not create another.");
const deployment = await vercel("/v13/deployments?prebuilt=1&skipAutoDetectionConfirmation=1",
  "POST", {
    name: "qxlayer-staging", project, files, target: "preview",
    autoAssignCustomDomains: false,
    env: { QXLAYER_PREVIEW_BOOTSTRAP: "true" },
    projectSettings: { framework: null, nodeVersion: "24.x" },
    meta: { qxlayerScope: "approved-gated-preview-only", qxlayerApi: "disabled" },
    // Explicit target is essential: the provider promoted the first CLI-style
    // upload when target was omitted, despite its documented Preview default.
  });
const receipt = {
  status: "DEPLOYMENT_CREATED_TARGET_VERIFICATION_PENDING", id: deployment.id,
  url: `https://${deployment.url}`, target: "preview", project,
  providerTarget: deployment.target ?? null,
  apiDisabled: true, externalRewritesAbsent: true,
  privateOrProductionCredentialsPackaged: false, databaseConnected: false,
  customDomainAssignmentRequested: false, productionReleaseRequested: false,
  uploadedFiles: files.length,
};
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
if (![null, undefined, "preview"].includes(deployment.target) ||
    deployment.projectId !== project || !deployment.url)
  throw new Error("Provider returned an unexpected deployment target; reconcile, do not retry.");
receipt.status = "PREVIEW_DEPLOYMENT_CREATED";
console.info(JSON.stringify(receipt));
let final = deployment;
for (let poll = 0; poll < 60 && !["READY", "ERROR", "CANCELED"].includes(final.readyState); poll++) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  final = await vercel(`/v13/deployments/${deployment.id}`);
}
receipt.providerState = final.readyState;
receipt.status = final.readyState === "READY" ? "PREVIEW_READY" : "PREVIEW_NOT_READY";
const after = await vercel(`/v9/projects/${project}`);
const domainsAfter = await vercel(`/v9/projects/${project}/domains`);
const envAfter = await vercel(`/v10/projects/${project}/env`);
const afterRender = await renderState();
receipt.renderUnchanged = beforeRender.signature === afterRender.signature;
receipt.productionTargetUnchanged = JSON.stringify(before.targets?.production ?? null) ===
  JSON.stringify(after.targets?.production ?? null);
receipt.projectDomainsUnchanged = JSON.stringify(domainsBefore.domains) ===
  JSON.stringify(domainsAfter.domains);
receipt.projectEnvironmentUnchanged = JSON.stringify(envBefore.envs) === JSON.stringify(envAfter.envs);
receipt.gitLinkAbsent = !after.link;
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
if (!receipt.renderUnchanged || !receipt.productionTargetUnchanged ||
    !receipt.projectDomainsUnchanged || !receipt.projectEnvironmentUnchanged || !receipt.gitLinkAbsent)
  throw new Error("Provider preservation readback differs; investigate without modifying anything.");
if (final.readyState !== "READY")
  throw new Error(`Preview state ${final.readyState}; no further deployment automatically attempted.`);
console.info(JSON.stringify(receipt));

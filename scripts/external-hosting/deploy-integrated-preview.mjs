/** API-only approved integration. Pin existing targets; never promote, alias or resume a worker. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
if (process.env.QXLAYER_STAGING_API_INTEGRATION_APPROVED !== "true")
  throw new Error("Staging API integration approval required.");
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const sdk = new ReplitConnectors();
async function api(route, method = "GET", body, headers) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await sdk.proxy("vercel", `${route}${route.includes("?") ? "&" : "?"}teamId=${team}`,
      { method, ...(body === undefined ? {} : { body }), ...(headers ? { headers } : {}) });
    // Content-addressed uploads/readbacks can be retried; deployment creation cannot.
    if (r.status === 429 && (method === "GET" || route.startsWith("/v2/files"))) {
      await new Promise(resolve => setTimeout(resolve, 10000 * (attempt + 1)));
      continue;
    }
    if (!r.ok) throw new Error(`Scoped Vercel ${method} HTTP ${r.status}; reconcile before retry.`);
    return route.startsWith("/v2/files") ? null : r.json();
  }
  throw new Error("Scoped upload/readback throttled; no deployment retry.");
}
const previous = JSON.parse(await readFile("generated-artifacts/qxlayer-staging-setup/integrated-preview-deployment.json", "utf8"));
const p = await api(`/v9/projects/${project}`);
const old = await api(`/v13/deployments/${previous.id}`);
if (p.id !== project || p.name !== "qxlayer-staging" || p.accountId !== team ||
    p.link || !p.hasDeployments || old.projectId !== project || old.target === "production")
  throw new Error("Initialized isolated Preview target required.");
const root = ".vercel/output";
const config = JSON.parse(await readFile(`${root}/config.json`, "utf8"));
if (JSON.stringify(config.routes) !== JSON.stringify([
  { src: "^/__qx_access/enter$", dest: "/frontend" },
  { src: "^/api(?:/(.*))?$", dest: "https://qxlayer-api.onrender.com/api/$1" },
  { src: "^/(.*)$", dest: "/frontend" },
])) throw new Error("Only the existing Staging API may be routed.");
const files = [], blobs = new Map();
const priorFiles = await api(`/v6/deployments/${previous.id}/files`);
const available = new Set();
function inventory(nodes) {
  for (const node of nodes) {
    if (node.type === "file" && node.uid) available.add(node.uid);
    if (node.children) inventory(node.children);
  }
}
inventory(priorFiles);
async function collect(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const file = path.posix.join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error("Deployment symlink forbidden.");
    if (e.isDirectory()) await collect(file);
    else if (!e.name.endsWith(".test.mjs")) {
      const bytes = await readFile(file);
      if (/\.(js|mjs|html|json)$/.test(file) &&
          /\b(?:sk_(?:test|live)_[A-Za-z0-9]{12,}|pk_live_[A-Za-z0-9]{12,})/.test(bytes.toString()))
        throw new Error("Private/live credential forbidden in frontend package.");
      const sha = createHash("sha1").update(bytes).digest("hex");
      files.push({ file, sha, size: bytes.length }); blobs.set(sha, bytes);
    }
  }
}
await collect(root);
const work = [...blobs].filter(([sha]) => !available.has(sha)); let index = 0;
console.info(`Uploading ${work.length} changed blobs; ${available.size} previous file identities inspected.`);
await Promise.all(Array.from({ length: 3 }, async () => {
  while (index < work.length) {
    const [sha, bytes] = work[index++];
    await api("/v2/files", "POST", bytes, { "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha, "x-now-size": String(bytes.length) });
  }
}));
const d = await api("/v13/deployments?prebuilt=1&skipAutoDetectionConfirmation=1", "POST", {
  name: "qxlayer-staging", project, files, autoAssignCustomDomains: false,
  projectSettings: { framework: null, nodeVersion: "24.x" },
  meta: { qxlayerScope: "approved-api-only-staging-preview", qxlayerApi: "existing-staging-render" },
  // Omitted target selects ordinary Preview on this already initialized project.
});
const receipt = { status: "CREATED_VERIFYING", id: d.id, project, url: `https://${d.url}`,
  providerTarget: d.target ?? null, apiOrigin: "https://qxlayer-api.onrender.com",
  apiDisabled: false, workerActivated: false, productionChanged: false, dnsChanged: false };
const out = "generated-artifacts/qxlayer-staging-setup/integrated-preview-deployment.json";
await writeFile(out, JSON.stringify(receipt, null, 2) + "\n");
if (d.projectId !== project || ![null, undefined, "preview"].includes(d.target))
  throw new Error("Unexpected provider target; do not repeat upload.");
let final = d;
for (let i = 0; i < 60 && !["READY", "ERROR", "CANCELED"].includes(final.readyState); i++) {
  await new Promise(r => setTimeout(r, 5000));
  final = await api(`/v13/deployments/${d.id}`);
}
if (final.projectId !== project || final.readyState !== "READY" ||
    ![null, undefined, "preview"].includes(final.target))
  throw new Error("Integrated Preview did not pass provider verification.");
receipt.status = "PREVIEW_READY"; receipt.providerState = final.readyState;
await writeFile(out, JSON.stringify(receipt, null, 2) + "\n");
console.info(JSON.stringify(receipt));

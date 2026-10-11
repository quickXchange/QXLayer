/**
 * Temporary loopback-only browser test bridge to the deployed Staging Preview.
 * Provider automation credentials and the existing Staging gate cookie stay in
 * memory. Protection is never disabled; the temporary bypass is revoked on exit.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
const sdk = new ReplitConnectors();
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const receipt = JSON.parse(await readFile(
  "generated-artifacts/qxlayer-staging-setup/preview-deployment.json", "utf8"));
if (process.env.QXLAYER_PREVIEW_VERIFICATION_APPROVED !== "true" ||
    receipt.project !== project || receipt.status !== "PREVIEW_READY" ||
    !/^https:\/\/qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(receipt.url))
  throw new Error("Only the approved READY Staging Preview may be verified.");
async function vercel(route, method = "GET", body) {
  const response = await sdk.proxy("vercel", `${route}?teamId=${team}`,
    { method, ...(body ? { body } : {}) });
  if (!response.ok) throw new Error(`Scoped verification API HTTP ${response.status}`);
  return response.json();
}
const p = await vercel(`/v9/projects/${project}`);
const d = await vercel(`/v13/deployments/${receipt.id}`);
if (p.id !== project || p.name !== "qxlayer-staging" ||
    d.projectId !== project || d.readyState !== "READY" || d.target === "production")
  throw new Error("Preview identity changed.");
const originalBypasses = Object.keys(p.protectionBypass ?? {});
let bypass, server, closing;
async function cleanup() {
  if (closing) return;
  closing = true;
  if (server) await new Promise(resolve => server.close(resolve));
  if (bypass) {
    await vercel(`/v1/projects/${project}/protection-bypass`, "PATCH",
      { revoke: { secret: bypass, regenerate: false } });
    console.info("Temporary Staging automation bypass revoked.");
  }
}
process.on("SIGTERM", () => void cleanup().then(() => process.exit()));
process.on("SIGINT", () => void cleanup().then(() => process.exit()));
try {
  const b = await vercel(`/v1/projects/${project}/protection-bypass`, "PATCH",
    { generate: { note: "Temporary QXLayer Staging Preview verification" } });
  bypass = Object.keys(b.protectionBypass ?? {}).find(key => !originalBypasses.includes(key));
  if (!bypass) throw new Error("No temporary automation credential returned.");
  const groupResponse = await fetch(
    "https://api.render.com/v1/env-groups/evg-db5ate8473hc73agdon0",
    { headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` } });
  if (!groupResponse.ok) throw new Error("Staging gate configuration unavailable.");
  const group = await groupResponse.json();
  const env = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
  if (group.environmentId !== "evm-db5ateflot8c73eam1ug" ||
      env.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" ||
      env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging")
    throw new Error("Staging scope or paid-compute hold changed.");
  const auth = { "x-vercel-protection-bypass": bypass, Accept: "text/html" };
  let locked;
  for (let attempt = 0; attempt < 6; attempt++) {
    locked = await fetch(receipt.url, { headers: auth, redirect: "manual" });
    if (locked.status !== 302) break;
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  const gate = await locked.text();
  const csrf = gate.match(/name="csrf" value="([^"]+)"/)?.[1];
  if (locked.status !== 200 || !csrf || !/Private Access/.test(gate)) {
    const location = locked.headers.get("location");
    const redirect = location ? new URL(location, receipt.url) : null;
    throw new Error(`Hosted access gate failed (HTTP ${locked.status}; redirect ${
      redirect ? `${redirect.hostname}${redirect.pathname}` : "none"}).`);
  }
  const csrfCookie = locked.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const unlock = await fetch(`${receipt.url}/__qx_access/enter`, {
    method: "POST", redirect: "manual",
    headers: { ...auth, Cookie: csrfCookie, Origin: receipt.url,
      "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrf, accessCode: env.PRODUCTION_ACCESS_CODE, returnTo: "/" }),
  });
  if (unlock.status !== 303) throw new Error(`Hosted gate unlock failed (HTTP ${unlock.status}).`);
  const session = unlock.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const headers = { ...auth, Cookie: session };
  const checks = [];
  for (const route of ["/", "/sign-in", "/private-label-website/", "/assets/missing-test.js",
    "/api/healthz"]) {
    const response = await fetch(`${receipt.url}${route}`, { headers, redirect: "manual" });
    const body = await response.text();
    const expected = route.startsWith("/api/") ? 503 : route.includes("missing-test") ? 404 : 200;
    if (response.status !== expected) throw new Error(`Hosted route ${route}: HTTP ${response.status}`);
    if (expected === 200 && !body.includes('<div id="root">'))
      throw new Error(`Hosted SPA missing at ${route}`);
    checks.push({ route, httpStatus: response.status });
  }
  await writeFile("generated-artifacts/qxlayer-staging-setup/preview-http-verification.json",
    JSON.stringify({ status: "HOSTED_PREVIEW_GATE_AND_ROUTES_PASSED", previewUrl: receipt.url,
      providerRuntimePreviewGuardPassed: true, accessGateVerified: true,
      stagingGateUnlockVerified: true, checks, apiDisabled: true,
      secretsRecorded: false, protectionDisabled: false }, null, 2) + "\n");
  server = createServer(async (req, res) => {
    try {
      const body = [];
      for await (const chunk of req) body.push(chunk);
      const proxyHeaders = { ...headers, Accept: req.headers.accept ?? "*/*" };
      if (req.headers["content-type"]) proxyHeaders["Content-Type"] = req.headers["content-type"];
      if (req.headers.origin) proxyHeaders.Origin = receipt.url;
      const upstream = await fetch(new URL(req.url, receipt.url), {
        method: req.method, headers: proxyHeaders, redirect: "manual",
        ...(body.length ? { body: Buffer.concat(body) } : {}),
      });
      res.statusCode = upstream.status;
      for (const key of ["content-type", "cache-control", "content-security-policy"])
        if (upstream.headers.has(key)) res.setHeader(key, upstream.headers.get(key));
      const location = upstream.headers.get("location");
      if (location) res.setHeader("location", location.replace(receipt.url, ""));
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.writeHead(502); res.end("Preview verification proxy request failed."); }
  });
  server.listen(4555, "127.0.0.1", () => console.info(
    "Hosted Preview gate/routes passed. Loopback browser bridge ready at http://127.0.0.1:4555"));
  setTimeout(() => void cleanup().then(() => process.exit()), 12 * 60_000).unref();
} catch (error) {
  await cleanup();
  throw error;
}

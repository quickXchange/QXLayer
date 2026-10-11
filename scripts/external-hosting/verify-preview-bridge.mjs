/**
 * Temporary loopback-only browser test bridge to the deployed Staging Preview.
 * Provider automation credentials and the existing Staging gate cookie stay in
 * memory. Protection is never disabled; the temporary bypass is revoked on exit.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const sdk = new ReplitConnectors();
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const integrated = process.env.QXLAYER_VERIFY_INTEGRATED_PREVIEW === "true";
const receipt = JSON.parse(await readFile(
  `generated-artifacts/qxlayer-staging-setup/${integrated ? "integrated-preview-deployment" : "preview-deployment"}.json`, "utf8"));
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
let bypass, server, closing, ownerClient, ownerTicket, ownerUser, ownerTicketStartedAt;
const ownerSessions = new Set();
async function cleanup() {
  if (closing) return;
  closing = true;
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  if (ownerClient) {
    for (const id of ownerSessions) await ownerClient.sessions.revokeSession(id).catch(() => {});
    if (ownerTicket) await ownerClient.signInTokens.revokeSignInToken(ownerTicket.id).catch(() => {});
  }
  if (bypass) {
    const current = await vercel(`/v9/projects/${project}`);
    if (Object.hasOwn(current.protectionBypass ?? {}, bypass))
      await vercel(`/v1/projects/${project}/protection-bypass`, "PATCH",
        { revoke: { secret: bypass, regenerate: false } });
    console.info("Temporary Staging automation bypass revoked.");
  }
}
process.on("SIGTERM", () => void cleanup().then(() => process.exit()));
process.on("SIGINT", () => void cleanup().then(() => process.exit()));
try {
  // Fail before issuing credentials if a prior test listener still owns the port.
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(4555, "127.0.0.1", resolve);
  });
  await new Promise(resolve => probe.close(resolve));
  const note = `Temporary QXLayer Staging verification ${randomUUID()}`;
  const b = await vercel(`/v1/projects/${project}/protection-bypass`, "PATCH",
    { generate: { note } });
  bypass = Object.entries(b.protectionBypass ?? {}).find(([key, value]) =>
    !originalBypasses.includes(key) && value.note === note)?.[0];
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
  async function hostedGet(route, requestHeaders) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const response = await fetch(`${receipt.url}${route}`, { headers: requestHeaders, redirect: "manual" });
      const location = response.headers.get("location");
      if (response.status !== 302 || !location || new URL(location, receipt.url).hostname !== "vercel.com")
        return response;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error("Vercel temporary verification credential did not propagate.");
  }
  const checks = [];
  for (const route of ["/", "/sign-in", "/private-label-website/", "/assets/missing-test.js",
    "/api/healthz", ...(integrated ? ["/api/public/product-catalog"] : [])]) {
    const response = await hostedGet(route,
      { ...headers, Accept: route.startsWith("/api/") ? "application/json" : "text/html" });
    const body = await response.text();
    const expected = route.startsWith("/api/") ? (integrated ? 200 : 503) : route.includes("missing-test") ? 404 : 200;
    if (response.status !== expected) {
      const location = response.headers.get("location");
      const redirect = location ? new URL(location, receipt.url) : null;
      throw new Error(`Hosted route ${route}: HTTP ${response.status}; redirect ${
        redirect ? `${redirect.hostname}${redirect.pathname}` : "none"}`);
    }
    if (expected === 200 && !route.startsWith("/api/") && !body.includes('<div id="root">'))
      throw new Error(`Hosted SPA missing at ${route}`);
    checks.push({ route, httpStatus: response.status });
  }
  if (integrated && process.env.QXLAYER_VERIFY_OWNER_AUTH === "true") {
    if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || !env.CLERK_SECRET_KEY.startsWith("sk_test_"))
      throw new Error("Owner verification is Development-only.");
    const bindings = JSON.parse(env.QXLAYER_STAGING_IDENTITY_BINDINGS ?? "{}");
    if (Object.keys(bindings).length !== 1) throw new Error("Review existing owner binding before testing.");
    ownerUser = Object.keys(bindings)[0];
    const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
    const { createClerkClient } = createRequire(require.resolve("@clerk/express"))("@clerk/backend");
    ownerClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY });
    // Browser-issued tokens carry the authorized Preview azp. Server-created
    // Development session tokens do not; rejecting those is expected protection.
    ownerTicketStartedAt = Date.now();
    ownerTicket = await ownerClient.signInTokens.createSignInToken({ userId: ownerUser, expiresInSeconds: 600 });
  }
  await writeFile(`generated-artifacts/qxlayer-staging-setup/${integrated ? "integrated-preview" : "preview"}-http-verification.json`,
    JSON.stringify({ status: "HOSTED_PREVIEW_GATE_AND_ROUTES_PASSED", previewUrl: receipt.url,
      providerRuntimePreviewGuardPassed: true, accessGateVerified: true,
      stagingGateUnlockVerified: true, checks, apiDisabled: !integrated,
      secretsRecorded: false, protectionDisabled: false }, null, 2) + "\n");
  server = createServer(async (req, res) => {
    try {
      // Test credentials are available only over this loopback listener, never deployed.
      if (ownerTicket && req.url === "/__qx_test_owner_ticket" && req.method === "GET") {
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ ticket: ownerTicket.token })); return;
      }
      if (ownerClient && req.url === "/__qx_test_owner_session" && req.method === "POST") {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const { sessionId } = JSON.parse(Buffer.concat(chunks).toString());
        const s = await ownerClient.sessions.getSession(sessionId);
        if (s.userId !== ownerUser || new Date(s.createdAt).getTime() < ownerTicketStartedAt - 5000)
          throw new Error("Not a new verified Development owner session.");
        ownerSessions.add(s.id); res.writeHead(204); res.end(); return;
      }
      const body = [];
      for await (const chunk of req) body.push(chunk);
      const proxyHeaders = { ...headers, Accept: req.headers.accept ?? "*/*" };
      if (req.headers.authorization) proxyHeaders.Authorization = req.headers.authorization;
      if (req.headers.cookie) proxyHeaders.Cookie += `; ${req.headers.cookie}`;
      if (req.headers["content-type"]) proxyHeaders["Content-Type"] = req.headers["content-type"];
      if (req.headers.origin) proxyHeaders.Origin = receipt.url;
      const target = new URL(req.url, receipt.url);
      if (target.origin !== receipt.url) throw new Error("Verification transport is Preview-origin only.");
      const upstream = await fetch(target, {
        method: req.method, headers: proxyHeaders, redirect: "manual",
        ...(body.length ? { body: Buffer.concat(body) } : {}),
      });
      res.statusCode = upstream.status;
      for (const key of ["content-type", "cache-control", "content-security-policy"])
        if (upstream.headers.has(key)) res.setHeader(key, upstream.headers.get(key));
      const cookies = upstream.headers.getSetCookie();
      if (cookies.length) res.setHeader("Set-Cookie", cookies);
      const location = upstream.headers.get("location");
      if (location) res.setHeader("location", location.replace(receipt.url, ""));
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.writeHead(502); res.end("Preview verification proxy request failed."); }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(4555, "127.0.0.1", resolve);
  });
  console.info("Hosted Preview gate/routes passed. Loopback browser bridge ready at http://127.0.0.1:4555");
  setTimeout(() => void cleanup().then(() => process.exit()), 12 * 60_000).unref();
} catch (error) {
  await cleanup();
  throw error;
}

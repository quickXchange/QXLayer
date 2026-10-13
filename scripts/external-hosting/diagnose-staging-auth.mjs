/** Read-only hosted Staging diagnostics. Never prints credentials or user identifiers. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { stagingContext, render, API, SCOPE, fingerprints } from "./supabase-auth-staging-context.mjs";

const ctx = await stagingContext(), sdk = new ReplitConnectors();
const receipt = JSON.parse(await readFile(`${SCOPE}/linking-fix-release.json`, "utf8"));
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
async function vercel(route) {
  let timer;
  try { return await Promise.race([
    sdk.proxy("vercel", `${route}${route.includes("?") ? "&" : "?"}teamId=${team}`, { method: "GET" }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(Error("Bounded Vercel read timed out.")), 15000); }),
  ]); } finally { clearTimeout(timer); }
}
const report = { readOnly: true, origin: receipt.origin, observedAt: new Date().toISOString(), findings: {} };
const hash = x => createHash("sha256").update(JSON.stringify(x)).digest("hex");
function summarizeLogs(rows) {
  const counts = {};
  for (const row of rows) {
    const labels = Object.fromEntries((row.labels ?? []).map(l => [l.name, l.value]));
    let app = {}; try { app = JSON.parse(row.message); } catch {}
    const rawPath = row.requestPath ?? labels.path ?? app.req?.url ?? "";
    const path = String(rawPath).split("?")[0];
    if (!/^\/(?:api\/(?:supabase-auth|auth|me|auth-config)|account|sign-in|__qx_access)/.test(path)) continue;
    const key = `${row.requestMethod ?? labels.method ?? app.req?.method ?? "?"} ${path} ${row.responseStatusCode ?? labels.statusCode ?? app.res?.statusCode ?? "?"}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return { inspected: rows.length, authRequests: counts };
}
try {
  const before = hash(await fingerprints(ctx.db));
  const [dRes, service, vars, filesRes] = await Promise.all([
    vercel(`/v13/deployments/${receipt.previewId}`), render(`services/${API}`),
    render(`services/${API}/env-vars?limit=100`), vercel(`/v6/deployments/${receipt.previewId}/files`),
  ]);
  if (!dRes.ok || !filesRes.ok) throw Error("Staging deployment readback unavailable.");
  const deployment = await dRes.json(), files = await filesRes.json();
  if (deployment.projectId !== project || deployment.target === "production" || `https://${deployment.url}` !== receipt.origin ||
      service.branch !== "qxlayer-staging") throw Error("Pinned Staging target mismatch.");
  const cfg = { ...ctx.env, ...Object.fromEntries(vars.map(x => { const v = x.envVar ?? x; return [v.key, v.value]; })) };
  report.findings.configuration = {
    ready: deployment.readyState, providerTarget: deployment.target ?? "preview", apiBranch: service.branch,
    originMatches: cfg.QXLAYER_SUPABASE_AUTH_URL === receipt.origin,
    developmentClerk: cfg.CLERK_SECRET_KEY?.startsWith("sk_test_") && cfg.CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"),
    originInClerkParties: (cfg.CLERK_AUTHORIZED_PARTIES ?? "").split(",").includes(receipt.origin),
    trialEnabled: cfg.QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED === "true",
  };
  console.info("Pinned Staging deployment and configuration read back.");
  const flattened = [];
  function walk(nodes, parent = "") { for (const n of nodes) { const p = `${parent}/${n.name}`; if (n.children) walk(n.children, p); else flattened.push({ ...n, path: p }); } }
  walk(files);
  report.findings.publicAssets = flattened.filter(f => /static\/.*(?:index|sign-in|link-existing).*(?:js|html)$/.test(f.path))
    .map(f => ({ path: f.path, uid: f.uid }));
  report.findings.assetContent = [];
  for (const f of flattened.filter(f => /static\/.*(?:index|sign-in|link-existing).*\.js$/.test(f.path)).slice(0, 5)) {
    const r = await vercel(`/v8/deployments/${receipt.previewId}/files/${f.uid}`);
    if (!r.ok) { report.findings.assetContent.push({ path: f.path, http: r.status }); continue; }
    const raw = await r.text();
    let text = raw;
    try { const j = JSON.parse(raw); if (j.data) text = Buffer.from(j.data, "base64").toString(); } catch {}
    let matchesPreparedBundle = null;
    try {
      const local = await readFile(f.path.replace(/^\/src\//, ""));
      matchesPreparedBundle = createHash("sha256").update(local).digest("hex") === createHash("sha256").update(text).digest("hex");
    } catch {}
    report.findings.assetContent.push({ path: f.path, bytes: text.length,
      matchesPreparedBundle,
      clearsCache: /\.clear\(\)/.test(text), hasSessionFailureUI: text.includes("Could not verify your session"),
      hasClerkDeadlineUI: text.includes("Reload sign-in"), hasTimeoutUI: text.includes("The request took too long"),
      destroysSessionObserverBeforeFetch: /\.cancelQueries\(\),[a-zA-Z_$]+&&[a-zA-Z_$]+\.clear\(\)/.test(text),
      validJsContent: /function|const|import/.test(text) });
  }
  console.info("Deployed public JavaScript inspected.");
  await writeFile(`${SCOPE}/hosted-auth-diagnostics.json`, JSON.stringify(report, null, 2));
  // The connector buffers streaming responses: a live log stream cannot be
  // consumed safely through it. Do not leave a diagnostic awaiting forever.
  report.findings.vercelLogs = { unavailable: "Runtime endpoint is a live stream; the connector cannot provide a bounded historical snapshot." };
  const start = new Date(Date.now() - 24 * 3600000).toISOString();
  const logQuery = new URLSearchParams({ ownerId: service.ownerId, resource: API, startTime: start, limit: "100", direction: "backward" });
  try {
    logQuery.set("text", "supabase-auth");
    const rows = (await render(`logs?${logQuery}`)).logs ?? [];
    report.findings.renderLogs = summarizeLogs(rows);
    report.findings.renderLogs.kinds = [...new Set(rows.flatMap(x => x.labels.map(l => l.name)))];
    report.findings.renderLogs.failureCategories = {
      originRejected: rows.filter(x => /Same-origin authentication request required/.test(x.message)).length,
      gateRejected: rows.filter(x => /Production access required/.test(x.message)).length,
      requestTimeout: rows.filter(x => /timeout|timed out/i.test(x.message)).length,
    };
  }
  catch (e) { report.findings.renderLogs = { unavailable: e.message }; }
  const pk = cfg.CLERK_PUBLISHABLE_KEY;
  const host = Buffer.from(pk.replace(/^pk_(?:test|live)_/, ""), "base64").toString().replace(/\$$/, "");
  if (!/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(host)) throw Error("Pinned development Clerk issuer required.");
  report.findings.clerk = {};
  for (const [label, path] of [["script", "/npm/@clerk/clerk-js@5/dist/clerk.browser.js"], ["environment", "/v1/environment?__clerk_api_version=2025-11-10"]]) {
    const started = Date.now();
    const r = await fetch(`https://${host}${path}`, { headers: { Origin: receipt.origin }, redirect: label === "script" ? "follow" : "manual", signal: AbortSignal.timeout(15000) });
    report.findings.clerk[label] = { http: r.status, elapsedMs: Date.now() - started, contentType: r.headers.get("content-type"),
      allowsOrigin: r.headers.get("access-control-allow-origin") };
    if (label === "environment" && r.status === 401) {
      const body = await r.json();
      report.findings.clerk.environment.requiresDevelopmentBrowser = (body.errors ?? []).some(e => /dev.browser|dev_browser|development browser/i.test(`${e.code} ${e.message}`));
    }
    if (!r.bodyUsed) await r.body?.cancel();
  }
  const links = (await ctx.db.query("SELECT count(*)::int AS count FROM vynox_supabase_auth.identity_links")).rows[0];
  report.findings.identityLinks = { count: links.count, changed: false };
  report.businessDataAndPermissionsPreserved = before === hash(await fingerprints(ctx.db));
  await writeFile(`${SCOPE}/hosted-auth-diagnostics.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await ctx.db.end(); }

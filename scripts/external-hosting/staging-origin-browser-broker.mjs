/** Exact-origin mobile investigation; temporary, unprivileged fixtures only. */
import { createServer } from "node:http";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { stagingContext, admin, fingerprints, SCOPE } from "./supabase-auth-staging-context.mjs";

if (process.env.QXLAYER_STAGING_BROWSER_TEST_ACCESS_APPROVED !== "true") throw Error("Approved native Staging diagnosis required.");
const gatePassword = process.env.PRODUCTION_ACCESS_CODE;
const c = await stagingContext(), sdk = new ReplitConnectors();
const receipt = JSON.parse(await readFile(`${SCOPE}/linking-fix-release.json`, "utf8"));
const diagnosticOrigin = process.env.QXLAYER_STAGING_DIAGNOSTIC_URL ?? receipt.origin;
if (!/^https:\/\/qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(diagnosticOrigin))
  throw Error("Only an exact Staging Preview origin may be diagnosed.");
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const note = `Exact-origin mobile diagnosis ${randomUUID()}`;
const email = `delivered+origin-${randomUUID()}@resend.dev`, password = `${randomBytes(24).toString("base64url")}aA1!`;
const hash = x => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const before = hash(await fingerprints(c.db));
const links = hash((await c.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows);
let subject, bypass, server, cleaning;
async function api(route, method = "GET", body) {
  const r = await sdk.proxy("vercel", `${route}?teamId=${team}`, { method, ...(body ? { body } : {}) });
  if (!r.ok) throw Error(`Protected Staging read HTTP ${r.status}`);
  return r.json();
}
const p = await api(`/v9/projects/${project}`);
const d = await api(`/v13/deployments/${encodeURIComponent(new URL(diagnosticOrigin).hostname)}`);
if (p.name !== "qxlayer-staging" || !p.ssoProtection || d.projectId !== project ||
    d.target === "production" || d.readyState !== "READY" || `https://${d.url}` !== diagnosticOrigin || !gatePassword)
  throw Error("Exact protected Staging target and gate input required.");
const protections = hash([p.ssoProtection, p.passwordProtection, p.trustedIps]);
async function save(cleaned) {
  await writeFile(`${SCOPE}/origin-browser-scope.json`, JSON.stringify({ project, note, email, subject, origin: diagnosticOrigin, pid: process.pid, cleaned }));
}
async function cleanup() {
  if (cleaning) return cleaning;
  cleaning = (async () => {
    server?.close();
    try {
      if (subject) {
        await c.db.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [subject]);
        await admin(c.key, `/users/${subject}`, "DELETE");
      }
    } finally {
      const current = await api(`/v9/projects/${project}`);
      const exact = bypass ?? Object.entries(current.protectionBypass ?? {}).find(([, v]) => v.note === note)?.[0];
      if (exact) await api(`/v1/projects/${project}/protection-bypass`, "PATCH", { revoke: { secret: exact, regenerate: false } });
      const after = await api(`/v9/projects/${project}`);
      if (Object.values(after.protectionBypass ?? {}).some(v => v.note === note) ||
          protections !== hash([after.ssoProtection, after.passwordProtection, after.trustedIps]) ||
          before !== hash(await fingerprints(c.db)) ||
          links !== hash((await c.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows))
        throw Error("Origin investigation preservation check failed.");
      await save(true);
      await c.db.end();
      console.info("Exact-scope cleanup confirmed: fixture and temporary access removed; data, links and protections unchanged.");
    }
  })();
  return cleaning;
}
process.on("SIGTERM", () => cleanup().then(() => process.exit(0), () => process.exit(1)));
try {
  await save(false);
  const generated = await api(`/v1/projects/${project}/protection-bypass`, "PATCH", { generate: { note } });
  bypass = Object.entries(generated.protectionBypass ?? {}).find(([k, v]) => !Object.hasOwn(p.protectionBypass ?? {}, k) && v.note === note)?.[0];
  if (!bypass) throw Error("Temporary access unavailable.");
  for (let i = 0; i < 10; i++) {
    const r = await fetch(diagnosticOrigin, { headers: { Accept: "text/html", "x-vercel-protection-bypass": bypass,
      "x-vercel-set-bypass-cookie": "true" }, redirect: "manual", signal: AbortSignal.timeout(15000) });
    await r.body?.cancel();
    if (r.status === 307 && new URL(r.headers.get("location"), diagnosticOrigin).origin === diagnosticOrigin) break;
    if (i === 9) throw Error("Provider access not ready.");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  const user = await admin(c.key, "/users", "POST", { email, password, email_confirm: true });
  subject = user.id;
  if (!/^[a-f0-9-]{36}$/i.test(subject ?? "")) throw Error("Fixture identity unavailable.");
  await save(false);
  server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET" || req.url !== "/fixture") { res.writeHead(404).end(); return; }
    res.end(JSON.stringify({ origin: diagnosticOrigin, bypass, gatePassword, email, password }));
  });
  await new Promise(resolve => server.listen(4557, "127.0.0.1", resolve));
  console.info(`Exact-origin mobile broker ready on loopback 4557 for ${diagnosticOrigin}. Protected Preview verified; no secrets printed or persisted.`);
  setTimeout(() => process.kill(process.pid, "SIGTERM"), 10 * 60000).unref();
} catch { await cleanup(); throw Error("Origin browser setup failed safely."); }

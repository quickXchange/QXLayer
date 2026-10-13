/**
 * Ephemeral Staging-only browser harness. No deployments or hosted settings change.
 * Uses disposable unprivileged provider accounts and normal native sign-ins.
 * Serves the actual changed frontend/API under the pinned Staging browser origin
 * via the tester's loopback transport, including the real Private Access form.
 */
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createStaticHandler } from "../../lib/production-access-gate/static-handler.mjs";
import { stagingContext, admin, fingerprints, SCOPE, AUTH_REF } from "./supabase-auth-staging-context.mjs";

if (process.env.QXLAYER_STAGING_LINKING_TEST_APPROVED !== "true")
  throw Error("Explicit Staging linking test scope required.");
const c = await stagingContext();
// Preserve the original test-only credential before loading runtime settings:
// the inherited Staging PRODUCTION_ACCESS_CODE is not the owner-password input.
const gatePasswordForTest = c.env.QXLAYER_STAGING_ACCESS_MODE === "owner-password"
  ? process.env.PRODUCTION_ACCESS_CODE : c.env.QXLAYER_STAGING_ACCESS_CODE;
const origin = c.env.QXLAYER_SUPABASE_AUTH_URL;
if (!/^https:\/\/qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(origin))
  throw Error("Pinned Staging Preview origin required.");
const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const { build } = require("esbuild");
const dir = `${SCOPE}/linking-flow-test`;
await mkdir(dir, { recursive: true });
const scopeFile = `${dir}/disposable-scope.json`;
const recovering = process.argv[2] === "cleanup";
const saved = recovering ? JSON.parse(await readFile(scopeFile, "utf8")) : null;
const before = saved?.publicBaseline ?? await fingerprints(c.db);
const originalLinks = saved?.originalLinks ??
  (await c.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows.filter(x => x.subject !== saved?.subject);
const marker = randomUUID().replaceAll("-", "").slice(0, 12);
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const fixture = { email: `delivered+vynox-link-${marker}@resend.dev`,
  legacyEmail: `vynox-link-${marker}+clerk_test@example.com`, password };
let legacyId = saved?.legacyId, subject = saved?.subject, server, runtimePool, closing = false;
async function scope() {
  await writeFile(scopeFile, JSON.stringify({ ref: AUTH_REF, origin,
    legacyId: legacyId ?? null, subject: subject ?? null, rolesAssigned: false,
    hostedSettingsChanged: false, cleaned: false, publicBaseline: before, originalLinks }), { mode: 0o600 });
}
async function clerk(path, method = "GET", body) {
  const r = await fetch(`https://api.clerk.com/v1${path}`, {
    method, headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`Disposable Clerk fixture HTTP ${r.status}`);
  return r.status === 204 ? {} : r.json();
}
async function cleanup() {
  if (closing) return; closing = true;
  if (server) await new Promise(resolve => server.close(resolve));
  if (runtimePool) await runtimePool.end();
  try {
    if (subject) {
      await c.db.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [subject]);
      await c.db.query("DELETE FROM vynox_supabase_auth.identity_links WHERE subject=$1", [subject]);
      await admin(c.key, `/users/${subject}`, "DELETE");
    }
    if (legacyId) await clerk(`/users/${legacyId}`, "DELETE");
    if (JSON.stringify(await fingerprints(c.db)) !== JSON.stringify(before))
      throw Error("Existing public data/permissions changed.");
    if (JSON.stringify((await c.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows) !== JSON.stringify(originalLinks))
      throw Error("Existing identity links changed.");
    await writeFile(scopeFile, JSON.stringify({ ref: AUTH_REF, origin, cleaned: true,
      disposableAccountsAndSessionsRemoved: true, publicDataAndPermissionsPreserved: true,
      existingIdentityLinksPreserved: true, rolesAssigned: false, hostedSettingsChanged: false }));
    console.info("Staging linking fixtures cleaned; original data, permissions and identity links unchanged.");
  } finally { await c.db.end(); }
}
process.on("SIGTERM", () => void cleanup().then(() => process.exit(0)).catch(() => {
  console.error("Exact Staging fixture cleanup needs review."); process.exit(1);
}));
if (recovering) {
  if (saved.ref !== AUTH_REF || saved.origin !== origin || saved.rolesAssigned !== false)
    throw Error("Exact saved disposable scope required.");
  if (legacyId) {
    const u = await clerk(`/users/${legacyId}`);
    if (!u.email_addresses.some(e => /^vynox-link-[a-f0-9]{12}\+clerk_test@example\.com$/.test(e.email_address)))
      throw Error("Refusing cleanup of a non-fixture Clerk identity.");
  }
  if (subject) {
    const u = await admin(c.key, `/users/${subject}`);
    if (!/^delivered\+vynox-link-[a-f0-9]{12}@resend\.dev$/.test(u.email ?? ""))
      throw Error("Refusing cleanup of a non-fixture Supabase identity.");
  }
  await cleanup(); process.exit(0);
}
try {
  await scope();
  // Verified disposable fixture setup is not an Owner migration or sign-in ticket.
  // The browser must still supply both real password logins and fresh Clerk proof.
  const legacy = await clerk("/users", "POST", { email_address: [fixture.legacyEmail], password });
  legacyId = legacy.id; await scope();
  const created = await admin(c.key, "/users", "POST", { email: fixture.email, password, email_confirm: true });
  subject = created.id;
  if (!/^[a-f0-9-]{36}$/i.test(subject ?? "")) throw Error("Disposable Supabase subject unavailable.");
  await scope();
  const used = await c.db.query(`SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE clerk_user_id=$1)
    OR EXISTS(SELECT 1 FROM public.tenant_memberships WHERE clerk_user_id=$1) AS used`, [legacyId]);
  if (used.rows[0].used) throw Error("Disposable legacy identity must have no role.");
  const result = spawnSync("pnpm", ["--filter", "@workspace/private-label-console", "exec", "vite", "build",
    "--outDir", `${process.cwd()}/${dir}/frontend`], { encoding: "utf8", timeout: 180000,
    env: { ...process.env, NODE_ENV: "production", PORT: "4557", BASE_PATH: "/",
      VITE_EXTERNAL_DEPLOYMENT: "true",
      VITE_QXLAYER_AUTH_PROVIDER: "supabase", VITE_QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
      VITE_CLERK_PUBLISHABLE_KEY: c.env.CLERK_PUBLISHABLE_KEY, VITE_CLERK_PROXY_URL: "" } });
  await writeFile(`${dir}/build.log`, result.stdout + result.stderr);
  if (result.status !== 0) throw Error("Isolated Staging frontend build failed; see build log.");
  // Copy only the public CA; all credentials remain in this process's memory.
  await writeFile(`${dir}/supabase-ca.crt`, c.db.connectionParameters.ssl.ca);
  Object.assign(process.env, c.env, { NODE_ENV: "production", DB_TLS_CA_FILE: `${process.cwd()}/${dir}/supabase-ca.crt`,
    // Match deploy/vercel/handler.mjs, which derives this from VERCEL_URL,
    // rather than the older inherited Render-group frontend origin.
    QXLAYER_PLATFORM_URL: origin,
    QXLAYER_SUPABASE_AUTH_SERVER_KEY: c.key, QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED: "true",
    QXLAYER_STAGING_IDENTITY_BINDINGS: JSON.stringify({
      ...JSON.parse(c.env.QXLAYER_STAGING_IDENTITY_BINDINGS), [legacyId]: legacyId }) });
  const entry = `
    import app from './src/app';
    import { pool } from '@workspace/db';
    export {app,pool};
  `;
  await build({ stdin: { contents: entry, resolveDir: `${process.cwd()}/artifacts/api-server`, loader: "ts" },
    bundle: true, platform: "node", format: "esm", outfile: `${dir}/api.mjs`, logLevel: "silent",
    banner: { js: "import { createRequire } from 'node:module'; const require=createRequire(import.meta.url);" } });
  const api = await import(`../../${dir}/api.mjs`); runtimePool = api.pool;
  const staticHandler = createStaticHandler(`${process.cwd()}/${dir}/frontend`, process.env);
  const { createServer } = await import("node:http");
  server = createServer(async (req, res) => {
    const local = req.headers.host === "127.0.0.1:4557";
    if (req.url === "/__fixture" && local) {
      res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ origin, ...fixture,
        gatePassword: gatePasswordForTest }));
    } else if (req.url?.startsWith("/api/")) api.app(req, res);
    else await staticHandler(req, res);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(4557, "127.0.0.1", resolve); });
  console.info("Isolated native Staging linking harness ready on loopback 4557; no roles, hosted changes or deployments.");
  setTimeout(() => process.kill(process.pid, "SIGTERM"), 30 * 60000).unref();
} catch (e) {
  console.error(e instanceof Error ? e.message.replace(/(?:postgres(?:ql)?:\/\/)\S+/gi, "[redacted]") : "Harness setup failed.");
  await cleanup(); process.exit(1);
}

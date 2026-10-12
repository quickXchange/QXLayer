import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { targetConfiguration } from "../external-postgres/migrate.mjs";
export const AUTH_REF = "muvedavhbpgpdrrnjrih";
export const AUTH_ORIGIN = `https://${AUTH_REF}.supabase.co`;
export const GROUP = "evg-db5ate8473hc73agdon0";
export const API = "srv-db5b47qjnfac739s374g";
export const SCOPE = "generated-artifacts/qxlayer-staging-setup/supabase-auth";
const require = createRequire(new URL("../../lib/db/package.json", import.meta.url));
const { Client } = require("pg");
export async function render(route, method = "GET", body) {
  const r = await fetch(`https://api.render.com/v1/${route}`, { method,
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`Pinned Staging Render ${method} HTTP ${r.status}`);
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
export async function stagingContext() {
  if (process.env.QXLAYER_STAGING_AUTH_INTEGRATION_APPROVED !== "true")
    throw Error("Explicit Staging authentication integration approval required.");
  const group = await render(`env-groups/${GROUP}`);
  const env = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
  if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || env.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" ||
      (env.QXLAYER_AUTH_PROVIDER || "clerk") !== "clerk" || !env.CLERK_SECRET_KEY?.startsWith("sk_test_"))
    throw Error("Existing Clerk/Staging/startup boundaries changed.");
  const key = env.SUPABASE_STORAGE_SERVICE_KEY;
  if (!Object.entries(env).some(([k,v]) => k.includes("SUPABASE") && k.includes("URL") && v === AUTH_ORIGIN) ||
      !key?.startsWith("sb_secret_"))
    throw Error("Existing opaque server key must belong to the pinned Staging origin.");
  const check = await fetch(`${AUTH_ORIGIN}/auth/v1/admin/users?per_page=1&page=1`,
    { headers: { apikey: key }, redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!check.ok) throw Error("Pinned Staging Auth admin capability is unavailable.");
  const ca = group.secretFiles.find(f => f.name === "supabase-ca.crt")?.content;
  if (!ca?.includes("BEGIN CERTIFICATE")) throw Error("Verified Staging CA unavailable.");
  const options = targetConfiguration({ ...env, QXLAYER_EXTERNAL_MIGRATIONS_APPROVED: "true",
    MIGRATION_DATABASE_URL: process.env.QXLAYER_SUPABASE_DATABASE_URL, MIGRATION_EXPECTED_HOST: env.DB_EXPECTED_HOST,
    SUPABASE_PROJECT_REF: AUTH_REF, DB_TLS_CA_FILE: "already-loaded-staging-ca" });
  delete options.caFile;
  const db = new Client({ ...options, ssl: { rejectUnauthorized: true, ca }, enableChannelBinding: true });
  await db.connect();
  if (!db.connection.stream.authorized) { await db.end(); throw Error("Staging TLS was not certificate verified."); }
  return { env, db, key };
}
export async function fingerprints(db) {
  const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const data = {};
  for (const { tablename } of tables.rows) {
    const quoted = `"${tablename.replaceAll('"','""')}"`;
    data[tablename] = (await db.query(`SELECT count(*)::int AS count,
      md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM public.${quoted} t`)).rows[0];
  }
  return data;
}
export async function assertPreserved(db) {
  const before = JSON.parse(await readFile(`${SCOPE}/business-baseline.json`, "utf8"));
  if (JSON.stringify(await fingerprints(db)) !== JSON.stringify(before)) throw Error("Existing Staging business data or permissions changed.");
}
export async function saveScope(scope) {
  await writeFile(`${SCOPE}/fixture-scope.json`, JSON.stringify(scope, null, 2) + "\n", { mode: 0o600 });
  const readback = JSON.parse(await readFile(`${SCOPE}/fixture-scope.json`, "utf8"));
  if (JSON.stringify(readback) !== JSON.stringify(scope)) throw Error("Disposable fixture tracking readback failed.");
}
export async function admin(key, path, method = "GET", body) {
  const r = await fetch(`${AUTH_ORIGIN}/auth/v1/admin${path}`, { method, headers: { apikey: key, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!r.ok && r.status !== 404) throw Error(`Pinned Staging Auth admin HTTP ${r.status}`);
  return r.status === 204 ? {} : r.json();
}

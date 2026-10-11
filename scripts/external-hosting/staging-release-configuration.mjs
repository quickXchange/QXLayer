import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export function validateStagingRelease(env) {
  assert.equal(env.RENDER_API_SERVICE_ID, "srv-db5b47qjnfac739s374g");
  assert.equal(env.VERCEL_ORG_ID, "team_eoJE6FCcm9esuqnRTUsmopzy");
  assert.equal(env.VERCEL_PROJECT_ID, "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx");
  assert.equal(env.QXLAYER_API_ORIGIN, "https://qxlayer-api.onrender.com");
  assert.match(env.SUPABASE_PROJECT_REF ?? "", /^[a-z0-9]+$/);
  const url = new URL(env.MIGRATION_DATABASE_URL);
  assert.equal(url.hostname, env.MIGRATION_EXPECTED_HOST);
  assert.equal(url.pathname, "/postgres");
  assert(["", "5432"].includes(url.port));
  assert(
    (url.hostname === `db.${env.SUPABASE_PROJECT_REF}.supabase.co` &&
      decodeURIComponent(url.username) === "postgres") ||
    (/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(url.hostname) &&
      decodeURIComponent(url.username) === `postgres.${env.SUPABASE_PROJECT_REF}`),
  );
  for (const key of ["RENDER_API_KEY", "VERCEL_TOKEN", "DB_TLS_CA_PEM"])
    assert(env[key], `Missing protected ${key}.`);
  assert.match(env.DB_TLS_CA_PEM, /BEGIN CERTIFICATE/);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { validateStagingRelease(process.env); console.info("Protected Staging configuration validated."); }
  catch { console.error("Protected Staging configuration invalid or incomplete; no deployment attempted."); process.exitCode = 1; }
}

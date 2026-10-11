import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateStagingRelease } from "./staging-release-configuration.mjs";
import { registerRestoredBaseline } from "../external-postgres/register-restored-baseline.mjs";

const fixture = {
  RENDER_API_SERVICE_ID: "srv-db5b47qjnfac739s374g",
  VERCEL_ORG_ID: "team_eoJE6FCcm9esuqnRTUsmopzy",
  VERCEL_PROJECT_ID: "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx",
  QXLAYER_API_ORIGIN: "https://qxlayer-api.onrender.com",
  SUPABASE_PROJECT_REF: "muvedavhbpgpdrrnjrih",
  MIGRATION_EXPECTED_HOST: "db.muvedavhbpgpdrrnjrih.supabase.co",
  MIGRATION_DATABASE_URL: "postgresql://postgres@db.muvedavhbpgpdrrnjrih.supabase.co/postgres",
  RENDER_API_KEY: "synthetic", VERCEL_TOKEN: "synthetic",
  DB_TLS_CA_PEM: "-----BEGIN CERTIFICATE-----synthetic",
};
test("Staging release rejects missing credentials and wrong targets", () => {
  validateStagingRelease(fixture);
  for (const key of ["VERCEL_TOKEN", "RENDER_API_KEY", "DB_TLS_CA_PEM"])
    assert.throws(() => validateStagingRelease({ ...fixture, [key]: "" }));
  assert.throws(() => validateStagingRelease({ ...fixture, RENDER_API_SERVICE_ID: "srv-production" }));
  assert.throws(() => validateStagingRelease({ ...fixture, MIGRATION_EXPECTED_HOST: "another.invalid" }));
  assert.throws(() => validateStagingRelease({ ...fixture, SUPABASE_PROJECT_REF: "syntheticproject" }));
});
test("Production cannot use restored Staging adoption", async () => {
  await assert.rejects(registerRestoredBaseline({ QXLAYER_EXTERNAL_ENVIRONMENT: "production", QXLAYER_RESTORED_BASELINE_APPROVED: "true" }));
});
test("Workflow activation cannot select Production", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/external-release.yml", import.meta.url), "utf8");
  assert.match(workflow, /if: inputs\.approve_release && inputs\.target == 'qxlayer-staging' && vars\.QXLAYER_STAGING_RELEASES_ENABLED/);
  assert.match(workflow, /Validate protected Staging configuration/);
});

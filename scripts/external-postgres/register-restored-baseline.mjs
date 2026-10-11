/**
 * Explicit Staging-only adoption of an already-restored schema. No application
 * DDL or data changes. Exact schema, policies and effective privileges must
 * match before creating the private migration ledger. Never replays bootstrap.
 */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { targetConfiguration } from "./migrate.mjs";
import { verifyTarget } from "./verify-target.mjs";
import { STAGING_SUPABASE_PROJECT } from "../external-hosting/staging-targets.mjs";

export async function registerRestoredBaseline(env = process.env) {
  if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" ||
      env.QXLAYER_RESTORED_BASELINE_APPROVED !== "true")
    throw Error("Explicit restored Staging baseline approval required.");
  const options = targetConfiguration(env);
  if (env.SUPABASE_PROJECT_REF !== STAGING_SUPABASE_PROJECT ||
      !env.QXLAYER_STAGING_EXPECTED_PROJECT_REF ||
      env.SUPABASE_PROJECT_REF !== env.QXLAYER_STAGING_EXPECTED_PROJECT_REF)
    throw Error("Previously verified Staging project pin required.");
  if (options.caFile) {
    options.ssl = { rejectUnauthorized: true, ca: await readFile(options.caFile, "utf8") };
    delete options.caFile;
  }
  const dir = new URL("../../deploy/migrations/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", dir), "utf8"));
  for (const entry of manifest) {
    if (!/^\d{4}_[a-z_]+\.sql$/.test(entry.file) ||
        createHash("sha256").update(await readFile(new URL(entry.file, dir))).digest("hex") !== entry.sha256)
      throw Error("Baseline manifest checksum invalid.");
  }
  const { Client } = createRequire(new URL("../../lib/db/package.json", import.meta.url))("pg");
  const c = new Client(options);
  await c.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'");
    const lock = await c.query("SELECT pg_try_advisory_xact_lock(hashtextextended('qxlayer-external-migrations',0)) AS locked");
    if (!lock.rows[0].locked) throw Error("Migration lock unavailable.");
    await verifyTarget(c);
    if ((await c.query("SELECT to_regclass('qxlayer_migrations.versions') AS ledger")).rows[0].ledger)
      throw Error("Existing ledger requires ordinary readback, not adoption.");
    await c.query("CREATE SCHEMA IF NOT EXISTS qxlayer_migrations");
    await c.query("REVOKE ALL ON SCHEMA qxlayer_migrations FROM PUBLIC");
    await c.query("CREATE TABLE qxlayer_migrations.versions (file text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())");
    await c.query("CREATE TABLE qxlayer_migrations.baseline_provenance (kind text PRIMARY KEY,registered_at timestamptz NOT NULL DEFAULT now())");
    await c.query("INSERT INTO qxlayer_migrations.baseline_provenance(kind) VALUES ('verified-restored-staging')");
    for (const m of manifest)
      await c.query("INSERT INTO qxlayer_migrations.versions(file,sha256) VALUES ($1,$2)", [m.file, m.sha256]);
    await c.query("COMMIT");
    console.info("Verified restored Staging baseline registered; no bootstrap SQL or application data changed.");
  } catch (error) { await c.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await c.end(); }
}

if (process.argv[1]?.endsWith("/register-restored-baseline.mjs"))
  registerRestoredBaseline().catch(() => { console.error("Restored baseline registration stopped."); process.exitCode = 1; });

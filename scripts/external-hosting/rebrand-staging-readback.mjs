/** Pinned READ ONLY cloud schema/data fingerprint; no migrations or row export. */
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { targetConfiguration } from "../external-postgres/migrate.mjs";
import { verifyTarget } from "../external-postgres/verify-target.mjs";
import { assertMigrationReadback } from "../external-postgres/manifest-readback.mjs";
import { STAGING_SUPABASE_PROJECT } from "./staging-targets.mjs";
const require = createRequire(new URL("../../lib/db/package.json", import.meta.url));
const { Client } = require("pg");
if (process.env.QXLAYER_STAGING_REBRAND_APPROVED !== "true") throw Error("Read-only Staging approval required.");
const r = await fetch("https://api.render.com/v1/env-groups/evg-db5ate8473hc73agdon0", {
  headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` },
});
if (!r.ok) throw Error("Pinned Staging configuration unavailable.");
const group = await r.json(), env = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging") throw Error("Staging only.");
const ca = group.secretFiles.find(x => x.name === "supabase-ca.crt")?.content;
if (!ca?.includes("BEGIN CERTIFICATE")) throw Error("Verified Staging CA required.");
const dir = await mkdtemp(path.join(tmpdir(), "vynox-readback-"));
let c;
try {
  const caFile = path.join(dir, "ca.crt"); await writeFile(caFile, ca, { mode: 0o600 });
  const options = targetConfiguration({
    ...env, QXLAYER_EXTERNAL_MIGRATIONS_APPROVED: "true",
    MIGRATION_DATABASE_URL: process.env.QXLAYER_SUPABASE_DATABASE_URL,
    MIGRATION_EXPECTED_HOST: env.DB_EXPECTED_HOST,
    SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT, DB_TLS_CA_FILE: caFile,
  });
  options.ssl = { rejectUnauthorized: true, ca }; delete options.caFile;
  c = new Client(options); await c.connect(); await c.query("BEGIN READ ONLY");
  await verifyTarget(c);
  const versions = await c.query("SELECT file,sha256 FROM qxlayer_migrations.versions ORDER BY file");
  const manifest = JSON.parse(await readFile("deploy/migrations/manifest.json", "utf8"));
  assertMigrationReadback(versions.rows, manifest, {
    QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_AUTH_PROVIDER: env.QXLAYER_AUTH_PROVIDER || "clerk",
  });
  const tables = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const fingerprints = {};
  for (const { tablename } of tables.rows) {
    const quoted = `"${tablename.replaceAll('"','""')}"`;
    const rows = await c.query(`SELECT count(*)::int AS count,
      md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM public.${quoted} t`);
    fingerprints[tablename] = rows.rows[0];
  }
  await c.query("COMMIT");
  const file = "generated-artifacts/qxlayer-staging-setup/vynox-data-fingerprint.json";
  if (process.argv.includes("--compare")) {
    if (JSON.stringify(fingerprints) !== await readFile(file, "utf8")) throw Error("Staging records changed.");
    console.log("Exact Staging business-record fingerprints unchanged after release.");
  } else {
    await writeFile(file, JSON.stringify(fingerprints));
    console.log("Read-only Staging baseline saved; exact schema, ledger, roles and policies verified.");
  }
} finally { await c?.end(); await rm(dir, { recursive: true, force: true }); }

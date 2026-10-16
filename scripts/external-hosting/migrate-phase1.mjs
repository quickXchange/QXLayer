import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { Client } = createRequire(new URL("../../lib/db/package.json", import.meta.url))("pg");
const ddl = await readFile("deploy/migrations/0004_phase1_commerce.sql", "utf8");
const seed = await readFile("deploy/configuration/phase1-default-offers.sql", "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");
const production = process.argv.includes("--protected-production");
const apply = process.argv.includes("--apply-approved-phase1");
let options;
if (production) {
  const r = await fetch("https://api.render.com/v1/env-groups/evg-db936g3bc2fs73cmm5dg", { headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` } });
  assert(r.ok); const group = await r.json(), e = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
  assert.equal(e.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED, "false");
  assert.equal(e.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF, "qcgvhlphalxqzzsxqjhi");
  const url = new URL(process.env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL);
  assert(url.toString() === new URL(e.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL).toString(), "Protected connection scope mismatch");
  assert.equal(decodeURIComponent(url.username), "postgres.qcgvhlphalxqzzsxqjhi"); url.search = "";
  options = { connectionString: url.toString(), ssl: { ca: group.secretFiles.find(f => f.name === "supabase-ca.crt").content, rejectUnauthorized: true, servername: url.hostname }, enableChannelBinding: true };
} else options = { connectionString: process.env.DATABASE_URL };
const c = new Client(options); await c.connect();
try {
  if (!production) assert.equal((await c.query("SELECT current_database() db")).rows[0].db, "heliumdb");
  const before = (await c.query("SELECT md5(string_agg(to_jsonb(p)::text,'' ORDER BY clerk_user_id)) digest FROM public.platform_admins p")).rows[0].digest;
  await c.query("BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'");
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended('qxlayer-phase1-commerce',0)),set_config('app.is_super_admin','true',true),set_config('app.can_write','true',true)");
  await c.query("CREATE SCHEMA IF NOT EXISTS qxlayer_migrations; REVOKE ALL ON SCHEMA qxlayer_migrations FROM PUBLIC");
  await c.query("CREATE TABLE IF NOT EXISTS qxlayer_migrations.phase1_versions(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())");
  for (const [name, sql] of [["commerce-schema", ddl], ["proposed-eur-offers", seed]]) {
    const exists = (await c.query("SELECT sha256 FROM qxlayer_migrations.phase1_versions WHERE name=$1", [name])).rows[0];
    if (exists) { assert.equal(exists.sha256, hash(sql), "Applied phase1 migrations are immutable"); continue; }
    await c.query(sql);
    await c.query("INSERT INTO qxlayer_migrations.phase1_versions(name,sha256) VALUES($1,$2)", [name, hash(sql)]);
  }
  const marketingVersion = "database-owned-marketing";
  if (!(await c.query("SELECT 1 FROM qxlayer_migrations.phase1_versions WHERE name=$1", [marketingVersion])).rowCount) {
    if (!(await c.query("SELECT 1 FROM public.landing_products LIMIT 1")).rowCount) {
      assert(production, "Development marketing baseline must exist; do not fabricate it");
      const source = new Client({ connectionString: process.env.DATABASE_URL });
      await source.connect();
      try {
        assert.equal((await source.query("SELECT current_database() db")).rows[0].db, "heliumdb");
        const columns = ["key","visible","name","description","icon","starting_price","setup_fee","currency","billing_period","status","cta_label","display_order"];
        const rows = (await source.query(`SELECT ${columns.join(",")} FROM public.landing_products ORDER BY display_order,key`)).rows;
        assert.equal(rows.length, 15, "Review changed public marketing baseline before copying");
        for (const row of rows) await c.query(`INSERT INTO public.landing_products(${columns.join(",")}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(",")}) ON CONFLICT(key) DO NOTHING`, columns.map(k => row[k]));
      } finally { await source.end(); }
    }
    await c.query("INSERT INTO qxlayer_migrations.phase1_versions(name,sha256) VALUES($1,$2)", [marketingVersion, hash("copy-current-approved-development-marketing-only-when-target-empty-v1")]);
  }
  assert.equal((await c.query("SELECT md5(string_agg(to_jsonb(p)::text,'' ORDER BY clerk_user_id)) digest FROM public.platform_admins p")).rows[0].digest, before);
  assert.equal((await c.query("SELECT count(*)::int n FROM qxlayer_commerce.methods WHERE approved AND length(trim(instructions))<10")).rows[0].n, 0);
  const summary = { target: production ? "protected-production" : "development", mode: apply ? "applied" : "rollback-rehearsal", ownerPreserved: true, provisionalPurchasesBlocked: true, publicLiveChanged: false, dnsChanged: false };
  await c.query(apply ? "COMMIT" : "ROLLBACK");
  console.log(JSON.stringify(summary));
} finally { await c.query("ROLLBACK").catch(() => {}); await c.end(); }

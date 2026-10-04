import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { pool } from "@workspace/db";
import { coreRegistry } from "./core-registry";

if (process.env.NODE_ENV === "production") throw new Error("Development core upgrade refused in production.");
const c = await pool.connect();
try {
  await c.query(await readFile(new URL("../../lib/db/migrations/core-upgrade.sql", import.meta.url), "utf8"));
  await c.query("BEGIN");
  for (const module of coreRegistry) {
    // Preserve current keys/names/configurations; backfill manifests only once.
    await c.query("INSERT INTO module_catalog (key,name,description,category,sandbox_available,definition) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (key) DO UPDATE SET definition=EXCLUDED.definition WHERE module_catalog.definition='{}'::jsonb", [module.key, module.name, module.description, module.category, module.sandboxAvailable, JSON.stringify(module)]);
    for (const feature of [{ key: module.key, label: module.name }, ...module.features]) await c.query("INSERT INTO entitlement_definitions (key,label,kind,value_type) VALUES ($1,$2,'feature','boolean') ON CONFLICT DO NOTHING", [feature.key, feature.label]);
  }
  const domains = await c.query("SELECT tenant_id FROM tenant_domains WHERE verification_token IS NULL");
  for (const row of domains.rows) await c.query("UPDATE tenant_domains SET verification_token=$2 WHERE tenant_id=$1", [row.tenant_id, `wl-core-${randomBytes(24).toString("hex")}`]);
  await c.query("COMMIT");
  await c.query(await readFile(new URL("../../lib/db/migrations/core-policies.sql", import.meta.url), "utf8"));
  process.stdout.write("Additive development core upgrade applied. Existing clients and assignments preserved.\n");
} catch (e) { await c.query("ROLLBACK"); throw e; }
finally { c.release(); await pool.end(); }
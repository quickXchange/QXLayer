import { readFile } from "node:fs/promises";
import { pool, withDatabase } from "@workspace/db";
import { freezePricingBeforeEdit } from "../../artifacts/api-server/src/modules/commerce/pricing-publication.ts";
if (process.env.NODE_ENV === "production" || process.env.QXLAYER_EXTERNAL_ENVIRONMENT !== "development" || !process.env.REPLIT_DEV_DOMAIN)
  throw new Error("Development-only upgrade; external schema changes require separate scoped execution.");
const c = await pool.connect();
try {
  if ((await c.query("SELECT current_database() AS name")).rows[0]?.name !== "heliumdb")
    throw new Error("Unexpected database target; external schemas require separate scoped execution.");
  await c.query(await readFile(new URL("../../lib/db/migrations/plan-service-entitlements.sql", import.meta.url), "utf8"));
}
finally { c.release(); }
await withDatabase({actorId:"development:plan-service-upgrade",isSuperAdmin:true,canWrite:true}, freezePricingBeforeEdit);
console.log("Development service entitlements and public pricing baseline prepared; no plans, prices or tenant assignments changed.");
await pool.end();

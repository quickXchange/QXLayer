import { readFile } from "node:fs/promises";
import { pool } from "@workspace/db";

if (process.env.NODE_ENV !== "development" || process.env.QXLAYER_DATABASE_PROVIDER === "supabase" ||
    process.env.QXLAYER_OWNED_AUTH_SCHEMA_APPROVED !== "true") {
  throw new Error("Only the explicitly approved Development database may be prepared.");
}
const c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
  await c.query("SET LOCAL qxlayer.auth_schema_approved='yes'");
  await c.query(await readFile(new URL("../../../../deploy/migrations/0003_owned_auth.sql", import.meta.url), "utf8"));
  await c.query("COMMIT");
  console.log("Private Development authentication schema prepared; business data and roles untouched.");
} catch (e) { await c.query("ROLLBACK"); throw e; }
finally { c.release(); await pool.end(); }

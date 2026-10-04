import { readFile } from "node:fs/promises";
import { pool } from "@workspace/db";

if (process.env.NODE_ENV === "production") throw new Error("Development-only catalog installation refused in production.");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const file of ["development-landing-catalog.sql", "landing-catalog-policies.sql"]) {
    await client.query(await readFile(new URL(`../../lib/db/migrations/${file}`, import.meta.url), "utf8"));
  }
  await client.query("COMMIT");
  process.stdout.write("Marketing catalog installed; existing tenants, plans, entitlements and catalog edits preserved.\n");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
import { readFile } from "node:fs/promises";
import { pool } from "@workspace/db";

if (process.env.NODE_ENV === "production") throw new Error("Development-only database setup refused in production.");
try {
  await pool.query(await readFile(new URL("../../lib/db/migrations/development-role.sql", import.meta.url), "utf8"));
  if (process.argv.includes("--role-only")) {
    process.stdout.write("Restricted development runtime role created.\n");
  } else {
    await pool.query(await readFile(new URL("../../lib/db/migrations/development-access.sql", import.meta.url), "utf8"));
    const core = await pool.query("SELECT to_regclass('public.tenant_product_configuration') AS present");
    if (core.rows[0].present) await pool.query(await readFile(new URL("../../lib/db/migrations/core-policies.sql", import.meta.url), "utf8"));
    process.stdout.write("Development RLS runtime grants, predicates, and FORCE RLS applied.\n");
  }
} finally {
  await pool.end();
}
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function readSchema(client) {
  const columns = await client.query(`SELECT c.relname AS table_name,a.attname AS name,
    format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required,
    pg_get_expr(d.adbin,d.adrelid) AS default_value
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`);
  const constraints = await client.query(`SELECT t.relname AS table_name,c.conname AS name,c.contype AS type,
    pg_get_constraintdef(c.oid,true) AS definition,c.convalidated AS validated
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' ORDER BY t.relname,c.conname`);
  const indexes = await client.query(`SELECT t.relname AS table_name,i.relname AS name,
    pg_get_indexdef(i.oid) AS definition,x.indisvalid AS valid
    FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,i.relname`);
  return { columns:columns.rows, constraints:constraints.rows, indexes:indexes.rows };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.NODE_ENV!=="development" || !process.argv.includes("--development-only"))
    throw new Error("Explicit read-only Development metadata capture required.");
  const require = createRequire(new URL("../../lib/db/package.json",import.meta.url));
  const {Client}=require("pg");
  const c = new Client({connectionString:process.env.DATABASE_URL});
  try {
    await c.connect(); await c.query("BEGIN READ ONLY");
    const identity=await c.query("SELECT current_database() AS db,current_user AS actor");
    if(identity.rows[0].db!=="heliumdb" || identity.rows[0].actor!=="postgres")
      throw new Error("Not the recognized Development database.");
    const schema=await readSchema(c);
    await c.query("COMMIT");
    await writeFile(new URL("../../deploy/migrations/schema-reference.json",import.meta.url),JSON.stringify(schema,null,2)+"\n");
    console.info("Captured schema metadata only; no rows or secrets.");
  } finally { await c.end(); }
}

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pool, type DatabaseClient } from "@workspace/db";
import { seedReferenceCatalog } from "./catalog-reference";

if (!process.argv.includes("--approved-reference-import")) throw Error("Explicit catalog import approval required.");
const external=process.env.QXLAYER_DATABASE_PROVIDER==="supabase";
let c:DatabaseClient, externalClient:{end:()=>Promise<void>}|undefined;
if(external) {
  if(process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF!=="qcgvhlphalxqzzsxqjhi" ||
     process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED!=="false") throw Error("Only the pinned protected candidate is approved.");
  const url=new URL(process.env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL!);url.search="";
  if(!decodeURIComponent(url.username).startsWith("postgres.") || url.hostname!==process.env.DB_EXPECTED_HOST)
    throw Error("Reference DDL requires the pinned separate operator connection, never the runtime login.");
  const {Client}=createRequire(new URL("../../../../lib/db/package.json",import.meta.url))("pg");
  const client=new Client({connectionString:url.toString(),ssl:{ca:await readFile(process.env.DB_TLS_CA_FILE!,"utf8"),
    rejectUnauthorized:true,servername:url.hostname},enableChannelBinding:true});
  await client.connect();c=client as DatabaseClient;externalClient=client;
} else c=await pool.connect();
try {
  const sql = await readFile("../../deploy/migrations/0007_global_exchange_catalog.sql","utf8");
  const preserved = ["tenants","platform_admins","tenant_memberships","tenant_domains","tenant_branding","tenant_configuration",
    "tenant_product_configuration","plans","plan_entitlements","tenant_subscriptions","exchange_orders","white_label_requests"];
  const digest = async () => {
    const result:Record<string,unknown> = {};
    for (const table of preserved) result[table]=(await c.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS hash FROM public.${table} t`)).rows[0];
    return result;
  };
  await c.query("BEGIN");
  await c.query("SELECT pg_advisory_xact_lock(hashtext('global-exchange-catalog'))");
  const before = await digest();
  await c.query(sql);
  await c.query("SELECT set_config('app.is_super_admin','true',true),set_config('app.can_write','true',true)");
  await seedReferenceCatalog(c);
  const after = await digest();
  if (JSON.stringify(before)!==JSON.stringify(after)) throw Error("Reference import unexpectedly changed customer/business records.");
  const counts = (await c.query("SELECT kind,count(*)::int AS count FROM global_exchange_catalog GROUP BY kind ORDER BY kind")).rows;
  const links = (await c.query("SELECT kind,count(*)::int AS count FROM global_exchange_catalog_links GROUP BY kind ORDER BY kind")).rows;
  const wrong = await c.query("SELECT 1 FROM global_exchange_catalog WHERE kind='currencies' AND (code IN ('DZD','ILS') OR metadata->'countryCodes' ?| ARRAY['DZ','IL'])");
  if (wrong.rowCount) throw Error("Excluded territory or currency remained selectable.");
  await c.query("COMMIT");
  const proof={approvedAdditiveImport:true,counts,links,existingBusinessPreserved:true,financialExecution:false,
    migrationSha256:createHash("sha256").update(sql).digest("hex")};
  await writeFile("../../generated-artifacts/catalog-reference-"+(process.env.QXLAYER_DATABASE_PROVIDER==="supabase"?"candidate":"development")+".json",JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof));
} catch(e) { await c.query("ROLLBACK"); throw e; }
finally { if(externalClient)await externalClient.end();else c.release(); await pool.end(); }

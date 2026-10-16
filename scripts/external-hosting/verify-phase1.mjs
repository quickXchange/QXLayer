import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
const {Client}=createRequire(new URL("../../lib/db/package.json",import.meta.url))("pg");
const response=await fetch("https://api.render.com/v1/env-groups/evg-db936g3bc2fs73cmm5dg",{headers:{Authorization:`Bearer ${process.env.RENDER_API_KEY}`},redirect:"error"});
assert(response.ok);
const group=await response.json(),env=Object.fromEntries(group.envVars.map(v=>[v.key,v.value]));
assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED,"false");
assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF,"qcgvhlphalxqzzsxqjhi");
const url=new URL(process.env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL);
assert(url.toString()===new URL(env.QXLAYER_PRODUCTION_SUPABASE_DATABASE_URL).toString(),"Protected connection scope mismatch");
assert.equal(decodeURIComponent(url.username),"postgres.qcgvhlphalxqzzsxqjhi");url.search="";
const production=new Client({connectionString:url.toString(),ssl:{ca:group.secretFiles.find(f=>f.name==="supabase-ca.crt").content,rejectUnauthorized:true,servername:url.hostname},enableChannelBinding:true});
const development=new Client({connectionString:process.env.DATABASE_URL});
await Promise.all([production.connect(),development.connect()]);
try{
  await Promise.all([production.query("BEGIN READ ONLY"),development.query("BEGIN READ ONLY")]);
  for(const [name,path] of [["commerce-schema","deploy/migrations/0004_phase1_commerce.sql"],["proposed-eur-offers","deploy/configuration/phase1-default-offers.sql"]]){
    const sha=createHash("sha256").update(await readFile(path)).digest("hex");
    assert.equal((await production.query("SELECT sha256 FROM qxlayer_migrations.phase1_versions WHERE name=$1",[name])).rows[0]?.sha256,sha);
  }
  const policySql="SELECT tablename,policyname,cmd,qual,with_check FROM pg_policies WHERE schemaname='qxlayer_commerce' ORDER BY tablename,policyname";
  const [p,d]=await Promise.all([production.query(policySql),development.query(policySql)]);
  assert.equal(p.rows.length,6);assert.deepEqual(p.rows,d.rows);
  const tables=await production.query(`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,NOT EXISTS(SELECT 1 FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) p(priv) WHERE NOT has_table_privilege('qxlayer_runtime',c.oid,p.priv)) granted FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='qxlayer_commerce' AND c.relkind='r' ORDER BY c.relname`);
  assert.equal(tables.rows.length,4);assert(tables.rows.every(t=>t.relrowsecurity&&t.relforcerowsecurity&&t.granted));
  const guardSql="SELECT prosrc FROM pg_proc WHERE pronamespace='qxlayer_commerce'::regnamespace AND proname='payment_guard'";
  assert.deepEqual((await production.query(guardSql)).rows,(await development.query(guardSql)).rows);
  console.log(JSON.stringify({protectedProduction:true,readOnly:true,immutableMigrationChecksums:true,privatePolicyParity:true,runtimeGrants:true,paymentGuardParity:true,publicCutoverHeld:true,authAndInboxDeliveryNotTested:true}));
}finally{
  await Promise.all([production.query("ROLLBACK"),development.query("ROLLBACK")]);
  await Promise.all([production.end(),development.end()]);
}

import assert from "node:assert/strict";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {protectedOperator,protectedState,REPORT,hash} from "./plan-entitlements-operator.mjs";
const ctx=await protectedOperator(),c=ctx.client;
await c.connect();
try{
 await c.query("BEGIN READ ONLY;SET LOCAL statement_timeout='60s'");
 const file="0006_plan_entitlements.sql",sql=await readFile(new URL(`../../deploy/production-candidate/${file}`,import.meta.url),"utf8");
 assert.equal((await c.query("SELECT sha256 FROM qxlayer_migrations.versions WHERE file=$1",[file])).rows[0]?.sha256,hash(sql));
 const table=(await c.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='qxlayer_commerce.pricing_publication'::regclass")).rows[0];
 assert(table.relrowsecurity&&table.relforcerowsecurity);
 const policy=(await c.query("SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE schemaname='qxlayer_commerce' AND tablename='pricing_publication' ORDER BY policyname")).rows;
 assert.equal(policy.length,2);
 assert.equal(policy.find(p=>p.policyname==="commerce_read")?.qual,"true");
 const write=policy.find(p=>p.policyname==="commerce_write");
 assert.equal(write.cmd,"ALL");assert.equal(write.qual,write.with_check);
 assert(write.qual.includes("app.is_super_admin")&&write.qual.includes("app.can_write"));
 const definitions=(await c.query("SELECT key,kind,value_type FROM entitlement_definitions WHERE key=ANY($1::text[]) ORDER BY key",[["quickex","whitebit","quickex_customer_credentials","whitebit_customer_credentials"]])).rows;
 assert.equal(definitions.length,4);assert(definitions.every(d=>d.kind==="feature"&&d.value_type==="boolean"));
 const snapshot=(await c.query("SELECT revision,payload FROM qxlayer_commerce.pricing_publication WHERE singleton=true")).rows[0];
 assert(snapshot&&/^[a-f0-9]{64}$/.test(snapshot.revision));
 const role=(await c.query("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname='qxlayer_runtime'")).rows[0];
 assert(!role.rolsuper&&!role.rolbypassrls);
 for(const role of ["anon","authenticated","service_role"])
  assert.equal((await c.query("SELECT has_table_privilege($1,'qxlayer_commerce.pricing_publication','SELECT,INSERT,UPDATE,DELETE') allowed",[role])).rows[0].allowed,false);
 let existingDataPreserved=null;
 if(process.argv.includes("--preservation")){
  const baseline=JSON.parse(await readFile(new URL("preservation-baseline.json",REPORT),"utf8"));
  assert.deepEqual(await protectedState(c),baseline);existingDataPreserved=true;
 }
 const report={verified:true,readOnly:true,migrationChecksum:true,forceRls:true,restrictedRuntimeRole:true,serviceDefinitions:4,
  publishedPlans:snapshot.payload.plans.length,publishedAddons:snapshot.payload.addons.length,existingDataPreserved,publicLiveChanged:false,dnsChanged:false};
 await mkdir(REPORT,{recursive:true});await writeFile(new URL("schema-readback.json",REPORT),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await c.query("ROLLBACK").catch(()=>{});await c.end();}

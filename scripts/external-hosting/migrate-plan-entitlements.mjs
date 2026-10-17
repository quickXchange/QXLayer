import assert from "node:assert/strict";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {protectedOperator,protectedState,verifyPublication,encryptedSnapshot,restrictedClient,REPORT,hash} from "./plan-entitlements-operator.mjs";
const apply=process.argv.includes("--apply-approved");
assert(process.argv.includes("--protected-production"),"Explicit protected target required");
if(apply)assert.equal(process.env.VYNOX_PLAN_ENTITLEMENTS_MIGRATION_APPROVED,"true");
const ctx=await protectedOperator(),c=ctx.client;
await c.connect();
const runtime=restrictedClient(ctx);
let stage="preflight",committed=false;
try{
 await runtime.connect();
 await runtime.query("BEGIN;SET LOCAL ROLE qxlayer_runtime");
 const runtimeIdentity=(await runtime.query("SELECT current_user actor,(SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user) bypass")).rows[0];
 assert.equal(runtimeIdentity.actor,"qxlayer_runtime");assert.equal(runtimeIdentity.bypass,false);
 await runtime.query("ROLLBACK");
 await mkdir(REPORT,{recursive:true});
 const migration="0006_plan_entitlements.sql";
 const sql=await readFile(new URL(`../../deploy/production-candidate/${migration}`,import.meta.url),"utf8");
 const manifest=JSON.parse(await readFile(new URL("../../deploy/production-candidate/manifest.json",import.meta.url),"utf8"));
 assert.equal(manifest.find(m=>m.file===migration)?.sha256,hash(sql),"Reviewed migration hash required");
 const before=await protectedState(c);
 const backup=apply?await encryptedSnapshot(ctx):null;
 stage="transaction";
 await c.query("BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';SELECT set_config('qxlayer.external_migration_authorized','yes',true),set_config('app.is_super_admin','true',true),set_config('app.can_write','true',true)");
 await c.query("SELECT pg_advisory_xact_lock(hashtextextended('qxlayer-external-migrations',0)),pg_advisory_xact_lock(hashtextextended('pricing-publication',0))");
 await c.query("LOCK TABLE public.plans,public.addons,qxlayer_commerce.offer_settings IN SHARE ROW EXCLUSIVE MODE");
 const existing=(await c.query("SELECT file,sha256 FROM qxlayer_migrations.versions ORDER BY file")).rows;
 for(const version of existing)assert.equal(manifest.find(m=>m.file===version.file)?.sha256,version.sha256,"Existing immutable migration drift");
 const version=existing.find(v=>v.file===migration);
 if(!version){await c.query(sql);await c.query("INSERT INTO qxlayer_migrations.versions(file,sha256) VALUES($1,$2)",[migration,hash(sql)]);}
 stage="preserve-public-catalog";
 const {freezePricingBeforeEdit}=await import("../../artifacts/api-server/src/modules/commerce/pricing-publication.ts");
 await freezePricingBeforeEdit(c);
 stage="verify-runtime-rls";
 let enforcement=await verifyPublication(c);
 const after=await protectedState(c);
 assert.deepEqual(after,before,"Existing accounts, pricing, tenant records, policies and grants must remain identical");
 await c.query(apply?"COMMIT":"ROLLBACK");
 committed=apply;
 if(apply){
  await writeFile(new URL("preservation-baseline.json",REPORT),JSON.stringify(before,null,2));
  await writeFile(new URL("migration-commit-receipt.json",REPORT),JSON.stringify({migration,checksum:hash(sql),backup,schemaCommitted:true,runtimeAcceptancePending:true},null,2));
  stage="actual-restricted-runtime-readback";
  await runtime.query("BEGIN");
  try{enforcement=await verifyPublication(runtime,{exercise:true});}finally{await runtime.query("ROLLBACK");}
  assert.deepEqual(await protectedState(c),before,"Post-commit preservation must remain exact");
 }
 const report={target:"isolated-protected-production",mode:apply?"applied":"rollback-rehearsal",migration,checksum:hash(sql),backup,
  existingDataPreserved:true,existingPoliciesAndGrantsPreserved:true,entitlementDefinitionsAddedOnly:true,pricingBaselineFrozen:true,enforcement,
  accountOrCredentialMigration:false,workerActivated:false,financialExecutionEnabled:false,publicLiveChanged:false,dnsChanged:false,checkedAt:new Date().toISOString()};
 await writeFile(new URL(apply?"migration-applied.json":"migration-rehearsal.json",REPORT),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}catch(e){await c.query("ROLLBACK").catch(()=>{});console.error(JSON.stringify({stage,failed:true,schemaCommitted:committed,code:e.code??"VERIFICATION_FAILED",message:e.message?.includes("must remain")||e.code==="42501"?e.message:`Operator details withheld; ${committed?"schema applied; acceptance stopped":"transaction rolled back"}`}));process.exitCode=1;}
finally{await runtime.end().catch(()=>{});await c.end();}

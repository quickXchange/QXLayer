import assert from "node:assert/strict";
const group="evg-db936g3bc2fs73cmm5dg",base=`https://api.render.com/v1/env-groups/${group}`;
const headers={Authorization:`Bearer ${process.env.RENDER_API_KEY}`,"Content-Type":"application/json"};
async function get(){const r=await fetch(base,{headers,redirect:"error"});assert(r.ok);return r.json();}
const before=await get(),env=Object.fromEntries(before.envVars.map(v=>[v.key,v.value]));
assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF,"qcgvhlphalxqzzsxqjhi");
assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED,"false");
assert.equal(env.QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED,"true");
const values={QXLAYER_ORDER_EMAIL_API_KEY:process.env.QXLAYER_PRODUCTION_RESEND_SMTP_KEY,
  QXLAYER_ORDER_EMAIL_FROM:"VYNOX LAYER Orders <production-auth@quicklychan.xyz>"};
assert(values.QXLAYER_ORDER_EMAIL_API_KEY);
for(const [key,value] of Object.entries(values)) {
  const r=await fetch(`${base}/env-vars/${key}`,{method:"PUT",headers,body:JSON.stringify({value}),redirect:"error"});
  assert(r.ok,`Scoped sender configuration failed (${r.status})`);
}
const after=await get(),current=Object.fromEntries(after.envVars.map(v=>[v.key,v.value]));
for(const [key,value] of Object.entries(env)) if(!Object.hasOwn(values,key)) assert.equal(current[key],value);
for(const [key,value] of Object.entries(values)) assert.equal(current[key],value);
assert.deepEqual(after.secretFiles,before.secretFiles);
console.log(JSON.stringify({target:"protected-production",senderConfigured:true,existingProductionMailCredentialReused:true,
  unrelatedConfigurationPreserved:true,publicCutover:false,dnsChanged:false,inboxDeliveryVerified:false}));

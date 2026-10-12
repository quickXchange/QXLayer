/**
 * Temporary loopback-only broker for native HTTPS Staging browser verification.
 * Passwords, MFA seeds, private-access code and protection bypass stay in memory.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createServer } from "node:http";
import { randomUUID, randomBytes, createHmac, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { stagingContext, admin, saveScope, assertPreserved, SCOPE, AUTH_REF } from "./supabase-auth-staging-context.mjs";
const ctx = await stagingContext(), sdk = new ReplitConnectors();
const release = JSON.parse(await readFile(`${SCOPE}/release.json`, "utf8"));
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const marker = randomUUID();
const fixtures = Object.fromEntries(["customer","client_admin","super_admin"].map(role => [role, {
  role, email:`delivered+vynox-auth-${marker.replaceAll("-","").slice(0,12)}-${role}@resend.dev`,
  name:`VYNOX disposable ${role}`, password:randomBytes(24).toString("base64url"), nextPassword:randomBytes(24).toString("base64url"),
}]));
const scope = { marker, project, ref:"muvedavhbpgpdrrnjrih", origin:release.origin,
  bypassNote:`Disposable VYNOX Supabase auth verification ${marker}`,
  accounts:Object.values(fixtures).map(x=>({role:x.role,email:x.email})), users:[], memberships:[], admins:[] };
let server, bypass, closing, cleaned = false;
let originalMailLimit;
async function authConfig(body) {
  const r=await fetch(`https://api.supabase.com/v1/projects/${AUTH_REF}/config/auth`,{
    method:body?"PATCH":"GET",headers:{Authorization:`Bearer ${process.env.QXLAYER_STAGING_SUPABASE_AUTH_SETUP_TOKEN}`,"Content-Type":"application/json"},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error(`Pinned Staging mail quota configuration HTTP ${r.status}`);return r.json();
}
const seeds = new Map(), evidence = [];
async function vercel(route, method="GET", body) {
  const r = await sdk.proxy("vercel",`${route}?teamId=${team}`,{method,...(body?{body}:{})});
  if(!r.ok)throw Error(`Scoped Staging protection HTTP ${r.status}`);return r.json();
}
async function users() {
  const all=[];
  for(let page=1;page<=100;page++){const p=await admin(ctx.key,`/users?page=${page}&per_page=100`);
    all.push(...p.users);if(p.users.length<100)return all;}throw Error("Bounded Staging account scan exceeded.");
}
async function syncUsers() {
  for(const u of await users()) if(scope.accounts.some(a=>a.email===u.email)&&!scope.users.includes(u.id))scope.users.push(u.id);
  await saveScope(scope);
}
const originalUsers = await users();
const originalFingerprint = createHash("sha256").update(JSON.stringify(originalUsers)).digest("hex");
const originalProject = await vercel(`/v9/projects/${project}`);
const deployment = await vercel(`/v13/deployments/${release.previewId}`);
if(deployment.projectId!==project||deployment.target==="production"||deployment.readyState!=="READY"||
   release.providerTarget!=="preview")throw Error("Only verified Staging Preview can be tested.");
const originalBypasses = Object.keys(originalProject.protectionBypass??{});
function totp(secret) {
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits="";
  for(const c of secret.toUpperCase().replace(/=+$/,"")){const i=alphabet.indexOf(c);if(i<0)throw Error("Invalid temporary MFA seed");bits+=i.toString(2).padStart(5,"0");}
  const bytes=Buffer.from(bits.match(/.{8}/g).map(x=>parseInt(x,2)));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const h=createHmac("sha1",bytes).update(counter).digest(),offset=h[19]&15;
  return ((h.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,"0");
}
async function mail(role,type) {
  const fixture=fixtures[role];if(!fixture)throw Error("Unplanned disposable account.");
  await syncUsers();
  for(let i=0;i<30;i++){
    const headers={Authorization:`Bearer ${process.env.QXLAYER_STAGING_RESEND_SETUP_KEY}`};
    const response=await fetch("https://api.resend.com/emails",{headers,redirect:"error"});
    if(!response.ok)throw Error(`Staging mail readback HTTP ${response.status}`);
    const items=(await response.json()).data??[];
    for(const item of items.filter(x=>x.to?.includes(fixture.email))) {
      await new Promise(r=>setTimeout(r,600));
      const r=await fetch(`https://api.resend.com/emails/${item.id}`,{headers,redirect:"error"});
      if(!r.ok)throw Error(`Staging message readback HTTP ${r.status}`);
      const m=await r.json();
      const text=(m.html??"").replaceAll("&amp;","&");
      const matches=[...text.matchAll(/href=["']([^"']+)["']/g)];
      for(const match of matches){
        let url;try{url=new URL(match[1])}catch{continue}
        if(url.origin!==release.origin||url.pathname!==(type==="signup"?"/verify-email":"/reset-password")||
           !url.searchParams.get("token_hash"))continue;
        if(m.last_event!=="delivered"){await new Promise(r=>setTimeout(r,1000));continue}
        evidence.push({type:`supabase-generated-${type}`,role,delivery:"delivered",recipientKind:"Resend test recipient"});
        return {url:url.href,delivered:true,supabaseGenerated:true};
      }
    }
    await new Promise(r=>setTimeout(r,2000));
  }
  throw Error("Supabase-generated delivered confirmation/recovery email was not found.");
}
async function assign(role) {
  if(!["client_admin","super_admin"].includes(role))throw Error("Only disposable administrator roles can be assigned.");
  await syncUsers();const u=(await users()).find(u=>u.email===fixtures[role].email);
  if(!u?.email_confirmed_at)throw Error("Confirm disposable account before assigning a temporary role.");
  const business=`supabase:${u.id}`;
  const tenants=(await ctx.db.query(`SELECT t.id FROM public.tenants t WHERE t.status<>'suspended'
    AND NOT EXISTS(SELECT 1 FROM public.white_label_requests w WHERE w.tenant_id=t.id AND w.status<>'delivered')
    ORDER BY t.created_at LIMIT 2`)).rows;
  if(role==="client_admin"&&tenants.length<2)throw Error("Two existing isolated Staging tenants are required for read-only Client Admin isolation tests.");
  if(role==="client_admin"){
    if(!scope.memberships.some(x=>x.businessId===business)){
      scope.memberships.push({tenantId:tenants[0].id,businessId:business});await saveScope(scope);
      await ctx.db.query(`INSERT INTO public.tenant_memberships(tenant_id,clerk_user_id,role,active)
        VALUES($1,$2,'client_admin',true)`,[tenants[0].id,business]);
    }
  }else{
    if(!scope.admins.includes(business)){
      scope.admins.push(business);await saveScope(scope);
      await ctx.db.query("INSERT INTO public.platform_admins(clerk_user_id,active) VALUES($1,true)",[business]);
    }
  }
  return {userId:business,ownTenant:tenants[0]?.id??null,otherTenant:tenants[1]?.id??null};
}
async function cleanup() {
  if(closing)return;closing=true;
  try {
    if(server?.listening)await new Promise(resolve=>server.close(resolve));
    await syncUsers();
    for(const x of scope.memberships)await ctx.db.query("DELETE FROM public.tenant_memberships WHERE tenant_id=$1 AND clerk_user_id=$2",[x.tenantId,x.businessId]);
    for(const id of scope.admins)await ctx.db.query("DELETE FROM public.platform_admins WHERE clerk_user_id=$1",[id]);
    for(const id of scope.users){
      await ctx.db.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1",[id]);
      await ctx.db.query("DELETE FROM vynox_supabase_auth.identity_links WHERE subject=$1",[id]);
      await admin(ctx.key,`/users/${id}`,"DELETE");
    }
    if((await users()).some(u=>scope.users.includes(u.id)||scope.accounts.some(a=>a.email===u.email)))
      throw Error("Temporary Auth users remain.");
    const remaining=(await users()).filter(u=>!scope.users.includes(u.id));
    if(createHash("sha256").update(JSON.stringify(remaining)).digest("hex")!==originalFingerprint)
      throw Error("Existing Supabase identities changed.");
    await assertPreserved(ctx.db);
    cleaned=true;seeds.clear();for(const f of Object.values(fixtures)){f.password="";f.nextPassword="";}
  } finally {
    // Always revoke temporary infrastructure access and restore the bounded
    // mail quota, even if fixture/data readback found a problem.
    try {
      if(bypass){await vercel(`/v1/projects/${project}/protection-bypass`,"PATCH",{revoke:{secret:bypass,regenerate:false}});
        const p=await vercel(`/v9/projects/${project}`);
        if(Object.hasOwn(p.protectionBypass??{},bypass)||Object.keys(p.protectionBypass??{}).length!==originalBypasses.length)
          throw Error("Temporary protection credential cleanup failed.");}
      if(originalMailLimit!==undefined){
        await authConfig({rate_limit_email_sent:originalMailLimit});
        if((await authConfig()).rate_limit_email_sent!==originalMailLimit)throw Error("Staging mail quota restoration failed.");
      }
    }finally{await ctx.db.end();}
  }
  if(cleaned){
    await writeFile(`${SCOPE}/cleanup.json`,JSON.stringify({disposableUsersRemoved:true,temporaryMembershipsRemoved:true,
      temporaryAdminsRemoved:true,temporarySessionsRemoved:true,temporaryProtectionCredentialRevoked:true,
      existingSupabaseIdentitiesUnchanged:true,businessDataAndPermissionsUnchanged:true,clerkUnchanged:true,
      productionActivated:false,dnsChanged:false,secretsRecorded:false,originalMailQuotaRestored:true,evidence},null,2));
    console.info("Disposable Staging users, roles, sessions and protection credential removed; exact business-data baseline unchanged.");
  }
}
process.on("SIGTERM",()=>void cleanup().then(()=>process.exit(cleaned?0:1)).catch(()=>{console.error("Staging QA cleanup requires recovery from the exact fixture manifest.");process.exit(1)}));
process.on("SIGINT",()=>process.kill(process.pid,"SIGTERM"));
try {
  await saveScope(scope);
  originalMailLimit=(await authConfig()).rate_limit_email_sent;
  scope.originalMailLimit=originalMailLimit;await saveScope(scope);
  if(originalMailLimit<30)await authConfig({rate_limit_email_sent:30});
  const b=await vercel(`/v1/projects/${project}/protection-bypass`,"PATCH",{generate:{note:scope.bypassNote}});
  bypass=Object.entries(b.protectionBypass??{}).find(([k,v])=>!originalBypasses.includes(k)&&v.note===scope.bypassNote)?.[0];
  if(!bypass)throw Error("Temporary exact-scope protection credential not returned.");
  server=createServer(async(req,res)=>{
    try{
      res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");
      const url=new URL(req.url,"http://127.0.0.1:4556");
      let value;
      if(req.method==="GET"&&url.pathname==="/meta")value={origin:release.origin,bypass,
        gateCode:ctx.env.QXLAYER_STAGING_ACCESS_MODE==="owner-password"?process.env.PRODUCTION_ACCESS_CODE:ctx.env.QXLAYER_STAGING_ACCESS_CODE,
        accounts:fixtures};
      else if(req.method==="GET"&&url.pathname==="/totp"){const seed=seeds.get(url.searchParams.get("role"));if(!seed)throw Error("Enroll the fixture authenticator first.");value={code:totp(seed)};}
      else if(req.method==="POST"){
        let raw="";for await(const data of req){raw+=data;if(raw.length>4096)throw Error("Broker input too large.");}
        const body=JSON.parse(raw||"{}");if(!fixtures[body.role])throw Error("Unplanned fixture role.");
        if(url.pathname==="/confirmation")value=await mail(body.role,"signup");
        else if(url.pathname==="/recovery")value=await mail(body.role,"recovery");
        else if(url.pathname==="/assign")value=await assign(body.role);
        else if(url.pathname==="/factor"){if(!/^[A-Z2-7]+=*$/i.test(body.secret??""))throw Error("Invalid temporary MFA seed.");seeds.set(body.role,body.secret);value={ok:true};}
        else throw Error("Unsupported loopback broker action.");
      }else throw Error("Unsupported loopback broker route.");
      res.end(JSON.stringify(value));
    }catch{res.writeHead(400);res.end(JSON.stringify({error:"Staging QA broker action failed; no private values logged."}));}
  });
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(4556,"127.0.0.1",resolve)});
  await writeFile(`${SCOPE}/qa-process.json`,JSON.stringify({pid:process.pid,port:4556,origin:release.origin}));
  console.info("Native HTTPS Supabase Staging QA broker ready on loopback port 4556. Temporary values stay in memory.");
  setTimeout(()=>process.kill(process.pid,"SIGTERM"),45*60000).unref();
}catch{
  await cleanup();throw Error("Staging QA setup failed safely.");
}

/**
 * Staging-only owner verification. Never creates credentials, impersonates the
 * owner, modifies permissions, or performs a link. Those actions use native UI.
 * Output/files contain only hashes and safe verification metadata.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { stagingContext, admin, fingerprints, AUTH_REF, AUTH_ORIGIN, SCOPE } from "./supabase-auth-staging-context.mjs";
import { sessionCodec } from "../../artifacts/api-server/src/modules/supabase-auth/crypto.ts";

if(process.env.QXLAYER_STAGING_OWNER_AUTH_APPROVED!=="true")throw Error("Explicit Staging owner verification approval required.");
const mode=process.argv[2]??"status";
if(!["prepare","status","restore"].includes(mode))throw Error("Unsupported owner verification operation.");
const file=`${SCOPE}/owner-verification-baseline.json`;
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
let quotaWritePlanned=false;
async function authConfig(body) {
  const r=await fetch(`https://api.supabase.com/v1/projects/${AUTH_REF}/config/auth`,{
    method:body?"PATCH":"GET",headers:{Authorization:`Bearer ${process.env.QXLAYER_STAGING_SUPABASE_AUTH_SETUP_TOKEN}`,"Content-Type":"application/json"},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error(`Pinned Staging Auth configuration HTTP ${r.status}`);
  return r.json();
}
async function restore() {
  const baseline=JSON.parse(await readFile(file,"utf8"));
  if(baseline.ref!==AUTH_REF)throw Error("Pinned baseline required.");
  const current=await authConfig();
  if(current.rate_limit_email_sent!==baseline.originalMailLimit){
    if(current.rate_limit_email_sent!==baseline.temporaryMailLimit)throw Error("Quota changed independently; review instead of overwriting.");
    await authConfig({rate_limit_email_sent:baseline.originalMailLimit});
  }
  if((await authConfig()).rate_limit_email_sent!==baseline.originalMailLimit)throw Error("Mail quota restoration readback failed.");
  console.info("Original Staging mail quota restored and read back.");
}
if(mode==="restore"){await restore();process.exit(0);}
const c=await stagingContext();
try {
  const bindings=JSON.parse(c.env.QXLAYER_STAGING_IDENTITY_BINDINGS??"{}");
  if(Object.keys(bindings).length!==1)throw Error("Unambiguous existing owner binding required.");
  const [proof,business]=Object.entries(bindings)[0];
  const owner=await c.db.query("SELECT * FROM public.platform_admins WHERE clerk_user_id=$1",[business]);
  if(owner.rowCount!==1||owner.rows[0].active!==true)throw Error("Existing active owner permission required; do not grant or change it.");
  const roster=await admin(c.key,"/users?page=1&per_page=100");
  if(roster.users.length===100)throw Error("Bounded owner roster must be reviewed.");
  if(mode==="prepare"){
    try {
      const previous=JSON.parse(await readFile(file,"utf8"));
      if(previous.ref!==AUTH_REF||previous.bindingHash!==hash(bindings)||previous.ownerRowHash!==hash(owner.rows))
        throw Error("Existing owner baseline changed.");
      if(previous.quotaRestoreDeadline>Date.now())throw Error("An owner verification window is already active.");
    }catch(e){if(e.code!=="ENOENT")throw e;}
    const config=await authConfig();
    if(config.site_url!==c.env.QXLAYER_SUPABASE_AUTH_URL||config.mailer_autoconfirm!==false)
      throw Error("Verified Staging origin and real confirmation required.");
    const publicData=await fingerprints(c.db);
    if(JSON.stringify(publicData)!==await readFile(`${SCOPE}/business-baseline.json`,"utf8").then(x=>JSON.stringify(JSON.parse(x))))
      throw Error("Previously preserved Staging data baseline changed.");
    const baseline={ref:AUTH_REF,origin:config.site_url,bindingHash:hash(bindings),ownerRowHash:hash(owner.rows),
      publicData,originalUserHashes:roster.users.map(u=>hash(u.id)),
      originalMailLimit:config.rate_limit_email_sent,temporaryMailLimit:Math.max(30,config.rate_limit_email_sent),
      quotaRestoreDeadline:Date.now()+40*60000,quotaRestorationPid:process.pid};
    await writeFile(file,JSON.stringify(baseline,null,2),{mode:0o600});
    quotaWritePlanned=true;
    if(config.rate_limit_email_sent!==baseline.temporaryMailLimit)await authConfig({rate_limit_email_sent:baseline.temporaryMailLimit});
    if((await authConfig()).rate_limit_email_sent!==baseline.temporaryMailLimit)throw Error("Temporary mail quota readback failed.");
    console.info("Owner baseline recorded; private browser email checks ready. Temporary quota restores automatically in 40 minutes.");
  }else{
    const baseline=JSON.parse(await readFile(file,"utf8"));
    if(baseline.ref!==AUTH_REF||baseline.bindingHash!==hash(bindings)||baseline.ownerRowHash!==hash(owner.rows)||
       JSON.stringify(await fingerprints(c.db))!==JSON.stringify(baseline.publicData))
      throw Error("Existing owner ID, permissions or business data changed.");
    const links=await c.db.query("SELECT subject,proof_subject FROM vynox_supabase_auth.identity_links WHERE business_id=$1",[business]);
    if(links.rowCount>1||links.rows.some(x=>x.proof_subject!==proof))throw Error("Owner proof binding mismatch.");
    const fresh=roster.users.filter(u=>!baseline.originalUserHashes.includes(hash(u.id)));
    let candidate=links.rowCount?roster.users.find(u=>u.id===links.rows[0].subject):fresh.length===1?fresh[0]:null;
    if(candidate){
      const detail=await admin(c.key,`/users/${candidate.id}`);
      if(detail.id!==candidate.id)throw Error("Pinned owner profile readback mismatch.");
      candidate=detail;
    }
    let aal2=false,recoveryOnly=false,providerValidatedSessions=0,sessionCount=0;
    if(candidate){
      const sessions=await c.db.query("SELECT envelope FROM vynox_supabase_auth.sessions WHERE subject=$1 AND expires_at>now()",[candidate.id]);
      sessionCount=sessions.rowCount;
      for(const row of sessions.rows){
        const p=sessionCodec(c.env.QXLAYER_SUPABASE_AUTH_SESSION_SECRET).open(row.envelope);
        if(p.subject!==candidate.id)throw Error("Owner session identity mismatch.");
        recoveryOnly ||= p.recovery===true;
        const r=await fetch(`${AUTH_ORIGIN}/auth/v1/user`,{headers:{apikey:c.key,Authorization:`Bearer ${p.accessToken}`},
          redirect:"error",signal:AbortSignal.timeout(15000)});
        if(r.ok){
          const u=await r.json();
          if(u.id!==candidate.id)throw Error("Provider session identity mismatch.");
          providerValidatedSessions++;
          // Inspect assurance only after the pinned provider validates the token.
          const claims=JSON.parse(Buffer.from(p.accessToken.split(".")[1],"base64url").toString());
          aal2 ||= claims.aal==="aal2"&&!p.recovery;
        }
      }
    }
    const result={origin:baseline.origin,ownerIdAndSuperAdminPermissionPreserved:true,existingBusinessDataUnchanged:true,
      newAuthUsers:fresh.length,unambiguousCandidate:!!candidate,
      candidateIsNonTestAddress:!!candidate&&!/@(?:resend\.dev|example\.(?:com|org|net)|[^@]+\.invalid)$/i.test(candidate.email??""),
      emailConfirmed:!!candidate?.email_confirmed_at,ownerLinkVerified:links.rowCount===1,
      verifiedTotpEnrolled:!!candidate?.factors?.some(f=>f.factor_type==="totp"&&f.status==="verified"),
      activeAppSessions:sessionCount,providerValidatedSessions,verifiedAal2Session:aal2,recoveryOnlySession:recoveryOnly,
      inboxReceiptRequiresOwnerConfirmation:true};
    await writeFile(`${SCOPE}/owner-verification-status.json`,JSON.stringify(result,null,2),{mode:0o600});
    console.info(JSON.stringify(result));
  }
}catch(e){
  if(quotaWritePlanned)await restore();
  throw e;
}finally{await c.db.end();}
if(mode==="prepare"){
  let terminating=false;
  process.on("SIGTERM",()=>{
    if(terminating)return;terminating=true;
    void restore().then(()=>process.exit(0)).catch(()=>{console.error("Staging mail quota restoration requires review.");process.exit(1);});
  });
  await new Promise(resolve=>setTimeout(resolve,40*60000));
  await restore();
}

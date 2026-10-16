import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const ref = "qcgvhlphalxqzzsxqjhi", group = "evg-db936g3bc2fs73cmm5dg";
const origin = "https://qxlayer-acceptance-vynox3.vercel.app";
const folder = "generated-artifacts/external-finalization";
assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED,"0");
async function call(url, token, method = "GET", body) {
  const r = await fetch(url,{method,redirect:"error",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    ...(body ? {body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(25000)});
  assert(r.ok,`Pinned recovery configuration HTTP ${r.status}`);
  return r.json();
}
try {
  const migrated = JSON.parse(await readFile(`${folder}/production-owner-migration.json`));
  assert(migrated.bindingApprovedByUser && migrated.nativeRecoverySentRecorded);
  const token = process.env.QXLAYER_PRODUCTION_SUPABASE_AUTH_SETUP_TOKEN;
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const before = await call(endpoint,token);
  assert(before.disable_signup && !before.mailer_autoconfirm &&
    before.mfa_totp_enroll_enabled && before.mfa_totp_verify_enabled && before.smtp_pass);
  const redirects = new Set(before.uri_allow_list.split(","));
  redirects.add(`${origin}/reset-password`); redirects.add(`${origin}/verify-email`);
  const patch = { site_url:origin, uri_allow_list:[...redirects].join(","), mailer_otp_exp:3600,
    mailer_subjects_recovery:"Set up your VYNOX LAYER Production password",
    mailer_templates_recovery_content:'<h2>VYNOX LAYER Production</h2><p>Your approved Owner identity and permissions are unchanged.</p><p>First, <a href="{{ .SiteURL }}">open the protected acceptance site</a>, sign in to Vercel if prompted, and complete the private access screen using your previously emailed review code. Do not disable protection.</p><p>Then <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery">continue to password setup</a>. On the website, press “Continue to password setup” when ready. Merely opening this email or landing page does not use the single-use token.</p><p>This link is valid for one hour, replaces previous reset links, and can be used once. After continuing, finish password setup within 15 minutes. Do not forward this email.</p><p>Then sign in with email and password and open Account Security. Any existing verified authenticator remains required; this email does not remove MFA. For first-time Production enrollment, add the separate “VYNOX LAYER Production” authenticator entry and never replace an existing entry.</p><p>If you did not request this, ignore this email.</p>' };
  assert(Object.keys(patch).every(k=>Object.hasOwn(before,k)));
  await call(endpoint,token,"PATCH",patch);
  const after = await call(endpoint,token);
  assert(Object.entries(patch).every(([k,v])=>after[k]===v));
  const derived = new Set(["mailer_subjects_custom_contents","mailer_templates_custom_contents"]);
  assert(Object.keys(before).every(k=>Object.hasOwn(patch,k)||derived.has(k)||JSON.stringify(before[k])===JSON.stringify(after[k])));
  const renderToken = process.env.RENDER_API_KEY;
  const r = await call(`https://api.render.com/v1/env-groups/${group}`,renderToken);
  const env = Object.fromEntries(r.envVars.map(x=>[x.key,x.value]));
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_PROJECT_REF,ref);
  assert.equal(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_CUTOVER_APPROVED,"false");
  assert.equal(env.QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED,"true");
  // User has explicitly reported receipt of the native setup email (its link
  // expired). This proves mail delivery, NOT redemption or Owner MFA acceptance.
  if(env.QXLAYER_PRODUCTION_SUPABASE_AUTH_MAIL_READY!=="true")
    await call(`https://api.render.com/v1/env-groups/${group}/env-vars/QXLAYER_PRODUCTION_SUPABASE_AUTH_MAIL_READY`,
      renderToken,"PUT",{value:"true"});
  const check = await call(`https://api.render.com/v1/env-groups/${group}`,renderToken);
  assert(check.envVars.some(x=>x.key==="QXLAYER_PRODUCTION_SUPABASE_AUTH_MAIL_READY"&&x.value==="true"));
  const report = { nativeRecoveryTemplateVerified:true, protectedAcceptanceRedirectVerified:true,
    nativeLinkLifetimeSeconds:3600, applicationRecoverySessionLifetimeMinutes:15,
    emailDeliveryEvidence:"User reports receiving the native Production password-setup link, now expired",
    emailDeliveryVerifiedByUserReceipt:true, ownerEmailOwnershipNotInferred:true,
    mailReadyConfigured:true, runtimeRestartRequired:true, ownerIdentityOrPermissionsChanged:false,
    publicLiveChanged:false,dnsChanged:false };
  await writeFile(`${folder}/production-recovery-repair.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} catch(error) {console.error(JSON.stringify({recoveryRepairBlocked:true,code:error.code??"BLOCKED",privateDetailsSuppressed:true}));process.exitCode=1;}

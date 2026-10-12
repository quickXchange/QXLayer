import { ReplitConnectors } from "@replit/connectors-sdk";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { stagingContext, render, fingerprints, assertPreserved, AUTH_REF, GROUP, API, SCOPE } from "./supabase-auth-staging-context.mjs";
import { verifyTarget } from "../external-postgres/verify-target.mjs";
const ctx = await stagingContext();
const sdk = new ReplitConnectors(), repo = "quickXchange/QXLayer", branch = "qxlayer-staging";
async function gh(route) {
  // The approved native Git credential can follow GitHub's renamed-repository
  // alias. Never forward it outside api.github.com or to an arbitrary redirect.
  let url = `https://api.github.com/repos/${repo}/${route}`;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json" }, redirect: "manual", signal: AbortSignal.timeout(30000) });
    if ([301,302,307,308].includes(r.status)) {
      const next = new URL(r.headers.get("location") || "");
      if (next.protocol !== "https:" || next.hostname !== "api.github.com" || next.username || next.password ||
          !/^\/repositories\/[0-9]+\//.test(next.pathname)) throw Error("Unapproved GitHub source redirect.");
      url = next.href; continue;
    }
    if (!r.ok) throw Error(`Pinned source readback HTTP ${r.status}`);
    return r.json();
  }
  throw Error("Too many source alias redirects.");
}
function run(file, env) {
  const r = spawnSync("node", [file], { env: { ...process.env, ...env }, stdio: "inherit" });
  if (r.status) throw Error(`Staging integration stopped at ${file}.`);
}
let commit, origin, main;
try {
  main = await gh("git/ref/heads/main");
  const api = await render(`services/${API}`), worker = await render("services/srv-db5b48o473hc73ah56d0");
  if (api.branch !== branch || api.autoDeploy !== "no" || api.serviceDetails.plan !== "starter" || worker.suspended !== "suspended")
    throw Error("Staging service boundary changed.");
  await verifyTarget(ctx.db);
  await mkdir(SCOPE, { recursive: true });
  // Never overwrite an earlier baseline after fixtures or partial work.
  try { await readFile(`${SCOPE}/business-baseline.json`); await assertPreserved(ctx.db); }
  catch (e) {
    if (e.code !== "ENOENT") throw e;
    await writeFile(`${SCOPE}/business-baseline.json`, JSON.stringify(await fingerprints(ctx.db)));
  }
  await ctx.db.query(await readFile("deploy/migrations/004-supabase-auth-staging.sql", "utf8"));
  const grants = await ctx.db.query(`SELECT has_schema_privilege('qxlayer_app','vynox_supabase_auth','USAGE') app,
    has_schema_privilege('anon','vynox_supabase_auth','USAGE') anon,
    has_schema_privilege('authenticated','vynox_supabase_auth','USAGE') authenticated`);
  if (!grants.rows[0].app || grants.rows[0].anon || grants.rows[0].authenticated) throw Error("Auth schema grants failed.");
  await assertPreserved(ctx.db);
  const temp = await mkdtemp(path.join(tmpdir(), "vynox-auth-source-"));
  const env = { ...process.env }; for (const k of Object.keys(env)) if (/^GIT_(TRACE|CURL_VERBOSE)/.test(k)) delete env[k];
  const helper = '!node -e \'process.stdout.write("username=x-access-token\\npassword="+process.env.GITHUB_TOKEN+"\\n")\'';
  function git(args, extra = {}) {
    const r = spawnSync("git", ["-c", "credential.helper=", "-c", `credential.helper=${helper}`, ...args],
      { env: { ...env, ...extra }, encoding: "utf8" });
    if (r.status) throw Error("Scoped Staging Git operation failed; credentials suppressed.");
    return r.stdout.trim();
  }
  try {
    if (git(["remote","get-url","origin"]) !== `https://github.com/${repo}.git`) throw Error("Unexpected repository.");
    const prior = git(["ls-remote","origin",`refs/heads/${branch}`]).split(/\s/)[0];
    if (!/^[a-f0-9]{40}$/.test(prior)) throw Error("Prior Staging source unavailable.");
    git(["fetch","--no-tags","origin",prior]);
    const index = { GIT_INDEX_FILE: path.join(temp,"index") };
    git(["read-tree","HEAD"],index);
    git(["add","--","artifacts","lib","scripts","deploy"],index);
    const tree = git(["write-tree"],index);
    commit = git(["commit-tree",tree,"-p",prior,"-m","Add isolated Staging Supabase authentication trial; preserve Clerk and business identities"], {
      ...index, GIT_AUTHOR_NAME:"VYNOX LAYER Release",GIT_AUTHOR_EMAIL:"release@users.noreply.github.com",
      GIT_COMMITTER_NAME:"VYNOX LAYER Release",GIT_COMMITTER_EMAIL:"release@users.noreply.github.com" });
    git(["push","origin",`${commit}:refs/heads/${branch}`]);
  } finally { await rm(temp,{recursive:true,force:true}); }
  const vars = await gh(`environments/${branch}/variables`);
  const cfg = Object.fromEntries(vars.variables.map(v=>[v.name,v.value]));
  run("scripts/external-hosting/build-frontends.mjs", { ...cfg,
    QXLAYER_EXTERNAL_ENVIRONMENT:"staging",QXLAYER_AUTH_PROVIDER:"supabase",
    QXLAYER_API_ORIGIN:"https://qxlayer-api.onrender.com", QXLAYER_CLERK_DEVELOPMENT_HOST:ctx.env.QXLAYER_CLERK_DEVELOPMENT_HOST,
    VITE_CLERK_PUBLISHABLE_KEY:ctx.env.CLERK_PUBLISHABLE_KEY,VITE_CLERK_PROXY_URL:"" });
  run("scripts/external-hosting/deploy-integrated-preview.mjs", { QXLAYER_STAGING_API_INTEGRATION_APPROVED:"true" });
  const receipt = JSON.parse(await readFile("generated-artifacts/qxlayer-staging-setup/integrated-preview-deployment.json","utf8"));
  if (receipt.status !== "PREVIEW_READY" || !/^https:\/\/qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(receipt.url) ||
      ![null,"preview"].includes(receipt.providerTarget)) throw Error("Verified Preview origin required.");
  origin = receipt.url;
  const sessionSecret = ctx.env.QXLAYER_SUPABASE_AUTH_SESSION_SECRET || randomBytes(48).toString("base64url");
  const trial = { QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED:"true",QXLAYER_SUPABASE_AUTH_URL:origin,
    QXLAYER_SUPABASE_AUTH_PROJECT_REF:AUTH_REF,QXLAYER_SUPABASE_AUTH_SERVER_KEY:ctx.key,
    QXLAYER_SUPABASE_AUTH_SESSION_SECRET:sessionSecret,QXLAYER_SUPABASE_AUTH_MAIL_READY:"true",
    // Existing Clerk frontend/origin/keys/provider remain, adding only the dual-proof trial caller.
    CLERK_AUTHORIZED_PARTIES:[...new Set([...(ctx.env.CLERK_AUTHORIZED_PARTIES||"").split(",").filter(Boolean),origin])].join(",") };
  for (const target of [`env-groups/${GROUP}`,`services/${API}`])
    for (const [key,value] of Object.entries(trial)) await render(`${target}/env-vars/${key}`,"PUT",{value});
  const config = { site_url:origin,uri_allow_list:`${origin}/verify-email,${origin}/reset-password`,
    mailer_templates_confirmation_content:'<h2>Verify your VYNOX LAYER email</h2><p><a href="{{ .SiteURL }}/verify-email?token_hash={{ .TokenHash }}&type=signup">Verify email</a></p><p>If you did not create this account, ignore this message.</p>',
    mailer_templates_recovery_content:'<h2>Reset your VYNOX LAYER password</h2><p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset password</a></p><p>If you did not request this, ignore this message.</p>' };
  const patch = await fetch(`https://api.supabase.com/v1/projects/${AUTH_REF}/config/auth`, { method:"PATCH",
    headers:{Authorization:`Bearer ${process.env.QXLAYER_STAGING_SUPABASE_AUTH_SETUP_TOKEN}`,"Content-Type":"application/json"},
    body:JSON.stringify(config),redirect:"error",signal:AbortSignal.timeout(30000) });
  if (!patch.ok) throw Error(`Pinned Auth callback configuration HTTP ${patch.status}`);
  const readback = await fetch(`https://api.supabase.com/v1/projects/${AUTH_REF}/config/auth`,
    {headers:{Authorization:`Bearer ${process.env.QXLAYER_STAGING_SUPABASE_AUTH_SETUP_TOKEN}`},redirect:"error"});
  if (!readback.ok) throw Error("Auth callback readback unavailable.");
  const current = await readback.json();
  for (const [k,v] of Object.entries(config)) if(current[k]!==v) throw Error("Auth callback/template readback failed.");
  if (!current.mailer_autoconfirm || current.mailer_autoconfirm === false) { /* confirmation remains required */ }
  else throw Error("Email confirmation was unexpectedly disabled.");
  run("scripts/external-hosting/release-render.mjs", { GITHUB_SHA:commit,RENDER_API_SERVICE_ID:API,
    QXLAYER_EXTERNAL_RELEASES_APPROVED:"true",QXLAYER_EXTERNAL_ENVIRONMENT:"staging" });
  if ((await gh("git/ref/heads/main")).object.sha !== main.object.sha) throw Error("Main changed.");
  if ((await render("services/srv-db5b48o473hc73ah56d0")).suspended !== "suspended") throw Error("Worker changed.");
  await assertPreserved(ctx.db);
  await writeFile(`${SCOPE}/release.json`,JSON.stringify({origin,commit,previewId:receipt.id,providerTarget:"preview",
    clerkProviderPreserved:true,legacyOriginPreserved:ctx.env.QXLAYER_PLATFORM_URL,mainUnchanged:true,
    businessDataPreserved:true,workerSuspended:true,productionActivated:false,dnsChanged:false},null,2));
  console.info(`Parallel Supabase Staging trial released: ${origin}. Existing Clerk remains the default.`);
} finally { await ctx.db.end(); }

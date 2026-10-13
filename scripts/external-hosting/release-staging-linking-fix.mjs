/** Explicit Preview-only authentication release. No migrations, aliases or identity writes. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { stagingContext, render, fingerprints, API, GROUP, SCOPE } from "./supabase-auth-staging-context.mjs";

if (process.env.QXLAYER_STAGING_LINKING_RELEASE_APPROVED !== "true")
  throw Error("Explicit protected Staging-only release approval required.");
const ctx = await stagingContext(), sdk = new ReplitConnectors();
const branch = "qxlayer-staging", project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const team = "team_eoJE6FCcm9esuqnRTUsmopzy", workerId = "srv-db5b48o473hc73ah56d0";
const paths = [
  "artifacts/private-label-console/src/App.tsx",
  "artifacts/private-label-console/src/components/auth/auth-ui.tsx",
  "artifacts/private-label-console/src/components/auth/clerk-load-boundary.tsx",
  "artifacts/private-label-console/src/lib/auth-query-transition.ts",
  "artifacts/private-label-console/src/lib/supabase-auth-client.ts",
  "artifacts/private-label-console/src/pages/account-security.tsx",
  "lib/api-client-react/src/custom-fetch.ts",
  "lib/api-client-react/src/index.ts",
  "lib/api-client-react/src/request-deadline.ts",
  "artifacts/api-server/src/modules/supabase-auth/session.ts",
  "artifacts/api-server/src/routes/supabase-auth.ts",
  "artifacts/private-label-console/src/lib/existing-account-link.ts",
  "artifacts/private-label-console/src/pages/link-existing.tsx",
  "artifacts/private-label-console/src/pages/sign-in.tsx",
  "artifacts/private-label-console/src/pages/two-factor.tsx",
  "lib/api-client-react/src/generated/api.schemas.ts",
  "lib/api-spec/supabase-auth.yaml",
  "lib/api-zod/src/generated/api.ts",
  "lib/api-zod/src/generated/types/supabaseSession.ts",
];
const cleanEnv = { ...process.env };
for (const k of Object.keys(cleanEnv)) if (/^GIT_(TRACE|CURL_VERBOSE)/.test(k)) delete cleanEnv[k];
const helper = '!node -e \'process.stdout.write("username=x-access-token\\npassword="+process.env.GITHUB_TOKEN+"\\n")\'';
function git(args, extra = {}) {
  const r = spawnSync("git", ["-c", "credential.helper=", "-c", `credential.helper=${helper}`, ...args],
    { env: { ...cleanEnv, ...extra }, encoding: "utf8" });
  if (r.status) throw Error("Scoped Git operation failed; private credential details suppressed.");
  return r.stdout.trim();
}
function run(file, env) {
  const r = spawnSync("node", [file], { env: { ...cleanEnv, ...env }, stdio: "inherit" });
  if (r.status) throw Error(`Staging release stopped at ${file}.`);
}
async function vercel(route) {
  const r = await sdk.proxy("vercel", `${route}${route.includes("?") ? "&" : "?"}teamId=${team}`);
  if (!r.ok) throw Error(`Protected Vercel readback HTTP ${r.status}`);
  return r.json();
}
function values(items) { return Object.fromEntries(items.map(x => { const v = x.envVar ?? x; return [v.key, v.value]; })); }
const hash = x => createHash("sha256").update(JSON.stringify(x)).digest("hex");
function protection(p) {
  return { sso: p.ssoProtection, password: p.passwordProtection, trusted: p.trustedIps,
    production: p.targets?.production, productionEnv: p.env?.filter(x => x.target?.includes("production")) };
}
try {
  if (git(["remote", "get-url", "origin"]) !== "https://github.com/quickXchange/QXLayer.git")
    throw Error("Unexpected source repository.");
  const [api, worker, p, priorReceipt, serviceVars] = await Promise.all([
    render(`services/${API}`), render(`services/${workerId}`),
    vercel(`/v9/projects/${project}`),
    readFile("generated-artifacts/qxlayer-staging-setup/integrated-preview-deployment.json", "utf8").then(JSON.parse),
    render(`services/${API}/env-vars?limit=100`),
  ]);
  const cfg = { ...ctx.env, ...values(serviceVars) };
  if (api.branch !== branch || api.autoDeploy !== "no" || api.serviceDetails.plan !== "starter" ||
      worker.suspended !== "suspended" || cfg.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" ||
      cfg.QXLAYER_DATABASE_PROVIDER !== "supabase" || (cfg.QXLAYER_AUTH_PROVIDER || "clerk") !== "clerk" ||
      cfg.QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED !== "true" || !cfg.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
      p.id !== project || p.name !== "qxlayer-staging" || p.accountId !== team || p.link ||
      !p.ssoProtection || cfg.QXLAYER_STAGING_ACCESS_MODE !== "owner-password")
    throw Error("Protected Staging target/provider/worker boundaries changed.");
  const prev = await vercel(`/v13/deployments/${priorReceipt.id}`);
  if (prev.projectId !== project || prev.target === "production" || prev.readyState !== "READY")
    throw Error("Existing protected Preview required.");
  const oldOrigin = `https://${prev.url}`;
  if (cfg.QXLAYER_SUPABASE_AUTH_URL !== oldOrigin) throw Error("Current Staging authentication origin mismatch.");
  const mainBefore = git(["ls-remote", "origin", "refs/heads/main"]).split(/\s/)[0];
  const prior = git(["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s/)[0];
  if (![prior, mainBefore].every(x => /^[a-f0-9]{40}$/.test(x))) throw Error("Pinned branch readback unavailable.");
  git(["fetch", "--no-tags", "origin", prior]);
  const diff = git(["diff", "--name-only", prior, "HEAD", "--", "artifacts", "lib", "package.json", "pnpm-lock.yaml"])
    .split("\n").filter(Boolean);
   if (diff.some(x => !paths.includes(x) && !/\.test\.tsx?$/.test(x)))
    throw Error(`Unrelated runtime changes require review: ${diff.filter(x => !paths.includes(x)).join(", ")}`);
  const publicBefore = hash(await fingerprints(ctx.db));
  const linksBefore = hash((await ctx.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows);
  const protectionBefore = hash(protection(p));
  const domainsBefore = hash(await vercel(`/v9/projects/${project}/domains`));
  console.info(JSON.stringify({ preflight: "PASS", oldOrigin, runtimeChanges: diff,
    protectedPreview: true, privateGate: true, mainUnchanged: true, workerSuspended: true,
    migrationsRequired: false, scope: "Staging authentication only" }));
  if (process.argv[2] === "preflight") { await ctx.db.end(); process.exit(0); }

  const temp = await mkdtemp(path.join(tmpdir(), "vynox-link-release-"));
  let commit;
  try {
    const index = { GIT_INDEX_FILE: path.join(temp, "index") };
    git(["read-tree", prior], index);
    git(["restore", "--source=HEAD", "--staged", "--", ...paths], index);
    const tree = git(["write-tree"], index);
    commit = git(["commit-tree", tree, "-p", prior, "-m", "Fix Staging mobile authentication loading and query lifecycle"], {
      ...index, GIT_AUTHOR_NAME: "VYNOX LAYER Release", GIT_AUTHOR_EMAIL: "release@users.noreply.github.com",
      GIT_COMMITTER_NAME: "VYNOX LAYER Release", GIT_COMMITTER_EMAIL: "release@users.noreply.github.com" });
    if (git(["diff", "--name-only", prior, commit]).split("\n").some(x => !paths.includes(x)))
      throw Error("Release contains unrelated files.");
    git(["push", "origin", `${commit}:refs/heads/${branch}`]);
    if (git(["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s/)[0] !== commit)
      throw Error("Staging source readback failed.");
  } finally { await rm(temp, { recursive: true, force: true }); }
  // Packaging uses the same current source as the narrow release, validated above.
  run("scripts/external-hosting/build-frontends.mjs", {
    QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_AUTH_PROVIDER: "supabase",
    QXLAYER_API_ORIGIN: "https://qxlayer-api.onrender.com",
    QXLAYER_CLERK_DEVELOPMENT_HOST: cfg.QXLAYER_CLERK_DEVELOPMENT_HOST,
    VITE_CLERK_PUBLISHABLE_KEY: cfg.CLERK_PUBLISHABLE_KEY, VITE_CLERK_PROXY_URL: "",
  });
  run("scripts/external-hosting/deploy-integrated-preview.mjs", { QXLAYER_STAGING_API_INTEGRATION_APPROVED: "true" });
  const receipt = JSON.parse(await readFile("generated-artifacts/qxlayer-staging-setup/integrated-preview-deployment.json", "utf8"));
  const d = await vercel(`/v13/deployments/${receipt.id}`);
  if (receipt.status !== "PREVIEW_READY" || d.projectId !== project || d.readyState !== "READY" ||
      ![null, undefined, "preview"].includes(d.target))
    throw Error("Protected Preview release readback failed.");
  const origin = `https://${d.url}`;
  if (!/^https:\/\/qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(origin)) throw Error("Unexpected Staging origin.");
  // Preserve every identity/provider/session setting. Only the new Preview's
  // exact request origin and additive Clerk caller allowlist need updating.
  const parties = [...new Set((cfg.CLERK_AUTHORIZED_PARTIES || oldOrigin).split(",").filter(Boolean).concat(origin))].join(",");
  for (const target of [`env-groups/${GROUP}`, `services/${API}`]) {
    await render(`${target}/env-vars/QXLAYER_SUPABASE_AUTH_URL`, "PUT", { value: origin });
    await render(`${target}/env-vars/CLERK_AUTHORIZED_PARTIES`, "PUT", { value: parties });
  }
  const afterCfg = { ...ctx.env, ...values(await render(`services/${API}/env-vars?limit=100`)) };
  if (afterCfg.QXLAYER_SUPABASE_AUTH_URL !== origin || afterCfg.CLERK_AUTHORIZED_PARTIES !== parties ||
      afterCfg.QXLAYER_STAGING_IDENTITY_BINDINGS !== cfg.QXLAYER_STAGING_IDENTITY_BINDINGS ||
      afterCfg.QXLAYER_SUPABASE_AUTH_SESSION_SECRET !== cfg.QXLAYER_SUPABASE_AUTH_SESSION_SECRET)
    throw Error("Staging origin or preserved identity/session configuration readback failed.");
  run("scripts/external-hosting/release-render.mjs", { GITHUB_SHA: commit, RENDER_API_SERVICE_ID: API,
    QXLAYER_EXTERNAL_RELEASES_APPROVED: "true", QXLAYER_EXTERNAL_ENVIRONMENT: "staging" });
  if (git(["ls-remote", "origin", "refs/heads/main"]).split(/\s/)[0] !== mainBefore ||
      (await render(`services/${workerId}`)).suspended !== "suspended" ||
      hash(protection(await vercel(`/v9/projects/${project}`))) !== protectionBefore ||
      hash(await vercel(`/v9/projects/${project}/domains`)) !== domainsBefore ||
      hash(await fingerprints(ctx.db)) !== publicBefore ||
      hash((await ctx.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows) !== linksBefore)
    throw Error("Post-release protection, identity, data or Production boundary failed.");
  await writeFile(`${SCOPE}/linking-fix-release.json`, JSON.stringify({
    status: "PROTECTED_STAGING_READY", origin, commit, previewId: d.id, providerTarget: "preview",
    protectionPreserved: true, existingIdentityLinksPreserved: true, businessDataAndPermissionsPreserved: true,
    identityBindingsAndSessionSecretPreserved: true, mainUnchanged: true, workerSuspended: true,
    dnsChanged: false, productionDeployed: false, migrationsApplied: false,
    ownerBrowserAcceptancePending: true, mobileLoadingFix: true,
  }, null, 2));
  console.info(`Protected Staging authentication fix deployed: ${origin}`);
} finally { await ctx.db.end(); }

/**
 * Explicit isolated brand release. Stable names, provider and IDs are retained.
 * No schema application, Production release, DNS, paid-plan or Worker changes.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

if (process.env.QXLAYER_STAGING_REBRAND_APPROVED !== "true")
  throw Error("Explicit Staging rebrand approval required.");
const sdk = new ReplitConnectors();
const repo = "quickXchange/QXLayer", branch = "qxlayer-staging";
const apiId = "srv-db5b47qjnfac739s374g", groupId = "evg-db5ate8473hc73agdon0";
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
async function provider(kind, route, method = "GET", body) {
  const r = kind === "render" ? await fetch(`https://api.render.com/v1/${route}`, {
    method, headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  }) : await sdk.proxy(kind, route, { method, ...(body ? { body } : {}) });
  if (!r.ok) throw Error(`Scoped ${kind} ${method} HTTP ${r.status}`);
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
const [api, group, worker, p, variables, main] = await Promise.all([
  provider("render", `services/${apiId}`), provider("render", `env-groups/${groupId}`),
  provider("render", "services/srv-db5b48o473hc73ah56d0"),
  provider("vercel", `/v9/projects/${project}?teamId=${team}`),
  provider("github", `/repos/${repo}/environments/${branch}/variables`),
  provider("github", `/repos/${repo}/git/ref/heads/main`),
]);
const vars = Object.fromEntries(variables.variables.map(v => [v.name, v.value]));
const cfg = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
if (api.branch !== branch || api.environmentId !== group.environmentId ||
    api.serviceDetails.plan !== "starter" || api.autoDeploy !== "no" ||
    worker.suspended !== "suspended" || cfg.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" ||
    cfg.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" || p.id !== project || p.link || !p.hasDeployments ||
    vars.VERCEL_PROJECT_ID !== project || vars.RENDER_API_SERVICE_ID !== apiId)
  throw Error("Existing Staging identity or safety boundaries changed.");
const cleanEnv = { ...process.env };
for (const key of Object.keys(cleanEnv)) if (/^GIT_(TRACE|CURL_VERBOSE)/.test(key)) delete cleanEnv[key];
const helper = '!node -e \'process.stdout.write("username=x-access-token\\npassword="+process.env.GITHUB_TOKEN+"\\n")\'';
function git(args, env = cleanEnv) {
  const r = spawnSync("git", ["-c", "credential.helper=", "-c", `credential.helper=${helper}`, ...args],
    { env, encoding: "utf8" });
  if (r.status !== 0) throw Error("Scoped Git operation failed; no credential details logged.");
  return r.stdout.trim();
}
if (git(["remote", "get-url", "origin"]) !== `https://github.com/${repo}.git`)
  throw Error("Unexpected source repository.");
const prior = git(["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s/)[0];
if (!/^[a-f0-9]{40}$/.test(prior)) throw Error("Existing Staging ref required.");
git(["fetch", "--no-tags", "origin", prior]);
const temp = await mkdtemp(path.join(tmpdir(), "vynox-stage-"));
let commit;
try {
  const indexEnv = { ...cleanEnv, GIT_INDEX_FILE: path.join(temp, "index") };
  git(["read-tree", "HEAD"], indexEnv);
  git(["add", "--", "artifacts", "lib", "scripts", "deploy", ".github", "package.json",
    "pnpm-lock.yaml", "replit.md"], indexEnv);
  const tree = git(["write-tree"], indexEnv);
  commit = git(["commit-tree", tree, "-p", prior, "-m", "VYNOX LAYER safe Staging rebrand; retain infrastructure compatibility"], {
    ...cleanEnv, GIT_AUTHOR_NAME: "VYNOX LAYER Release", GIT_AUTHOR_EMAIL: "release@users.noreply.github.com",
    GIT_COMMITTER_NAME: "VYNOX LAYER Release", GIT_COMMITTER_EMAIL: "release@users.noreply.github.com",
  });
  if (process.env.QXLAYER_STAGING_REBRAND_SOURCE_ONLY === "true" &&
      git(["diff", "--name-only", prior, commit, "--", "artifacts", "lib", "package.json", "pnpm-lock.yaml"]))
    throw Error("Source-only follow-up refuses runtime changes; use the full Staging release.");
  git(["push", "origin", `${commit}:refs/heads/${branch}`]);
  if (git(["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s/)[0] !== commit)
    throw Error("Source readback failed.");
} finally { await rm(temp, { recursive: true, force: true }); }
console.info("Staging source synchronized; main remains unchanged.");
await provider("github", `/repos/${repo}`, "PATCH", {
  description: "VYNOX LAYER — white-label exchange platform. Stable repository identifiers retained for compatibility.",
});
if (process.env.QXLAYER_STAGING_REBRAND_SOURCE_ONLY === "true") {
  const currentMain = await provider("github", `/repos/${repo}/git/ref/heads/main`);
  if (currentMain.object.sha !== main.object.sha) throw Error("Main boundary changed.");
  console.info("Documentation/verification tools synchronized; deployed runtime is unchanged.");
  process.exit(0);
}
const frontendEnv = { ...cleanEnv, ...vars, QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
  QXLAYER_API_ORIGIN: "https://qxlayer-api.onrender.com", QXLAYER_AUTH_PROVIDER: cfg.QXLAYER_AUTH_PROVIDER || "clerk",
  VITE_CLERK_PUBLISHABLE_KEY: vars.CLERK_PUBLISHABLE_KEY || cfg.CLERK_PUBLISHABLE_KEY,
  VITE_CLERK_PROXY_URL: vars.CLERK_PROXY_PUBLIC_URL,
};
function run(script, env) {
  const r = spawnSync("node", [script], { env, stdio: "inherit" });
  if (r.status !== 0) throw Error(`Staging release stopped at ${script}.`);
}
run("scripts/external-hosting/build-frontends.mjs", frontendEnv);
const releaseEnv = { ...cleanEnv, GITHUB_SHA: commit, RENDER_API_SERVICE_ID: apiId,
  QXLAYER_EXTERNAL_RELEASES_APPROVED: "true", QXLAYER_EXTERNAL_ENVIRONMENT: "staging" };
if (process.env.QXLAYER_STAGING_REBRAND_FRONTEND_ONLY !== "true")
  run("scripts/external-hosting/release-render.mjs", releaseEnv);
run("scripts/external-hosting/deploy-integrated-preview.mjs", {
  ...cleanEnv, QXLAYER_STAGING_API_INTEGRATION_APPROVED: "true",
});
const receipt = JSON.parse(await readFile("generated-artifacts/qxlayer-staging-setup/integrated-preview-deployment.json", "utf8"));
const d = await provider("vercel", `/v13/deployments/${receipt.id}?teamId=${team}`);
if (d.projectId !== project || d.target === "production" || d.readyState !== "READY")
  throw Error("Preview target readback failed.");
const origin = `https://${d.url}`;
for (const target of [`env-groups/${groupId}`, `services/${apiId}`]) {
  for (const key of ["QXLAYER_PLATFORM_URL", "QXLAYER_AUTH_URL", "CLERK_AUTHORIZED_PARTIES"])
    await provider("render", `${target}/env-vars/${key}`, "PUT", { value: origin });
}
for (const target of [`env-groups/${groupId}`, `services/${apiId}`]) {
  const r = await provider("render", target.startsWith("services") ? `${target}/env-vars?limit=100` : target);
  const values = Object.fromEntries((Array.isArray(r) ? r : r.envVars).map(x => {
    const v = x.envVar || x; return [v.key, v.value];
  }));
  if (values.QXLAYER_PLATFORM_URL !== origin || values.QXLAYER_AUTH_URL !== origin ||
      values.CLERK_AUTHORIZED_PARTIES !== origin ||
      (values.QXLAYER_AUTH_PROVIDER || "clerk") !== (cfg.QXLAYER_AUTH_PROVIDER || "clerk"))
    throw Error("Staging origin/provider readback failed.");
}
run("scripts/external-hosting/release-render.mjs", releaseEnv);
const [afterMain, afterWorker] = await Promise.all([
  provider("github", `/repos/${repo}/git/ref/heads/main`),
  provider("render", "services/srv-db5b48o473hc73ah56d0"),
]);
if (afterMain.object.sha !== main.object.sha || afterWorker.suspended !== "suspended")
  throw Error("Production source or suspended Worker boundary changed.");
await writeFile("generated-artifacts/qxlayer-staging-setup/vynox-rebrand-release.json", JSON.stringify({
  brand: "VYNOX LAYER", commit, previewId: d.id, previewUrl: origin, providerTarget: d.target ?? "preview",
  authProviderPreserved: cfg.QXLAYER_AUTH_PROVIDER || "clerk", mainUnchanged: true,
  workerSuspended: true, dnsChanged: false, schemaChanged: false, productionReleased: false,
}, null, 2));
console.info(`VYNOX LAYER Staging ready: ${origin}`);

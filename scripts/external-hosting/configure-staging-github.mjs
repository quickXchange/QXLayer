/**
 * Owner-authorized setup of one protected Staging environment. Secret values
 * travel provider -> process memory -> gh encrypted-secret stdin; never files
 * or logs. Never touches Production environments or cloud services.
 */
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { STAGING_SUPABASE_PROJECT } from "./staging-targets.mjs";
const repo = "quickXchange/QXLayer", target = "qxlayer-staging";
function protectedSetting(args, value) {
  if (typeof value !== "string" || !value) throw Error("Required protected setting unavailable.");
  try {
    execFileSync("gh", args, { input: value, stdio: ["pipe", "ignore", "pipe"] });
  } catch {
    // Never expose child-process output or credential-bearing error objects.
    throw Error("Protected GitHub setting write failed.");
  }
}
function protectedDatabaseUrl(value) {
  try { return new URL(value); }
  catch { throw Error("Protected database connection unavailable or malformed."); }
}
if (process.env.QXLAYER_STAGING_GITHUB_SETUP_APPROVED !== "true")
  throw Error("Staging GitHub setup approval required.");
async function github(route, method = "GET", body) {
  const r = await fetch(`https://api.github.com${route}`, { method,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw Error(`GitHub configuration HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}
const owner = await github("/user");
const repository = await github(`/repos/${repo}`);
if (owner.login !== "quickXchange" || repository.default_branch !== "main" || !repository.permissions?.admin)
  throw Error("Expected owner/admin repository required.");
const response = await fetch("https://api.render.com/v1/env-groups/evg-db5ate8473hc73agdon0",
  { headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` } });
if (!response.ok) throw Error("Staging environment unavailable.");
const group = await response.json();
const env = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || !env.CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"))
  throw Error("Staging-only configuration required.");
const url = protectedDatabaseUrl(process.env.QXLAYER_SUPABASE_DATABASE_URL);
const runtime = protectedDatabaseUrl(env.DATABASE_URL);
if (url.hostname !== env.DB_EXPECTED_HOST || runtime.hostname !== url.hostname ||
    !["", "5432"].includes(url.port) || url.pathname !== "/postgres")
  throw Error("Migration connection is not the existing Staging database.");
const username = decodeURIComponent(url.username);
const ref = username.startsWith("postgres.") ? username.slice(9) : url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1];
if (ref !== STAGING_SUPABASE_PROJECT) throw Error("Pinned existing Staging Supabase project required.");
const ca = group.secretFiles.find(x => x.name === "supabase-ca.crt")?.content;
if (!ca?.includes("BEGIN CERTIFICATE")) throw Error("Existing verified Staging CA required.");
const root = `/repos/${repo}/environments/${target}`;
await github(root, "PUT", {
  prevent_self_review: false, reviewers: [{ type: "User", id: owner.id }],
  can_admins_bypass: false,
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
});
const policies = await github(`${root}/deployment-branch-policies`);
if (policies.branch_policies.some(x => x.name !== target || x.type !== "branch"))
  throw Error("Unexpected existing deployment branch policy; review required.");
if (!policies.branch_policies.length)
  await github(`${root}/deployment-branch-policies`, "POST", { name: target, type: "branch" });
const variables = {
  SUPABASE_PROJECT_REF: ref, MIGRATION_EXPECTED_HOST: url.hostname,
  RENDER_API_SERVICE_ID: "srv-db5b47qjnfac739s374g",
  VERCEL_ORG_ID: "team_eoJE6FCcm9esuqnRTUsmopzy",
  VERCEL_PROJECT_ID: "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx",
  QXLAYER_API_ORIGIN: "https://qxlayer-api.onrender.com",
  CLERK_PUBLISHABLE_KEY: env.CLERK_PUBLISHABLE_KEY,
  QXLAYER_CLERK_DEVELOPMENT_HOST: env.QXLAYER_CLERK_DEVELOPMENT_HOST,
};
for (const [name, value] of Object.entries(variables))
  protectedSetting(["variable", "set", name, "--env", target, "--repo", repo], value);
const secrets = {
  MIGRATION_DATABASE_URL: process.env.QXLAYER_SUPABASE_DATABASE_URL,
  DB_TLS_CA_PEM: ca, RENDER_API_KEY: process.env.RENDER_API_KEY,
  ...(process.env.VERCEL_TOKEN ? { VERCEL_TOKEN: process.env.VERCEL_TOKEN } : {}),
};
for (const [name, value] of Object.entries(secrets))
  protectedSetting(["secret", "set", name, "--env", target, "--repo", repo], value);
protectedSetting(["variable", "set", "QXLAYER_STAGING_RELEASES_ENABLED", "--repo", repo], "true");
const actual = await github(root);
const actualSecrets = await github(`${root}/secrets`);
const actualVars = await github(`${root}/variables`);
if (!actual.protection_rules.some(x => x.type === "required_reviewers" &&
    x.reviewers.some(r => r.reviewer.id === owner.id)) ||
    actual.deployment_branch_policy?.custom_branch_policies !== true ||
    actual.can_admins_bypass !== false)
  throw Error("Environment protection readback failed.");
for (const key of Object.keys(secrets))
  if (!actualSecrets.secrets.some(x => x.name === key)) throw Error("Secret existence readback failed.");
const receipt = { status: "PROTECTED_STAGING_ENVIRONMENT_CONFIGURED",
  environment: target, reviewerRequired: true, adminBypass: false, sourceBranch: target,
  secretNames: actualSecrets.secrets.map(x => x.name),
  variableNames: actualVars.variables.map(x => x.name),
  missingSecrets: ["VERCEL_TOKEN"].filter(x => !actualSecrets.secrets.some(s => s.name === x)),
  productionChanged: false, dnsChanged: false };
await writeFile("generated-artifacts/qxlayer-staging-setup/protected-github-environment.json", JSON.stringify(receipt, null, 2));
console.info(JSON.stringify(receipt));

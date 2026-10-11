/** Read-only, pinned external inventory. Never prints credentials or database rows. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { STAGING_SUPABASE_PROJECT } from "./staging-targets.mjs";
const sdk = new ReplitConnectors();
async function render(path) {
  const r = await fetch(`https://api.render.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw Error(`Render inventory HTTP ${r.status}`);
  return r.json();
}
const [service, worker, group, repo, project] = await Promise.all([
  render("services/srv-db5b47qjnfac739s374g"),
  render("services/srv-db5b48o473hc73ah56d0"),
  render("env-groups/evg-db5ate8473hc73agdon0"),
  sdk.proxy("github", "/repos/quickXchange/QXLayer").then(r => r.json()),
  sdk.proxy("vercel", "/v9/projects/prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx?teamId=team_eoJE6FCcm9esuqnRTUsmopzy").then(r => r.json()),
]);
const env = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
if (service.id !== "srv-db5b47qjnfac739s374g" || service.branch !== "qxlayer-staging" ||
    service.serviceDetails.plan !== "starter" || worker.suspended !== "suspended" ||
    service.environmentId !== group.environmentId ||
    env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" ||
    env.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false" ||
    project.id !== "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx" || project.link ||
    !project.hasDeployments || repo.full_name !== "quickXchange/QXLayer")
  throw Error("Pinned Staging safety boundaries changed.");
console.log(JSON.stringify({
  render: { api: service.name, branch: service.branch, plan: service.serviceDetails.plan,
    worker: worker.name, workerSuspended: true, autoDeploy: service.autoDeploy },
  vercel: { project: project.name, id: project.id, initialized: true },
  github: { repository: repo.full_name, description: repo.description },
  supabase: { pinnedProject: STAGING_SUPABASE_PROJECT },
  authentication: { provider: env.QXLAYER_AUTH_PROVIDER || "clerk", mailConfigured: !!env.QXLAYER_AUTH_MAIL_FROM },
}, null, 2));

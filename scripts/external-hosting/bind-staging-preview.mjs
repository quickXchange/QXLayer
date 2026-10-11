/** Protected CI only: verify Preview identity, then pin the existing Staging API. */
const { QXLAYER_STAGING_PREVIEW_URL: origin, VERCEL_TOKEN: vercelToken, RENDER_API_KEY: renderToken } = process.env;
if (process.env.QXLAYER_EXTERNAL_RELEASES_APPROVED !== "true" ||
    !/^https:\/\/qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(origin ?? "") ||
    !vercelToken || !renderToken) throw Error("Approved Staging Preview and protected credentials required.");
async function request(provider, path, method = "GET", body) {
  const render = provider === "render";
  const url = render ? `https://api.render.com/v1/${path}` :
    `https://api.vercel.com/${path}${path.includes("?") ? "&" : "?"}teamId=team_eoJE6FCcm9esuqnRTUsmopzy`;
  const r = await fetch(url, { method, redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${render ? renderToken : vercelToken}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw Error(`Scoped ${provider} HTTP ${r.status}`);
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
const service = "srv-db5b47qjnfac739s374g", group = "evg-db5ate8473hc73agdon0";
const [deployment, api, config, worker] = await Promise.all([
  request("vercel", `v13/deployments/${new URL(origin).host}`),
  request("render", `services/${service}`), request("render", `env-groups/${group}`),
  request("render", "services/srv-db5b48o473hc73ah56d0"),
]);
const values = Object.fromEntries(config.envVars.map(v => [v.key, v.value]));
if (deployment.projectId !== "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx" || deployment.target === "production" ||
    deployment.readyState !== "READY" || `https://${deployment.url}` !== origin ||
    api.environmentId !== config.environmentId || api.branch !== "qxlayer-staging" ||
    api.serviceDetails.plan !== "starter" || worker.suspended !== "suspended" ||
    values.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || values.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "false")
  throw Error("Staging identity, Preview or paid-compute boundaries changed.");
for (const target of [`env-groups/${group}`, `services/${service}`]) {
  for (const key of ["QXLAYER_PLATFORM_URL", "CLERK_AUTHORIZED_PARTIES"]) {
    await request("render", `${target}/env-vars/${key}`, "PUT", { value: origin });
  }
}
for (const target of [`env-groups/${group}`, `services/${service}`]) {
  const response = await request("render", target.startsWith("services") ? `${target}/env-vars?limit=100` : target);
  const vars = Object.fromEntries((Array.isArray(response) ? response : response.envVars).map(x => {
    const v = x.envVar ?? x; return [v.key, v.value];
  }));
  if (vars.QXLAYER_PLATFORM_URL !== origin || vars.CLERK_AUTHORIZED_PARTIES !== origin)
    throw Error("Staging origin readback failed.");
}
console.info("READY Preview identity and synchronized Staging origins verified. Worker remains suspended.");

/**
 * Explicit protected CI release only. Never imported by app/build commands.
 * API and disabled worker deploy the exact reviewed GitHub commit.
 */
const token = process.env.RENDER_API_KEY;
const commit = process.env.GITHUB_SHA;
if (process.env.QXLAYER_EXTERNAL_RELEASES_APPROVED !== "true" || !token || !/^[a-f0-9]{40}$/.test(commit ?? ""))
  throw new Error("Protected external release approval, Render credential and exact commit are required.");
async function request(path, method = "GET", body) {
  const result = await fetch(`https://api.render.com/v1/${path}`, {
    method, redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type":"application/json", Accept:"application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!result.ok) throw new Error("Render release request failed.");
  return result.json();
}
for (const key of ["RENDER_API_SERVICE_ID", "RENDER_WORKER_SERVICE_ID"]) {
  const id = process.env[key];
  if (!/^srv-[a-z0-9]+$/.test(id ?? "")) throw new Error(`Missing valid ${key}.`);
  const deployment = await request(`services/${id}/deploys`,"POST",{ commitId:commit,clearCache:"do_not_clear" });
  if (!/^dep-[a-z0-9]+$/.test(deployment.id ?? "")) throw new Error("Render did not return a deployment identity.");
  const deadline = Date.now() + 20 * 60_000;
  let live = false;
  while (Date.now() < deadline) {
    const state = await request(`services/${id}/deploys/${deployment.id}`);
    if (["build_failed","update_failed","pre_deploy_failed","canceled","deactivated"].includes(state.status))
      throw new Error("Render candidate release failed; frontend release is stopped.");
    if (state.status === "live") {
      if (state.commit?.id !== commit) throw new Error("Render deployed a different source commit.");
      live = true; break;
    }
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
  if (!live) throw new Error("Render release did not become live in time.");
  console.info(`${key} is live at the approved commit. No DNS changed.`);
}

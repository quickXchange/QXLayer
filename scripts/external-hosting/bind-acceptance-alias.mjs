import assert from "node:assert/strict";
if (process.env.CANDIDATE_ACCEPTANCE_APPROVED === "true") {
  const host = "qxlayer-acceptance-vynox3.vercel.app", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
  const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
  const headers = { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json" };
  const url = new URL(process.env.CANDIDATE_PREVIEW_URL);
  assert(url.hostname.endsWith("-vynox3.vercel.app"));
  const r = await fetch(`https://api.vercel.com/v13/deployments/${url.hostname}?teamId=${team}`, { headers });
  assert(r.ok); const d = await r.json();
  assert.equal(d.projectId, project);
  assert.notEqual(d.target, "production");
  assert.equal(d.meta.githubCommitSha, process.env.GITHUB_SHA);
  const old = await fetch(`https://api.vercel.com/v4/aliases/${host}?teamId=${team}`, { headers });
  if (old.ok) assert.equal((await old.json()).projectId, project);
  else assert.equal(old.status, 404);
  const assign = await fetch(`https://api.vercel.com/v2/deployments/${d.id}/aliases?teamId=${team}`,
    { method: "POST", headers, body: JSON.stringify({ alias: host }) });
  assert(assign.ok, `Protected acceptance alias HTTP ${assign.status}`);
  console.log("Bound provider-owned acceptance alias to the exact Preview commit; custom domains and Live untouched.");
}

import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
const url = new URL(process.env.CANDIDATE_PREVIEW_URL);
assert(url.hostname.endsWith(".vercel.app") && url.protocol === "https:");
const r = await fetch(`https://api.vercel.com/v13/deployments/${url.hostname}?teamId=team_eoJE6FCcm9esuqnRTUsmopzy`, {
  headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  redirect: "error", signal: AbortSignal.timeout(30000),
});
assert(r.ok, `Preview readback HTTP ${r.status}`);
const d = await r.json();
assert.equal(d.projectId, "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx");
assert.equal(d.readyState, "READY");
assert([null, undefined, "preview"].includes(d.target), "Production target forbidden before cutover");
assert((d.alias ?? []).every(a => a.endsWith(".vercel.app")), "Custom domain assignment forbidden");
const commit = d.meta?.githubCommitSha ?? d.meta?.gitCommitSha;
assert.equal(commit, process.env.GITHUB_SHA, "Preview must prove the pushed commit");
console.log(JSON.stringify({ status: "CANDIDATE_READY", commit, url: url.origin, target: d.target ?? "preview", liveChanged: false }));
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `\nProtected candidate: ${url.origin}\n\nCommit: ${commit}. Render API released to the same commit. Only reviewed reference additions are permitted; no schema/account migration, DNS change or Live activation.\n`);

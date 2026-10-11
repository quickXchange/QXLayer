/** Project-scoped, expiring CI credential; never returns/logs bearer material. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
if (process.env.QXLAYER_STAGING_GITHUB_SETUP_APPROVED !== "true")
  throw Error("Staging CI token approval required.");
const sdk = new ReplitConnectors();
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx";
const team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000;
const response = await sdk.proxy("vercel", `/v3/user/tokens?teamId=${team}`, {
  method: "POST", body: { name: "QXLayer protected GitHub Staging", expiresAt, projectId: project },
});
if (!response.ok) {
  console.error(`Project-scoped token creation unavailable (HTTP ${response.status}); owner credential required.`);
  process.exitCode = 1;
} else {
  const data = await response.json();
  if (!data.bearerToken || !data.token?.id) throw Error("No scoped token returned.");
  try {
    const check = await fetch(`https://api.vercel.com/v9/projects/${project}?teamId=${team}`,
      { headers: { Authorization: `Bearer ${data.bearerToken}` } });
    if (!check.ok || (await check.json()).id !== project) throw Error("Token target verification failed.");
    execFileSync("gh", ["secret", "set", "VERCEL_TOKEN", "--env", "qxlayer-staging", "--repo", "quickXchange/QXLayer"],
      { input: data.bearerToken, stdio: ["pipe", "ignore", "pipe"] });
    await writeFile("generated-artifacts/qxlayer-staging-setup/staging-ci-token.json", JSON.stringify({
      status: "PROJECT_SCOPED_CI_TOKEN_INSTALLED", project, expiresAt,
      secretStoredIn: "protected-github-staging-environment",
      tokenId: data.token.id, bearerRecorded: false, productionChanged: false,
    }, null, 2));
    console.info("Project-scoped expiring Vercel CI credential installed in protected Staging only.");
  } catch {
    await sdk.proxy("vercel", `/v3/user/tokens/${data.token.id}?teamId=${team}`, { method: "DELETE" });
    console.error("Staging token setup failed; issued token revocation requested.");
    process.exitCode = 1;
  }
}

import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { independentStagingCandidate } from "../../lib/external-clerk/independent-staging.mjs";

async function prepare() {
  if (process.env.QXLAYER_INDEPENDENT_CLERK_PREPARATION_APPROVED !== "true")
    throw Error("Independent Staging Clerk preparation approval required.");
  const response = await fetch("https://api.render.com/v1/env-groups/evg-db5ate8473hc73agdon0",
    { headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` } });
  if (!response.ok) throw Error("Staging configuration unavailable.");
  const group = await response.json();
  const current = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
  const candidate = {
    ownerControlConfirmed: process.env.QXLAYER_INDEPENDENT_CLERK_OWNER_CONTROL_CONFIRMED === "true",
    CLERK_SECRET_KEY: process.env.INDEPENDENT_STAGING_CLERK_SECRET_KEY,
    CLERK_PUBLISHABLE_KEY: process.env.INDEPENDENT_STAGING_CLERK_PUBLISHABLE_KEY,
    QXLAYER_STAGING_IDENTITY_BINDINGS: process.env.INDEPENDENT_STAGING_IDENTITY_BINDINGS,
  };
  const receipt = independentStagingCandidate(current, candidate);
  const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
  const { createClerkClient } = createRequire(require.resolve("@clerk/express"))("@clerk/backend");
  const client = createClerkClient({ secretKey: candidate.CLERK_SECRET_KEY, publishableKey: candidate.CLERK_PUBLISHABLE_KEY });
  for (const id of Object.keys(JSON.parse(candidate.QXLAYER_STAGING_IDENTITY_BINDINGS)))
    if ((await client.users.getUser(id)).id !== id) throw Error("Candidate identity verification failed.");
  receipt.status = "INDEPENDENT_CANDIDATE_VERIFIED_NOT_ACTIVATED";
  await writeFile("generated-artifacts/qxlayer-staging-setup/independent-clerk-candidate.json", JSON.stringify(receipt, null, 2));
  console.info("Independent Staging Clerk candidate verified. Existing authentication untouched.");
}
prepare().catch(() => { console.error("Independent Clerk preparation blocked: owner-controlled candidate credentials/identity or readback unavailable. Existing authentication untouched."); process.exitCode = 1; });

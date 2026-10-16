import assert from "node:assert/strict";
const root = "https://qxlayer-api.onrender.com";
let body;
assert(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? ""), "Expected pushed commit required");
for (let attempt = 0; attempt < 24; attempt++) {
  const r = await fetch(`${root}/api/healthz`, { signal: AbortSignal.timeout(15000) });
  assert.equal(r.status, 200);
  body = await r.json();
  if (body.commit === process.env.GITHUB_SHA &&
      (body.acceptanceOnly || body.environment !== "production" || body.preflightComplete)) break;
  await new Promise(resolve => setTimeout(resolve, 3000));
}
assert.equal(body.environment, process.env.CANDIDATE_EXPECTED_ENVIRONMENT);
assert.equal(body.commit, process.env.GITHUB_SHA, "Public routing must reach the pushed Render commit, not a draining instance");
if (body.acceptanceOnly) {
  assert.equal(body.ready, false);
  assert.equal(body.publicLiveActivated, false);
  assert.equal(body.databaseConnected, true);
  assert.equal(body.privateAuthConnected, true);
  assert.equal(body.schemaVerified, true);
  const protectedRoute = await fetch(`${root}/api/orders`, { redirect: "manual" });
  assert.equal(protectedRoute.status, 200);
  assert((await protectedRoute.text()).includes("accessCode"), "Business routes must remain behind the private gate");
  console.log(JSON.stringify({ ...body, protectedGateVerified: true }));
  process.exit(0);
}
assert.equal(body.status, "held");
assert.equal(body.ready, false);
assert.equal(body.startupApproved, false);
assert.equal(body.businessRoutesEnabled, false);
if (body.environment === "production") {
  assert.equal(body.preflightComplete, true);
  assert.equal(body.probeReadOnly, true);
  assert.equal(body.databaseConnected, true, "Read-only Production database connection must pass");
  assert.equal(body.tlsVerified, true);
  assert.equal(body.authenticationReachable, true);
  assert.equal(body.authAdminReadVerified, true);
}
const blocked = await fetch(`${root}/api/orders`, { signal: AbortSignal.timeout(15000) });
assert.equal(blocked.status, 503);
console.log(JSON.stringify({ ...body, businessRouteStatus: blocked.status,
  note: "Connectivity only; no schema/data/account writes or Production activation." }));

import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { startupMode, createHeldCandidateServer } from "./start-api.mjs";

test("only explicitly held Staging can start without application imports", () => {
  assert.equal(startupMode({ QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
    QXLAYER_EXTERNAL_STARTUP_APPROVED: "false" }), "held");
  for (const mode of ["production", undefined, "development"])
    assert.throws(() => startupMode({ QXLAYER_EXTERNAL_ENVIRONMENT: mode,
      QXLAYER_EXTERNAL_STARTUP_APPROVED: "false" }));
  for (const approval of [undefined, "", "yes"])
    assert.throws(() => startupMode({ QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
      QXLAYER_EXTERNAL_STARTUP_APPROVED: approval }));
  assert.throws(() => startupMode({ QXLAYER_EXTERNAL_ENVIRONMENT: "production",
    QXLAYER_EXTERNAL_STARTUP_APPROVED: "true" }));
  assert.equal(startupMode({ QXLAYER_EXTERNAL_ENVIRONMENT: "production",
    QXLAYER_EXTERNAL_STARTUP_APPROVED: "true", QXLAYER_DATABASE_PROVIDER: "supabase" }), "approved");
});

test("held liveness is explicit; business GET/POST and Auth remain unavailable", async t => {
  const server = createHeldCandidateServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(origin + "/api/healthz");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "held", ready: false, environment: "staging",
    startupApproved: false, businessRoutesEnabled: false, databaseConnected: false });
  for (const [path, method] of [["/api/orders", "GET"], ["/api/orders", "POST"],
    ["/api/auth/login", "POST"], ["/api/healthz", "POST"], ["/", "GET"]]) {
    const response = await fetch(origin + path, { method });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).businessRoutesEnabled, false);
  }
});

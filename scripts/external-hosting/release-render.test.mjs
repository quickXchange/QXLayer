import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("./release-render.mjs", import.meta.url), "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function run(overrides = {}, suspended = "not_suspended") {
  const calls = [];
  await new AsyncFunction("process", "fetch", "console", source)({ env: {
    QXLAYER_EXTERNAL_RELEASES_APPROVED: "true", RENDER_API_KEY: "synthetic-only",
    GITHUB_SHA: "a".repeat(40), RENDER_API_SERVICE_ID: "srv-db5b47qjnfac739s374g",
    RENDER_WORKER_SERVICE_ID: "srv-disposableworker", QXLAYER_EXTERNAL_ENVIRONMENT: "staging", ...overrides,
  } }, async (url, options) => {
    calls.push({ url, method: options.method });
    const body = options.method === "POST" ? { id: "dep-disposable" } :
      url.endsWith("/dep-disposable") ? { status: "live", commit: { id: "a".repeat(40) } } :
        { suspended, branch: "qxlayer-staging", serviceDetails: { plan: "starter" } };
    return { ok: true, json: async () => body };
  }, { info() {} });
  return calls;
}
test("Default protected release never calls the suspended worker", async () => {
  const calls = await run();
  assert.equal(calls.filter(c => c.method === "POST").length, 1);
  assert.ok(calls.every(c => !c.url.includes("srv-disposableworker")));
});
test("A suspended API cannot be activated by deployment", async () => {
  await assert.rejects(run({}, "suspended"), /Suspended services/);
});
test("Staging refuses an unapproved service identity", async () => {
  await assert.rejects(run({ RENDER_API_SERVICE_ID: "srv-other" }), /existing approved Staging API/);
});

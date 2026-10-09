import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createAccessGate } from "./index.mjs";
import { deliveredSiteSlug, resolveDeliveredSite } from "./delivered-site-routing.mjs";

test("delivered channels bypass beta gate, never platform/Admin or undelivered sites", async () => {
  const gate = createAccessGate({ env: { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: "fictional-test-only" },
    deliveredSite: async slug => slug === "delivered-one" });
  const server = createServer((req, res) => gate(req, res, () => res.writeHead(204).end()));
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ["/private-label-website/delivered-one/telegram", "/api/public/sites/delivered-one",
      "/private-label-website/assets/example.js", "/api/public/site-delivery/delivered-one"])
      assert.equal((await fetch(url + path)).status, 204, path);
    for (const path of ["/api/me", "/api/integrations/runtime", "/admin", "/private-label-website/draft-one/telegram",
      "/api/public/sites/draft-one"])
      assert.equal((await fetch(url + path)).status, 403, path);
    for (const path of ["/api/public/sites/delivered-one/quote", "/api/public/sites/delivered-one/telegram/webhook"])
      assert.equal((await fetch(url + path, { method: "POST" })).status, 204, path);
    assert.equal((await fetch(url + "/api/public/site-delivery/delivered-one", { method: "POST" })).status, 403);
    assert.equal((await fetch(url + "/api/public/sites/delivered-one/quote", { method: "DELETE" })).status, 403);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test("delivery authority rejects missing, mismatched, unavailable and redirecting metadata", async () => {
  const env = { QXLAYER_PLATFORM_URL: "https://platform.example" };
  assert.equal(await resolveDeliveredSite("site", env, async () => new Response(JSON.stringify({ tenantSlug: "site", delivered: true }))), true);
  for (const payload of [{ tenantSlug: "other", delivered: true }, { tenantSlug: "site", delivered: false }, {}])
    assert.equal(await resolveDeliveredSite("site", env, async () => new Response(JSON.stringify(payload))), false);
  assert.equal(await resolveDeliveredSite("site", env, async () => { throw new Error("offline"); }), false);
  assert.equal(await resolveDeliveredSite("site", env, async () => new Response(null, { status: 302 })), false);
  assert.equal(await resolveDeliveredSite("site", {}), false);
  assert.equal(deliveredSiteSlug("/api/integrations/runtime"), null);
  assert.equal(deliveredSiteSlug("/private-label-website/assets/file.js"), null);
});

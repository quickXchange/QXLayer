import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createAccessGate } from "./index.mjs";
import { frontendRoutes } from "../../scripts/external-hosting/frontend-routes.mjs";

const origin = "https://qxlayer-acceptance-vynox3.vercel.app";
const env = { NODE_ENV: "production", PRODUCTION_ACCESS_GATE_ENABLED: "true",
  PRODUCTION_ACCESS_CODE: "synthetic-test-credential-not-for-real-access",
  QXLAYER_EXTERNAL_ENVIRONMENT: "production", QXLAYER_EXTERNAL_ACCEPTANCE_APPROVED: "true",
  QXLAYER_DATABASE_PROVIDER: "supabase", QXLAYER_PLATFORM_URL: origin };

test("only protected Staging and approved acceptance handle the form locally", () => {
  const routes = options => frontendRoutes({ apiOrigin: "https://api.onrender.com", ...options });
  assert.equal(routes({ environment: "production", acceptanceApproved: "true" })[0].dest, "/frontend");
  assert.equal(routes({ environment: "staging" })[0].dest, "/frontend");
  assert.equal(routes({ environment: "production" })[0].dest, "https://api.onrender.com/api/__qx_access/enter");
  assert.equal(routes({ environment: "production", acceptanceApproved: "true" })[1].dest,
    "https://api.onrender.com/api/$1");
});

test("acceptance requires exact origin and signed CSRF; repeat POST never falls into account auth", async t => {
  const gate = createAccessGate({ env }), apiGate = createAccessGate({ env, basePath: "/api" });
  let fallthroughPosts = 0;
  const server = createServer((req, res) => {
    const next = () => { if (req.method === "POST") fallthroughPosts++; res.end("landing-or-explore"); };
    void (req.url.startsWith("/api/") ? apiGate : gate)(req, res, next);
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const root = `http://127.0.0.1:${server.address().port}`;
  const form = await fetch(root, { headers: { Accept: "text/html" } });
  assert.equal(form.headers.get("referrer-policy"), "same-origin");
  assert.match(form.headers.get("content-security-policy"), /form-action 'self'/);
  const csrf = (await form.text()).match(/name="csrf" value="([^"]+)"/)?.[1];
  assert(csrf);
  const formCookie = form.headers.getSetCookie()[0].split(";")[0];
  const body = new URLSearchParams({ csrf, accessCode: env.PRODUCTION_ACCESS_CODE, returnTo: "/products/crypto_exchange" });
  const post = (headers = {}, cookie = formCookie, data = body) => fetch(`${root}/__qx_access/enter`, {
    method: "POST", redirect: "manual", headers: { Cookie: cookie, Origin: origin,
      "Content-Type": "application/x-www-form-urlencoded", ...headers }, body: data });
  for (const invalid of ["null", "https://attacker.invalid", "http://qxlayer-acceptance-vynox3.vercel.app",
    `${origin}.attacker.invalid`, `${origin}/other`]) {
    assert.equal((await post({ Origin: invalid })).status, 403);
  }
  assert.equal((await post({ "Sec-Fetch-Site": "cross-site" })).status, 403);
  assert.equal((await post({}, "")).status, 403);
  const tampered = new URLSearchParams(body); tampered.set("csrf", `${csrf}tampered`);
  assert.equal((await post({}, formCookie, tampered)).status, 403);
  const unlocked = await post({ "Sec-Fetch-Site": "same-origin" });
  assert.equal(unlocked.status, 303);
  assert.equal(unlocked.headers.get("location"), "/products/crypto_exchange");
  const raw = unlocked.headers.getSetCookie().find(c => c.startsWith("__Host-qxlayer-access="));
  assert.match(raw, /Path=\/; HttpOnly; Secure; SameSite=Strict/);
  assert.doesNotMatch(raw, /Domain=/i);
  const session = raw.split(";")[0];
  assert.equal(await (await fetch(`${root}/api/public/product-catalog`, { headers: { Cookie: session } })).text(), "landing-or-explore");
  assert.equal((await post({ Origin: "null" }, session)).status, 403);
  // Use a fresh server to avoid the intentional aggregate per-peer attempt cap.
  assert.equal(fallthroughPosts, 0);
});

test("a previously unlocked acceptance session can resubmit a genuine form safely", async t => {
  const gate = createAccessGate({ env });
  const server = createServer((req, res) => void gate(req, res, () => {
    assert.notEqual(req.method, "POST", "Gate entry must never reach application authentication");
    res.end("landing");
  }));
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const root = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(root, { headers: { Accept: "text/html" } });
  const csrf = (await r.text()).match(/name="csrf" value="([^"]+)"/)[1];
  const formCookie = r.headers.getSetCookie()[0].split(";")[0];
  const submit = cookie => fetch(`${root}/__qx_access/enter`, { method: "POST", redirect: "manual",
    headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrf, accessCode: env.PRODUCTION_ACCESS_CODE, returnTo: "//attacker.invalid" }) });
  const first = await submit(formCookie);
  const session = first.headers.getSetCookie().find(c => c.startsWith("__Host-qxlayer-access=")).split(";")[0];
  const repeat = await submit(`${formCookie}; ${session}`);
  assert.equal(repeat.status, 303); assert.equal(repeat.headers.get("location"), "/");
});

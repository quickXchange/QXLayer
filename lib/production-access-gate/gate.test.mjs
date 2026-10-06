import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createAccessGate, gateEnabled } from "./index.mjs";

// Disposable test values only. No real Development or Production secrets needed.
const fixtureCode = () => randomBytes(32).toString("base64url");
const cookiePair = (response, name) => response.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))?.split(";")[0];
const csrfFrom = (html) => html.match(/name="csrf" value="([^"]+)"/)?.[1];
async function harness(t, options) {
  const gate = createAccessGate(options);
  const server = createServer((req, res) => gate(req, res, () => {
    res.end("protected website content");
  }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return (url, init) => fetch(origin + url, { redirect: "manual", ...init });
}
async function form(request, url = "/deep/link?tab=routes") {
  const response = await request(url, { headers: { accept: "text/html" } });
  return { response, csrf: csrfFrom(await response.text()), cookie: cookiePair(response, "__Host-qxlayer-access-form") };
}
function submit(request, code, f, endpoint = "/__qx_access/enter", returnTo = "/deep/link?tab=routes") {
  return request(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: f.cookie ?? "" },
    body: new URLSearchParams({ csrf: f.csrf ?? "", accessCode: code, returnTo }),
  });
}

test("Production is fail-closed by default; Development remains unchanged", () => {
  assert.equal(gateEnabled({ NODE_ENV: "production" }), true);
  assert.equal(gateEnabled({ NODE_ENV: "development" }), false);
  assert.equal(gateEnabled({ NODE_ENV: "development", PRODUCTION_ACCESS_GATE_ENABLED: "true" }), true);
  assert.equal(gateEnabled({ NODE_ENV: "production", PRODUCTION_ACCESS_GATE_ENABLED: "false" }), false);
});

test("direct documents, assets and APIs cannot bypass the gate; missing code fails closed", async (t) => {
  const code = fixtureCode();
  const request = await harness(t, { env: { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code } });
  for (const url of ["/", "/products/exchange", "/admin/clients", "/private-label-website/novax", "/index.html", "/assets/app.js", "/api/public/catalog"]) {
    const response = await request(url, { headers: { accept: "text/html" } });
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.match(text, /Access Code/);
    assert.doesNotMatch(text, /protected website content/);
    assert.ok(!text.includes(code));
    assert.equal(response.headers.get("cache-control"), "no-store, private");
    assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  }
  for (const method of ["GET", "HEAD", "POST", "OPTIONS"]) {
    const response = await request("/api/private", { method });
    assert.equal(response.status, 403);
  }
  const unavailable = await harness(t, { env: { NODE_ENV: "production" } });
  const locked = await unavailable("/any", { headers: { accept: "text/html" } });
  assert.equal(locked.status, 503);
  assert.match(await locked.text(), /temporarily unavailable/);
  assert.equal((await unavailable("/api/public")).status, 503);
  const dev = await harness(t, { env: { NODE_ENV: "development" } });
  assert.equal(await (await dev("/")).text(), "protected website content");
});

test("wrong code, correct code, session-only secure cookie and navigation", async (t) => {
  const code = fixtureCode();
  const request = await harness(t, { env: { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code } });
  const f = await form(request);
  const wrong = await submit(request, fixtureCode(), f);
  assert.equal(wrong.status, 401);
  const wrongHtml = await wrong.text();
  assert.match(wrongHtml, /Invalid access code/);
  assert.ok(!wrongHtml.includes(code));
  assert.ok(!cookiePair(wrong, "__Host-qxlayer-access"));
  const fresh = await form(request);
  const correct = await submit(request, code, fresh);
  assert.equal(correct.status, 303);
  assert.equal(correct.headers.get("location"), "/deep/link?tab=routes");
  const sessionHeader = correct.headers.getSetCookie().find((c) => c.startsWith("__Host-qxlayer-access="));
  assert.match(sessionHeader, /HttpOnly/);
  assert.match(sessionHeader, /Secure/);
  assert.match(sessionHeader, /SameSite=Strict/);
  assert.match(sessionHeader, /Path=\//);
  assert.doesNotMatch(sessionHeader, /Max-Age|Expires|Domain=/);
  assert.ok(!sessionHeader.includes(code));
  const session = cookiePair(correct, "__Host-qxlayer-access");
  for (const url of ["/deep/link?tab=routes", "/", "/assets/app.js", "/private-label-website/exchange-sandbox", "/api/public/catalog"]) {
    assert.equal(await (await request(url, { headers: { cookie: session } })).text(), "protected website content");
  }
  assert.equal((await request("/api/public/catalog")).status, 403);
  assert.equal((await request("/api/public/catalog", { headers: { cookie: session + "tamper" } })).status, 403);
});

test("session is shared across services; code rotation and expiration revoke access", async (t) => {
  const code = fixtureCode();
  let clock = Date.now();
  const env = { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code };
  const request = await harness(t, { env, now: () => clock });
  const correct = await submit(request, code, await form(request));
  const session = cookiePair(correct, "__Host-qxlayer-access");
  const tenant = await harness(t, { env, basePath: "/private-label-website/" });
  const api = await harness(t, { env, basePath: "/api", healthPath: "/api/healthz" });
  for (const service of [tenant, api]) {
    assert.equal(await (await service("/somewhere", { headers: { cookie: session } })).text(), "protected website content");
  }
  assert.equal(await (await api("/api/healthz")).text(), '{"status":"ok"}');
  assert.equal((await api("/api/healthz/private")).status, 403);
  const changed = await harness(t, { env: { ...env, PRODUCTION_ACCESS_CODE: fixtureCode() } });
  assert.equal((await changed("/", { headers: { cookie: session } })).status, 403);
  clock += 12 * 60 * 60 * 1000 + 1;
  assert.equal((await request("/", { headers: { cookie: session } })).status, 403);
});

test("CSRF protection and safe local return URLs", async (t) => {
  const code = fixtureCode();
  const request = await harness(t, { env: { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code } });
  const f = await form(request);
  assert.equal((await submit(request, code, { ...f, cookie: "" })).status, 403);
  assert.equal((await submit(request, code, { ...f, csrf: f.csrf + "tamper" })).status, 403);
  const crossSite = await request("/__qx_access/enter", {
    method: "POST",
    headers: { origin: "https://attacker.invalid", cookie: f.cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ accessCode: code, csrf: f.csrf }),
  });
  assert.equal(crossSite.status, 403);
  for (const unsafe of ["//attacker.invalid", "https://attacker.invalid", "/\\attacker.invalid", "/\r\nLocation:evil", "/__qx_access/enter"]) {
    const result = await submit(request, code, await form(request), undefined, unsafe);
    assert.equal(result.headers.get("location"), "/");
  }
});

test("rate limit cannot be bypassed by forged forwarded IPs and expires", async (t) => {
  const code = fixtureCode();
  let clock = Date.now();
  const request = await harness(t, { env: { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code }, now: () => clock });
  for (let i = 0; i < 10; i++) {
    const f = await form(request);
    const response = await request("/__qx_access/enter", {
      method: "POST",
      headers: { cookie: f.cookie, "x-forwarded-for": `192.0.2.${i}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrf: f.csrf, accessCode: fixtureCode() }),
    });
    assert.equal(response.status, 401);
  }
  const limited = await submit(request, code, await form(request));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "900");
  clock += 15 * 60 * 1000 + 1;
  assert.equal((await submit(request, code, await form(request))).status, 303);
});

test("same-origin form submissions work behind the public-domain reverse proxy", async (t) => {
  const code = fixtureCode();
  const request = await harness(t, { env: { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code } });
  const f = await form(request);
  const response = await request("/__qx_access/enter", {
    method: "POST",
    headers: {
      origin: "https://public.example",
      "x-forwarded-host": "public.example, internal.proxy",
      "content-type": "application/x-www-form-urlencoded",
      cookie: f.cookie,
    },
    body: new URLSearchParams({ csrf: f.csrf, accessCode: code, returnTo: "/products" }),
  });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/products");
  assert.ok(cookiePair(response, "__Host-qxlayer-access"));
});

test("opaque sandbox origins still require the matching signed CSRF cookie and token", async (t) => {
  const code = fixtureCode();
  const request = await harness(t, { env: { NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code } });
  const f = await form(request);
  const body = new URLSearchParams({ csrf: f.csrf, accessCode: code, returnTo: "/" });
  const missingCookie = await request("/__qx_access/enter", {
    method: "POST", headers: { origin: "null", "content-type": "application/x-www-form-urlencoded" }, body,
  });
  assert.equal(missingCookie.status, 403);
  const accepted = await request("/__qx_access/enter", {
    method: "POST", headers: { origin: "null", cookie: f.cookie, "content-type": "application/x-www-form-urlencoded" }, body,
  });
  assert.equal(accepted.status, 303);
  assert.ok(cookiePair(accepted, "__Host-qxlayer-access"));
});

test("actual Production file server guards documents and source assets before reading them", async (t) => {
  const root = await mkdtemp(`${tmpdir()}/qx-gate-`);
  await writeFile(`${root}/index.html`, "<html>actual protected SPA</html>");
  await writeFile(`${root}/app.js`, "actual protected JavaScript");
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const code = fixtureCode();
  const child = spawn(process.execPath, ["lib/production-access-gate/serve.mjs", root], {
    env: { ...process.env, NODE_ENV: "production", PRODUCTION_ACCESS_CODE: code, PRODUCTION_ACCESS_GATE_ENABLED: "true", PORT: String(port), BASE_PATH: "/private-label-website/" },
    stdio: "ignore",
  });
  t.after(async () => { child.kill(); await rm(root, { recursive: true, force: true }); });
  const request = (url, init) => fetch(`http://127.0.0.1:${port}${url}`, { redirect: "manual", ...init });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { await request("/private-label-website/"); ready = true; break; } catch { await new Promise((r) => setTimeout(r, 20)); }
  }
  assert.ok(ready);
  assert.equal(await (await request("/private-label-website/__qx_access/healthz")).text(), '{"status":"ok"}');
  assert.equal((await request("/private-label-website/app.js")).status, 403);
  assert.match(await (await request("/private-label-website/deep-link", { headers: { accept: "text/html" } })).text(), /Access Code/);
  const f = await form(request, "/private-label-website/deep-link");
  const accepted = await submit(request, code, f, "/private-label-website/__qx_access/enter", "/private-label-website/deep-link");
  const session = cookiePair(accepted, "__Host-qxlayer-access");
  assert.equal(accepted.status, 303);
  assert.match(await (await request("/private-label-website/deep-link", { headers: { cookie: session, accept: "text/html" } })).text(), /actual protected SPA/);
  assert.equal(await (await request("/private-label-website/app.js", { headers: { cookie: session } })).text(), "actual protected JavaScript");
  assert.equal((await request("/private-label-website/missing.js", { headers: { cookie: session } })).status, 404);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createAccessGate } from "./index.mjs";

const secret = () => randomBytes(32).toString("base64url");
async function server(t, env, now) {
  if (env.QXLAYER_EXTERNAL_ENVIRONMENT === "staging" && !env.QXLAYER_PLATFORM_URL)
    env = { ...env, QXLAYER_PLATFORM_URL: "https://staging.example" };
  const gate = createAccessGate({ env, now });
  const s = createServer((req, res) => gate(req, res, () => res.end("website-open")));
  s.listen(0, "127.0.0.1"); await once(s, "listening");
  t.after(() => new Promise(resolve => { s.closeAllConnections(); s.close(resolve); }));
  const request = (path = "/", options = {}) => fetch(`http://127.0.0.1:${s.address().port}${path}`,
    { ...options, redirect: "manual" });
  request.stagingOrigin = env.QXLAYER_EXTERNAL_ENVIRONMENT === "staging" ? env.QXLAYER_PLATFORM_URL : undefined;
  return request;
}
async function enter(request, code, overrides = {}) {
  const page = await request("/", { headers: { Accept: "text/html" } });
  const html = await page.text(), csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
  const cookie = page.headers.getSetCookie().map(x => x.split(";")[0]).join("; ");
  return request("/__qx_access/enter", { method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded",
      ...(request.stagingOrigin ? { Origin: request.stagingOrigin } : {}), ...overrides },
    body: new URLSearchParams({ csrf, accessCode: code, returnTo: "/" }) });
}
test("Staging credential is distinct, persistent, secret-free in HTML, and shared across restarts", async t => {
  const code = secret(), production = secret(), env = { NODE_ENV: "production",
    QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_STAGING_ACCESS_CODE: code,
    PRODUCTION_ACCESS_CODE: production };
  let clock = Date.now();
  const a = await server(t, env, () => clock);
  const html = await (await a("/", { headers: { Accept: "text/html" } })).text();
  assert.match(html, /Staging Access Code/); assert.ok(!html.includes(code) && !html.includes(production));
  assert.equal((await enter(a, production)).status, 401);
  assert.equal((await enter(a, code, { Origin: "https://attacker.invalid" })).status, 403);
  const accepted = await enter(a, code);
  assert.equal(accepted.status, 303);
  const raw = accepted.headers.getSetCookie().find(x => x.startsWith("__Host-qxlayer-staging-access="));
  assert.match(raw, /HttpOnly; Secure; SameSite=Strict; Max-Age=604800/);
  const cookie = raw.split(";")[0];
  clock += 24 * 60 * 60 * 1000;
  const b = await server(t, env, () => clock);
  assert.equal(await (await b("/", { headers: { Cookie: cookie } })).text(), "website-open");
  const rotated = await server(t, { ...env, QXLAYER_STAGING_ACCESS_CODE: secret() }, () => clock);
  assert.equal((await rotated("/", { headers: { Cookie: cookie } })).status, 403);
  clock += 7 * 24 * 60 * 60 * 1000;
  assert.equal((await b("/", { headers: { Cookie: cookie } })).status, 403);
});
test("missing/weak Staging secret fails closed, never accepting Production fallback", async t => {
  for (const code of [undefined, "weak"]) {
    const r = await server(t, { NODE_ENV: "production", QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
      QXLAYER_STAGING_ACCESS_CODE: code, PRODUCTION_ACCESS_CODE: secret() });
    assert.equal((await r("/", { headers: { Accept: "text/html" } })).status, 503);
  }
});
test("Production ignores Staging credentials and retains non-persistent 12-hour cookie", async t => {
  const prod = secret(), stage = secret();
  const r = await server(t, { NODE_ENV: "production", QXLAYER_EXTERNAL_ENVIRONMENT: "production",
    PRODUCTION_ACCESS_CODE: prod, QXLAYER_STAGING_ACCESS_CODE: stage });
  assert.equal((await enter(r, stage)).status, 401);
  const ok = await enter(r, prod);
  assert.equal(ok.status, 303);
  assert.ok(ok.headers.getSetCookie().some(x => x.startsWith("__Host-qxlayer-access=") && !x.includes("Max-Age=")));
});

test("Staging same-origin entry is independent of a stale Render origin", async t => {
  const code = secret(), env = { NODE_ENV: "production",
    QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_STAGING_ACCESS_CODE: code,
    QXLAYER_PLATFORM_URL: "https://qxlayer-staging-current.vercel.app" };
  const frontend = await server(t, env);
  const backend = await server(t, { ...env,
    QXLAYER_PLATFORM_URL: "https://qxlayer-staging-older.vercel.app" });
  assert.equal((await enter(backend, code, { Origin: env.QXLAYER_PLATFORM_URL })).status, 403);
  assert.equal((await enter(frontend, code, {
    Origin: env.QXLAYER_PLATFORM_URL, "x-forwarded-host": "attacker.invalid",
  })).status, 303);
  for (const origin of ["null", "", "http://qxlayer-staging-current.vercel.app",
    "https://attacker.invalid", "https://qxlayer-staging-current.vercel.app.attacker.invalid"])
    assert.equal((await enter(frontend, code, { Origin: origin })).status, 403);
});

test("Staging mobile tabs reuse bounded CSRF cookies without bypassing double-submit", async t => {
  let clock = Date.now();
  const code = secret(), request = await server(t, { NODE_ENV: "production",
    QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_STAGING_ACCESS_CODE: code }, () => clock);
  const first = await request("/", { headers: { Accept: "text/html" } });
  const csrf = (await first.text()).match(/name="csrf" value="([^"]+)"/)[1];
  const cookie = first.headers.getSetCookie()[0].split(";")[0];
  clock += 60_000;
  const second = await request("/", { headers: { Accept: "text/html", Cookie: cookie } });
  assert.equal((await second.text()).match(/name="csrf" value="([^"]+)"/)[1], csrf);
  assert.match(second.headers.getSetCookie()[0], /HttpOnly; Secure; SameSite=Strict; Max-Age=840/);
  const options = { method: "POST", headers: { Cookie: cookie, Origin: request.stagingOrigin,
    "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrf, accessCode: code, returnTo: "/catalog" }) };
  assert.equal((await request("/__qx_access/enter", { ...options,
    headers: { ...options.headers, Cookie: "" } })).status, 403);
  assert.equal((await request("/__qx_access/enter", { ...options,
    body: new URLSearchParams({ csrf: "tampered", accessCode: code }) })).status, 403);
  const accepted = await request("/__qx_access/enter", options);
  assert.equal(accepted.status, 303);
  assert.equal(accepted.headers.get("location"), "/catalog");
  const accessCookie = accepted.headers.getSetCookie().find(x =>
    x.startsWith("__Host-qxlayer-staging-access=")).split(";")[0];
  const repeated = await request("/__qx_access/enter", { method: "POST",
    headers: { Cookie: accessCookie } });
  assert.equal(repeated.status, 303);
  assert.equal(repeated.headers.get("location"), "/");
  clock += 15 * 60_000;
  assert.equal((await request("/__qx_access/enter", options)).status, 403);
});

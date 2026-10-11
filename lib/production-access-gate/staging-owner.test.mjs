import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createAccessGate } from "./index.mjs";

const secret = () => randomBytes(32).toString("base64url");
async function server(t, env, now) {
  const gate = createAccessGate({ env, now });
  const s = createServer((req, res) => gate(req, res, () => res.end("website-open")));
  s.listen(0, "127.0.0.1"); await once(s, "listening");
  t.after(() => new Promise(resolve => { s.closeAllConnections(); s.close(resolve); }));
  return (path = "/", options = {}) => fetch(`http://127.0.0.1:${s.address().port}${path}`,
    { ...options, redirect: "manual" });
}
async function enter(request, code, overrides = {}) {
  const page = await request("/", { headers: { Accept: "text/html" } });
  const html = await page.text(), csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
  const cookie = page.headers.getSetCookie().map(x => x.split(";")[0]).join("; ");
  return request("/__qx_access/enter", { method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded", ...overrides },
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

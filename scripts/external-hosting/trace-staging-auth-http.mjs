/** Genuine HTTPS cookie/redirect trace. No accounts, sessions or identity links are created. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { stagingContext, SCOPE, fingerprints, admin } from "./supabase-auth-staging-context.mjs";

if (process.env.QXLAYER_STAGING_BROWSER_TEST_ACCESS_APPROVED !== "true") throw Error("Approved temporary Staging access required.");
const c = await stagingContext(), sdk = new ReplitConnectors();
const receipt = JSON.parse(await readFile(`${SCOPE}/linking-fix-release.json`, "utf8"));
const project = "prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx", team = "team_eoJE6FCcm9esuqnRTUsmopzy";
const note = `Bounded Staging HTTP diagnosis ${randomUUID()}`;
const hash = x => createHash("sha256").update(JSON.stringify(x)).digest("hex");
let bypass, disposableSubject;
async function api(route, method = "GET", body) {
  const r = await sdk.proxy("vercel", `${route}?teamId=${team}`, { method, ...(body ? { body } : {}) });
  if (!r.ok) throw Error(`Pinned Staging metadata HTTP ${r.status}`);
  return r.json();
}
const p = await api(`/v9/projects/${project}`), d = await api(`/v13/deployments/${receipt.previewId}`);
if (p.id !== project || p.name !== "qxlayer-staging" || !p.ssoProtection || d.projectId !== project ||
    d.target === "production" || d.readyState !== "READY" || `https://${d.url}` !== receipt.origin)
  throw Error("Protected Staging Preview required.");
const originalKeys = Object.keys(p.protectionBypass ?? {});
const protection = hash([p.ssoProtection, p.passwordProtection, p.trustedIps]);
const dataBefore = hash(await fingerprints(c.db));
const linksBefore = hash((await c.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows);
const jar = new Map(), report = { origin: receipt.origin, nativeBrowserVerified: false, ownerLoginAttempted: false, requests: [] };
async function request(path, options = {}) {
  const started = Date.now();
  const r = await fetch(new URL(path, receipt.origin), { ...options, redirect: "manual",
    headers: { Accept: "text/html", "x-vercel-protection-bypass": bypass,
      ...(!jar.has("_vercel_jwt") ? { "x-vercel-set-bypass-cookie": "true" } : {}),
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...options.headers },
    signal: AbortSignal.timeout(15000) });
  const attrs = [];
  for (const cookie of r.headers.getSetCookie()) {
    const [kv, ...flags] = cookie.split(";"), i = kv.indexOf("="), name = kv.slice(0, i);
    jar.set(name, kv.slice(i + 1));
    attrs.push({ name, secure: flags.some(f => /^secure$/i.test(f.trim())),
      httpOnly: flags.some(f => /^httponly$/i.test(f.trim())),
      sameSite: flags.find(f => /^samesite=/i.test(f.trim()))?.trim().split("=")[1],
      path: flags.find(f => /^path=/i.test(f.trim()))?.trim().split("=")[1] });
    const expires = flags.find(f => /^expires=/i.test(f.trim()))?.trim().slice("expires=".length);
    if (flags.some(f => /^max-age=0$/i.test(f.trim())) || (expires && Date.parse(expires) <= Date.now())) jar.delete(name);
  }
  const text = await r.text(), location = r.headers.get("location");
  report.requests.push({ path: path.split("?")[0], method: options.method ?? "GET", status: r.status,
    elapsedMs: Date.now() - started, redirectSameOrigin: location ? new URL(location, receipt.origin).origin === receipt.origin : null,
    redirectPath: location ? new URL(location, receipt.origin).pathname : null,
    cookies: attrs, privateAccessForm: text.includes('/__qx_access/enter'), appHtml: text.includes('id="root"'),
    moduleScripts: [...text.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]).filter(s => s.startsWith("/assets/")),
    referrerPolicy: r.headers.get("referrer-policy") });
  if (location) report.requests.at(-1).linkContinuationPreserved =
    new URL(location, receipt.origin).searchParams.get("next") === "/account/link-existing";
  return { r, text };
}
try {
  await writeFile(`${SCOPE}/http-diagnostic-credential-scope.json`, JSON.stringify({ project, note, cleaned: false }));
  const generated = await api(`/v1/projects/${project}/protection-bypass`, "PATCH", { generate: { note } });
  bypass = Object.entries(generated.protectionBypass ?? {}).find(([k, v]) => !originalKeys.includes(k) && v.note === note)?.[0];
  if (!bypass) throw Error("Temporary access unavailable.");
  // Project protection credentials can take time to reach the deployment edge.
  // Never follow a rejected first probe into Vercel SSO and mistake it for app auth.
  let first;
  for (let attempt = 0; attempt < 5; attempt++) {
    first = await request("/");
    if (first.r.status === 307 && new URL(first.r.headers.get("location"), receipt.origin).origin === receipt.origin) {
      first = await request(first.r.headers.get("location"));
    }
    if (first.text.includes('/__qx_access/enter')) break;
    if (first.r.status !== 302) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (first.text.includes('/__qx_access/enter')) first = await request("/sign-in?next=%2Faccount%2Flink-existing");
  const csrf = first.text.match(/name="csrf" value="([^"]+)"/)?.[1];
  const returnTo = first.text.match(/name="returnTo" value="([^"]+)"/)?.[1];
  if (!csrf || !returnTo) throw Error("Native Private Access form unavailable.");
  const password = c.env.QXLAYER_STAGING_ACCESS_MODE === "owner-password" ? process.env.PRODUCTION_ACCESS_CODE : c.env.QXLAYER_STAGING_ACCESS_CODE;
  if (!password) throw Error("Approved Staging form input unavailable.");
  const entered = await request("/__qx_access/enter", { method: "POST", headers: {
    Origin: receipt.origin, Referer: `${receipt.origin}/sign-in`, "Sec-Fetch-Site": "same-origin",
    "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrf, returnTo: returnTo.replaceAll("&amp;", "&"), accessCode: password }) });
  if (entered.r.status !== 303) throw Error("Native Staging gate did not accept the normal form.");
  await request(entered.r.headers.get("location"));
  for (const path of ["/api/supabase-auth/status", "/api/supabase-auth/session", "/api/me"]) {
    const response = await request(path, { headers: { Accept: "application/json", Origin: receipt.origin, "Sec-Fetch-Site": "same-origin" } });
    if (path.endsWith("/session") && response.r.ok) report.anonymousSessionRecognized = JSON.parse(response.text).user === null;
  }
  await request("/account/link-existing");
  const proofless = await request("/api/supabase-auth/action", { method: "POST", headers: {
    Accept: "application/json", Origin: receipt.origin, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "link-existing" }) });
  report.prooflessLinkRejected = proofless.r.status === 401;
  if (process.env.QXLAYER_STAGING_DISPOSABLE_LOGIN_TEST_APPROVED === "true") {
    const password = `${randomBytes(24).toString("base64url")}aA1!`;
    const email = `delivered+vynox-session-${randomUUID()}@resend.dev`;
    await writeFile(`${SCOPE}/http-disposable-login-scope.json`, JSON.stringify({ email, subject: null, cleaned: false }));
    const user = await admin(c.key, "/users", "POST", { email, password, email_confirm: true });
    disposableSubject = user.id;
    if (!/^[a-f0-9-]{36}$/i.test(disposableSubject ?? "")) throw Error("Disposable login subject unavailable.");
    await writeFile(`${SCOPE}/http-disposable-login-scope.json`, JSON.stringify({ email, subject: disposableSubject, cleaned: false }));
    const headers = { Accept: "application/json", Origin: receipt.origin, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" };
    const login = await request("/api/supabase-auth/action", { method: "POST", headers,
      body: JSON.stringify({ action: "login", email, password }) });
    if (login.r.status !== 200 || !JSON.parse(login.text).ok) throw Error("Real disposable password login failed.");
    const loginCookie = report.requests.at(-1).cookies.find(x => x.name === "__Host-vynox_sb");
    report.authenticatedCookieAttributesValid = !!loginCookie?.secure && !!loginCookie.httpOnly &&
      loginCookie.sameSite?.toLowerCase() === "lax" && loginCookie.path === "/";
    report.repeatedSessionStable = true;
    for (let i = 0; i < 3; i++) {
      const session = await request("/api/supabase-auth/session", { headers });
      const value = JSON.parse(session.text);
      if (session.r.status !== 200 || value.user?.id !== disposableSubject || value.mfaRequired || value.recovery)
        report.repeatedSessionStable = false;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const principal = await request("/api/me", { headers });
    const identity = JSON.parse(principal.text);
    report.disposablePrincipalUnprivileged = principal.r.status === 200 && identity.role === "unassigned" &&
      (identity.memberships ?? []).length === 0;
    const logout = await request("/api/supabase-auth/action", { method: "POST", headers, body: JSON.stringify({ action: "logout" }) });
    const afterLogout = await request("/api/supabase-auth/session", { headers });
    report.logoutHttpOkay = logout.r.status === 200;
    report.anonymousAfterLogout = JSON.parse(afterLogout.text).user === null;
    report.authCookieCleared = !jar.has("__Host-vynox_sb");
    report.logoutStable = report.logoutHttpOkay && report.anonymousAfterLogout && report.authCookieCleared;
    if (!report.authenticatedCookieAttributesValid || !report.repeatedSessionStable ||
        !report.disposablePrincipalUnprivileged || !report.logoutStable) throw Error("Live session stability assertion failed.");
  }
  report.businessDataAndPermissionsPreserved = dataBefore === hash(await fingerprints(c.db));
  report.existingLinksPreserved = linksBefore === hash((await c.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows);
} finally {
  try {
    if (disposableSubject) {
      await c.db.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [disposableSubject]);
      await admin(c.key, `/users/${disposableSubject}`, "DELETE");
      report.disposableAccountAndSessionsRemoved = true;
      await writeFile(`${SCOPE}/http-disposable-login-scope.json`, JSON.stringify({ subject: disposableSubject, cleaned: true }));
    }
    report.businessDataAndPermissionsPreserved = dataBefore === hash(await fingerprints(c.db));
    report.existingLinksPreserved = linksBefore === hash((await c.db.query("SELECT * FROM vynox_supabase_auth.identity_links ORDER BY subject")).rows);
  } finally {
   try {
    const current = await api(`/v9/projects/${project}`);
    const exact = bypass ?? Object.entries(current.protectionBypass ?? {}).find(([, v]) => v.note === note)?.[0];
    if (exact) await api(`/v1/projects/${project}/protection-bypass`, "PATCH", { revoke: { secret: exact, regenerate: false } });
    const after = await api(`/v9/projects/${project}`);
    if (Object.values(after.protectionBypass ?? {}).some(v => v.note === note) ||
        protection !== hash([after.ssoProtection, after.passwordProtection, after.trustedIps]) ||
        originalKeys.some(k => !Object.hasOwn(after.protectionBypass ?? {}, k))) throw Error("Diagnostic access cleanup failed.");
    report.temporaryCredentialRevoked = true;
    await writeFile(`${SCOPE}/http-diagnostic-credential-scope.json`, JSON.stringify({ project, note, cleaned: true }));
    await writeFile(`${SCOPE}/hosted-http-auth-trace.json`, JSON.stringify(report, null, 2));
    console.info(JSON.stringify(report, null, 2));
   } finally { await c.db.end(); }
  }
}

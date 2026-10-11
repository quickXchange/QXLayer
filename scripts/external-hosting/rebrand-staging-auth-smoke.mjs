/** Real Staging native-auth smoke; no credential changes, roles or business writes. */
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const { createClerkClient } = require("@clerk/express");
if (process.env.QXLAYER_STAGING_REBRAND_APPROVED !== "true") throw Error("Staging QA approval required.");
const response = await fetch("https://api.render.com/v1/env-groups/evg-db5ate8473hc73agdon0", {
  headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` }, signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw Error("Pinned Staging configuration unavailable.");
const group = await response.json(), env = Object.fromEntries(group.envVars.map(v => [v.key, v.value]));
if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || !env.CLERK_SECRET_KEY?.startsWith("sk_test_"))
  throw Error("Independent Staging Development authentication required.");
const release = JSON.parse(await readFile("generated-artifacts/qxlayer-staging-setup/vynox-rebrand-release.json", "utf8"));
if (release.providerTarget !== "preview" || env.QXLAYER_PLATFORM_URL !== release.previewUrl)
  throw Error("Verified final Preview binding required.");
const origin = release.previewUrl, base = "https://qxlayer-api.onrender.com";
const bindings = JSON.parse(env.QXLAYER_STAGING_IDENTITY_BINDINGS ?? "{}");
const subject = Object.keys(bindings)[0];
if (!/^user_[A-Za-z0-9]+$/.test(subject ?? "")) throw Error("Approved existing Staging identity required.");
const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY });
let sessionId;
function cookies(r, jar) {
  for (const line of r.headers.getSetCookie()) {
    const pair = line.split(";")[0], index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0,index),pair.slice(index+1));
  }
}
const cookieHeader = jar => [...jar].map(([k,v]) => `${k}=${v}`).join("; ");
try {
  // Exercise the normal password/CSRF private-access form against Staging only.
  const gateJar = new Map();
  const page = await fetch(`${origin}/sign-in`, { headers: { Origin: origin, Accept: "text/html" }, redirect: "manual" });
  cookies(page,gateJar);
  const html = await page.text(), csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
  if (!html.includes("VYNOX LAYER") || !csrf) throw Error("Branded Staging private form missing.");
  const gate = await fetch(`${origin}/__qx_access/enter`, {
    method:"POST", redirect:"manual", headers:{ Origin:origin, Cookie:cookieHeader(gateJar),
      "Content-Type":"application/x-www-form-urlencoded" },
    body:new URLSearchParams({csrf,accessCode:process.env.PRODUCTION_ACCESS_CODE ?? "",returnTo:"/sign-in"}),
  });
  cookies(gate,gateJar);
  if (gate.status !== 303) throw Error(`Staging private authentication HTTP ${gate.status}.`);
  const ticket = await clerk.signInTokens.createSignInToken({ userId: subject, expiresInSeconds:120 });
  const fapiJar = new Map();
  const fapi = `https://${env.QXLAYER_CLERK_DEVELOPMENT_HOST}`;
  const signin = await fetch(`${fapi}/v1/client/sign_ins`, {
    method:"POST", headers:{Origin:origin,"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({strategy:"ticket",ticket:ticket.token}),
  });
  cookies(signin,fapiJar);
  const data = await signin.json(), client = data.client;
  sessionId = data.response?.created_session_id;
  const session = client?.sessions?.find(s => s.id === sessionId);
  let token = session?.last_active_token?.jwt;
  if (!token && sessionId) {
    const issued = await fetch(`${fapi}/v1/client/sessions/${sessionId}/tokens`, {
      method:"POST",headers:{Origin:origin,Cookie:cookieHeader(fapiJar),"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams(),
    });
    token = (await issued.json()).response?.jwt;
  }
  if (!token || !sessionId) throw Error(`Staging native sign-in HTTP ${signin.status}.`);
  const me = await fetch(`${base}/api/me`, {
    headers:{Origin:origin,Cookie:cookieHeader(gateJar),Authorization:`Bearer ${token}`},
  });
  const principal = await me.json();
  if (me.status !== 200 || principal.userId !== bindings[subject] || principal.role !== "super_admin")
    throw Error(`Existing Staging owner principal HTTP ${me.status}; business identity/role must remain unchanged.`);
  console.log("Staging private password/CSRF, genuine native login and existing owner API authority verified.");
  await clerk.sessions.revokeSession(sessionId); sessionId = undefined;
  const denied = await fetch(`${base}/api/me`, {
    headers:{Origin:origin,Cookie:cookieHeader(gateJar),Authorization:`Bearer ${token}`},
  });
  if (denied.status !== 401) throw Error(`Revoked Staging session HTTP ${denied.status}.`);
  console.log("Staging session revocation verified; no identity, password, role or business record changed.");
} finally {
  if (sessionId) await clerk.sessions.revokeSession(sessionId);
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GetDemoSessionResponse, GetCurrentPrincipalResponse, GetTenantResponse, ListTenantsResponse, GetExchangeConfigurationResponse, CreateSandboxQuoteResponse, CreateSandboxOrderResponse, TrackSandboxOrderResponse } from "@workspace/api-zod";
const base = process.env.DEMO_VERIFY_BASE ?? "http://localhost";
const origin = new URL(base).origin;
let cookie = "";
let checks = 0;
async function request(path: string, status: number, method = "GET", body?: unknown, overrideOrigin?: string, extraHeaders?: Record<string, string>) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Origin: overrideOrigin ?? origin,
    "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  assert.equal(response.status, status, `${method} ${path}`);
  checks++;
  if (path === "/demo/session" && method === "POST" && status === 200) cookie = response.headers.getSetCookie()[0].split(";")[0];
  return response.json();
}
try {
  await request("/me", 401);
  await request("/demo/session", 403, "POST", { username: "demo@qxlayer.com", password: "Demo123!" }, "https://foreign.invalid");
  await request("/demo/session", 401, "POST", { username: "demo@qxlayer.com", password: "incorrect" });
  const session = GetDemoSessionResponse.parse(await request("/demo/session", 200, "POST", { username: "demo@qxlayer.com", password: "Demo123!", role: "super_admin", tenantId: randomUUID() }));
  assert.equal(session.active, true);
  const principal = GetCurrentPrincipalResponse.parse(await request("/me", 200));
  assert.equal(principal.role, "staff"); assert.equal(principal.demo, true);
  assert.ok(principal.memberships);
  assert.equal(principal.memberships.length, 1); assert.deepEqual(principal.memberships[0].permissions, []);
  assert.equal(principal.tenantId, session.tenantId);
  const root = `/tenants/${session.tenantId}`;
  const tenant = GetTenantResponse.parse(await request(root, 200));
  assert.equal(tenant.slug, "novax-live-demo"); assert.equal(tenant.environment, "sandbox");
  const tenants = ListTenantsResponse.parse(await request("/tenants", 200));
  assert.equal(tenants.length, 1);
  await request(`${root}/exchange/dashboard`, 200);
  const settings = GetExchangeConfigurationResponse.parse(await request(`${root}/exchange`, 200));
  assert.deepEqual(settings.configuration.actions, { swap: true, convert: true, buy: true, sell: true });
  assert.equal(settings.configuration.routes.length, 18);
  for (const action of ["swap", "convert", "buy", "sell"] as const) {
    const route = settings.configuration.routes.find(r => r.action === action)!;
    const q = CreateSandboxQuoteResponse.parse(await request("/public/sites/novax-live-demo/exchange/quotes", 200, "POST", {
      action, source: route.source, destination: route.destination,
      amount: action === "buy" ? "250" : action === "convert" ? "300" : "0.025",
      ...(route.paymentMethodIds.length ? { paymentMethodId: route.paymentMethodIds[0] } : {}),
    }));
    const created = CreateSandboxOrderResponse.parse(await request("/public/sites/novax-live-demo/exchange/orders", 201, "POST", {
      quoteToken: q.token, idempotencyKey: randomUUID(),
    }));
    assert.equal(created.order.sandboxOnly, true);
    const tracked = TrackSandboxOrderResponse.parse(await request(`/public/sites/novax-live-demo/exchange/orders/${created.order.id}`,
      200, "GET", undefined, undefined, { trackingToken: created.trackingToken }));
    assert.equal(tracked.id, created.order.id);
  }
  for (const path of ["/plans", "/add-ons", "/catalog/assets", "/operator/white-label-requests", "/customer/profile",
    "/customer/white-label-requests", `/tenants/${randomUUID()}`, `${root}/exchange/orders/${randomUUID()}`]) {
    await request(path, path.startsWith(`${root}/exchange/orders/`) ? 404 : 403);
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    for (const path of [root, `${root}/brand`, `${root}/staff/user_novaxPublicDemo/permissions`,
      `${root}/administrators`, `${root}/domain`, `${root}/activate`, `${root}/resources/api_keys`,
      `${root}/subscription`, `${root}/exchange/orders/${randomUUID()}`, `${root}/products/crypto_exchange/configuration`,
      "/customer/white-label-requests", "/plans", "/operator/white-label-requests", "/me"]) {
      await request(path, 403, method, { role: "super_admin", permissions: ["configuration.manage"], environment: "production" });
    }
  }
  await request("/demo/session", 200, "DELETE");
  await request("/me", 401); // old cookie is now revoked, not simply cleared client-side
  await request("/demo/session", 200);
  console.log(`Demo: ${checks} HTTP checks PASS; Swap/Convert/Buy/Sell/Track work; escalation, foreign tenants and admin writes denied.`);
} finally {
  if (cookie) await fetch(`${base}/api/demo/session`, { method: "DELETE", headers: { Cookie: cookie, Origin: origin } });
}

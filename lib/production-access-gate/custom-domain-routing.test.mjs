import { test } from "node:test";
import assert from "node:assert/strict";
import { requestHostname, isPublicDomainLookup, customWebsitePathAllowed, resolveCustomerHost } from "./custom-domain-routing.mjs";

const env = { QXLAYER_PLATFORM_URL: "https://platform.example.com", QXLAYER_PLATFORM_HOSTS: "platform.example.com,platform.replit.app" };
const req = host => ({ headers: { host } });
test("only exact GET lookup/proof path shapes are public", () => {
  assert(isPublicDomainLookup("/api/public/domains/customer.example.com"));
  assert(isPublicDomainLookup(`/api/public/domains/customer.example.com/hosting-proof/${"a".repeat(48)}`));
  for (const path of ["/api/me", "/api/tenants/x", "/api/public/domains/a/admin", "/api/public/domains/a/../tenants", "/api/public/domains/a/hosting-proof/short"]) {
    assert.equal(isPublicDomainLookup(path), false, path);
  }
});
test("authoritative tenant hostname resolution uses configured platform only", async () => {
  let target;
  const site = await resolveCustomerHost(req("Customer.Example.Com:443"), env, async url => {
    target = url; return { ok: true, json: async () => ({ domain: "customer.example.com", tenantSlug: "wl-a" }) };
  });
  assert.equal(target, "https://platform.example.com/api/public/domains/customer.example.com");
  assert.deepEqual(site, { hostname: "customer.example.com", slug: "wl-a" });
});
test("no authority, mismatched domain, invalid slug, timeout or redirect failures never grant access", async () => {
  for (const body of [{ domain: "other.example.com", tenantSlug: "wl-a" }, { domain: "a.example.com", tenantSlug: "../admin" }]) {
    assert.equal(await resolveCustomerHost(req("a.example.com"), env, async () => ({ ok: true, json: async () => body })), null);
  }
  assert.equal(await resolveCustomerHost(req("a.example.com"), env, async () => ({ ok: false })), null);
  assert.equal(await resolveCustomerHost(req("a.example.com"), env, async () => { throw new Error("timeout"); }), null);
  assert.equal(await resolveCustomerHost(req("a.example.com"), {}), null);
  assert.equal(await resolveCustomerHost(req("a.example.com"), { QXLAYER_PLATFORM_URL: "http://private.invalid" }), null);
});
test("platform and Development hosts do not trigger customer-domain resolution", async () => {
  for (const host of ["platform.example.com", "platform.replit.app", "workspace.replit.dev", "localhost:80", "127.0.0.1:8080", "10.0.0.1"]) {
    assert.equal(await resolveCustomerHost(req(host), env, async () => { throw new Error("must not fetch"); }), null);
  }
});
test("customer hostname may render only its own public site, never tenant administration or another tenant", () => {
  for (const path of ["/", "/private-label-website/wl-a", "/private-label-website/wl-a/privacy", "/private-label-website/assets/index.js", "/api/public/sites/wl-a", "/api/public/sites/wl-a/exchange/quotes"]) {
    assert.equal(customWebsitePathAllowed(path, "wl-a"), true, path);
  }
  for (const path of ["/clients/a/exchange", "/api/tenants/a", "/api/customer/admin-panels", "/api/operator/white-label-requests", "/private-label-website/wl-b", "/api/public/sites/wl-b"]) {
    assert.equal(customWebsitePathAllowed(path, "wl-a"), false, path);
  }
});
test("malformed forwarded authority is rejected rather than used as a target", () => {
  assert.equal(requestHostname(req("a.example.com/path")), null);
  assert.equal(requestHostname(req("a.example.com@internal")), null);
  assert.equal(requestHostname({ headers: { host: "internal", "x-forwarded-host": "Customer.Example.Com, proxy.internal" } }), "customer.example.com");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublicAddress } from "./https-probe";
import { hostingProof, challengeHash } from "./hosting";
import { deliveryLinks } from "../customer/delivery-links";
import { safeProvisioningError } from "../customer/provisioning";
import { HttpError } from "../../lib/errors";
import { customerHostname } from "./hostname";

test("hosting probes reject private, link-local, metadata, documentation and mapped addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "172.16.1.2", "192.168.1.1",
    "100.64.2.1", "198.18.1.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "224.0.0.1",
    "::", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1",
    "0:0:0:0:0:ffff:7f00:1", "2001:0db8::1", "2002:7f00:1::", "not-an-ip"]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
});
test("globally routable addresses remain eligible", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "34.120.1.1", "2606:4700:4700::1111", "2001:4860:4860::8888"]) {
    assert.equal(isPublicAddress(ip), true, ip);
  }
});
test("customer hostnames normalize IDNs and reject paths, protocols and reserved platform authority", () => {
  assert.equal(customerHostname("CUSTOMER.Example.Com."), "customer.example.com");
  assert.match(customerHostname("bücher.example.com"), /^xn--/);
  for (const domain of ["https://customer.example.com", "customer.example.com/path", "127.0.0.1", "workspace.replit.dev"]) {
    assert.throws(() => customerHostname(domain), HttpError);
  }
  if (process.env.QXLAYER_PLATFORM_URL) assert.throws(() => customerHostname(new URL(process.env.QXLAYER_PLATFORM_URL!).hostname), HttpError);
});
test("hosting proof is bound to domain, slug and fresh nonce; missing signing configuration fails closed", () => {
  const previous = process.env.SESSION_SECRET;
  try {
    process.env.SESSION_SECRET = "unit-fixture-not-a-production-secret";
    const proof = hostingProof("a.example.com", "wl-a", "a".repeat(48));
    assert.match(proof, /^[a-f0-9]{64}$/);
    assert.notEqual(proof, hostingProof("b.example.com", "wl-a", "a".repeat(48)));
    assert.notEqual(proof, hostingProof("a.example.com", "wl-b", "a".repeat(48)));
    assert.notEqual(proof, hostingProof("a.example.com", "wl-a", "b".repeat(48)));
    assert.equal(challengeHash("a"), challengeHash("a"));
    assert.notEqual(challengeHash("a"), challengeHash("b"));
    delete process.env.SESSION_SECRET;
    assert.throws(() => hostingProof("a.example.com", "wl-a", "a".repeat(48)), /not configured/);
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previous;
  }
});
test("delivery links are absent in every undelivered stage and incomplete link", () => {
  for (const status of ["new", "approved", "in_setup", "customization", "ready", "rejected", "cancelled"]) {
    assert.deepEqual(deliveryLinks({ status, tenantId: "tenant-a" }, "wl-a"), { websiteUrl: null, adminPanelUrl: null });
  }
  assert.equal(deliveryLinks({ status: "delivered", tenantId: null }, "wl-a").websiteUrl, null);
  assert.equal(deliveryLinks({ status: "delivered", tenantId: "tenant-a" }).websiteUrl, null);
  assert.match(deliveryLinks({ status: "delivered", tenantId: "tenant-a" }, "wl-a").websiteUrl!, /\/private-label-website\/wl-a$/);
});
test("provisioning diagnostics preserve safe actionable errors but never raw internals", () => {
  assert.equal(safeProvisioningError(new HttpError(409, "Set final pricing first.")), "Set final pricing first.");
  assert(!safeProvisioningError(new Error("postgresql://fixture-password@internal.invalid")).includes("postgresql"));
  assert(!safeProvisioningError(new HttpError(503, "internal-secret-fixture")).includes("internal-secret"));
});

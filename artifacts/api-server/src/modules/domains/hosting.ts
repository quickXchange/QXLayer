import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { withDatabase } from "@workspace/db";
import { contextFor, type Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { resolvePublicDomain } from "./service";
import { fetchHostingProof } from "./https-probe";

export const challengeHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function hostingProof(domain: string, slug: string, nonce: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new HttpError(503, "Domain routing verification is not configured.");
  return createHmac("sha256", secret).update(JSON.stringify(["qxlayer-domain-hosting", domain, slug, nonce])).digest("hex");
}
export async function publicHostingProof(domain: string, nonce: string) {
  if (!/^[a-f0-9]{48}$/.test(nonce)) throw new HttpError(400, "Invalid hosting challenge.");
  const site = await resolvePublicDomain(domain);
  if (!site.tenantSlug) throw new HttpError(404, "Website not available.");
  return { proof: hostingProof(domain, site.tenantSlug, nonce) };
}
export function hostingObservation(c: import("@workspace/db").DatabaseClient, tenantId: string, token: string) {
  return c.query(`SELECT metadata,created_at FROM audit_events WHERE tenant_id=$1
    AND event_type='domain.hosting_checked' AND metadata->>'challengeHash'=$2
    ORDER BY created_at DESC,id DESC LIMIT 1`, [tenantId, challengeHash(token)]);
}
export async function checkHosting(p: Principal, tenantId: string, probe = fetchHostingProof) {
  contextFor(p, tenantId, true, "domains.manage");
  const row = await withDatabase(contextFor(p, tenantId), async c => {
    const r = await c.query(`SELECT d.*,t.slug FROM tenant_domains d JOIN tenants t ON t.id=d.tenant_id WHERE d.tenant_id=$1`, [tenantId]);
    return r.rows[0];
  });
  if (!row || row.status !== "verified") throw new HttpError(409, "Verify domain ownership before checking hosting.");
  // This also rejects paused, undelivered, missing-plan or unauthorized public sites.
  await resolvePublicDomain(row.domain);
  const nonce = randomBytes(24).toString("hex");
  let connected = false;
  let error: string | null = null;
  try {
    const proof = await probe(row.domain, nonce);
    const expected = hostingProof(row.domain, row.slug, nonce);
    connected = /^[a-f0-9]{64}$/.test(proof) && timingSafeEqual(Buffer.from(proof, "hex"), Buffer.from(expected, "hex"));
    if (!connected) error = "HTTPS reached a different website. Check that this exact hostname is connected to QXLayer Publishing.";
  } catch {
    error = "HTTPS or QXLayer routing is not ready. Link this hostname in Publishing, apply its exact DNS records, wait for TLS issuance, then retry.";
  }
  await withDatabase(contextFor(p, tenantId, true, "domains.manage"), async c => {
    const current = await c.query("SELECT domain,verification_token FROM tenant_domains WHERE tenant_id=$1 FOR UPDATE", [tenantId]);
    if (current.rows[0]?.domain !== row.domain || current.rows[0]?.verification_token !== row.verification_token) {
      throw new HttpError(409, "Domain changed during the hosting check. Retry its new challenge.");
    }
    await audit(c, p, tenantId, "domain.hosting_checked", connected ? "HTTPS and tenant routing verified" : "Hosting check requires action", {
      domain: row.domain, challengeHash: challengeHash(row.verification_token), connected, error,
    });
  });
}

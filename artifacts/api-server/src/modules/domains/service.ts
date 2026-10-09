import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { withDatabase } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { contextFor, type Principal } from "../authentication/service";
import { assertOperational, resolveEntitlements } from "../entitlements/resolver";
import { getPublicSite } from "../website/service";
import { hostingObservation } from "./hosting";
import { customerHostname } from "./hostname";

export function newDomainChallenge() { return `wl-core-${randomBytes(24).toString("hex")}`; }
export function getDomainVerification(principal: Principal, tenantId: string) {
  return withDatabase(contextFor(principal, tenantId), async (client) => {
    const r = await client.query(`SELECT d.domain,d.status,d.verification_token,
      (t.status='active' AND EXISTS(SELECT 1 FROM white_label_requests w WHERE w.tenant_id=t.id AND w.status='delivered')) AS publicly_delivered
      FROM tenant_domains d JOIN tenants t ON t.id=d.tenant_id WHERE d.tenant_id=$1`, [tenantId]);
    const row = r.rows[0];
    const checked = row?.status === "verified" ? (await hostingObservation(client, tenantId, row.verification_token)).rows[0] : null;
    const connected = !!row?.publicly_delivered && !!checked?.metadata.connected && Date.now() - new Date(checked.created_at).getTime() < 24 * 60 * 60 * 1000;
    return { domain: row?.domain ?? null, status: row?.status ?? "unconfigured", txtName: row ? `_white-label.${row.domain}` : null,
      txtValue: row?.verification_token ?? null, hostingConnected: connected, httpsReady: connected,
      hostingCheckedAt: checked?.created_at ?? null, hostingError: checked?.metadata.error ?? null,
      websiteUrl: connected ? `https://${row.domain}` : null,
      instructions: [
        "Create the ownership TXT record below at your DNS provider, then verify ownership.",
        "An authorized QXLayer publisher must add this exact hostname in Replit Publishing → Custom domains.",
        "Apply the exact A/CNAME and verification TXT records displayed by Publishing; do not guess an IP address.",
        "Keep Publishing's verification TXT record permanently for certificate renewal. Each subdomain needs its own connection.",
        "Replit issues and renews HTTPS after DNS is correct. Once the website is activated and delivered, check HTTPS and routing below.",
      ] };
  });
}
export async function verifyTenantDomain(principal: Principal, tenantId: string, lookup = resolveTxt) {
  contextFor(principal, tenantId, true, "domains.manage");
  const challenge = await getDomainVerification(principal, tenantId);
  if (!challenge.domain || !challenge.txtName || !challenge.txtValue) throw new HttpError(400, "Configure a domain first.");
  let records: string[][];
  try { records = await lookup(challenge.txtName); }
  catch { throw new HttpError(400, "DNS TXT challenge is not available yet."); }
  if (!records.some((r) => r.join("") === challenge.txtValue)) throw new HttpError(400, "DNS ownership challenge does not match.");
  await withDatabase(contextFor(principal, tenantId, true, "domains.manage"), async (client) => {
    assertOperational(await resolveEntitlements(client, tenantId));
    const r = await client.query("UPDATE tenant_domains SET status='verified',verified_at=now() WHERE tenant_id=$1 AND domain=$2 AND verification_token=$3 RETURNING domain", [tenantId, challenge.domain, challenge.txtValue]);
    if (!r.rowCount) throw new HttpError(409, "Domain changed during verification. Retry its new challenge.");
    await audit(client, principal, tenantId, "domain.ownership_verified", "Verified DNS ownership; hosting not connected", { domain: challenge.domain });
  });
  return getDomainVerification(principal, tenantId);
}
export async function resolvePublicDomain(hostname: string) {
  if (!/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/.test(hostname) || hostname.length > 253) throw new HttpError(404, "Website not available.");
  try { customerHostname(hostname); } catch { throw new HttpError(404, "Website not available."); }
  const slug = await withDatabase({ actorId: "public-domain", publicDomain: hostname }, async (client) => {
    const r = await client.query(`SELECT t.slug FROM tenants t JOIN tenant_domains d ON d.tenant_id=t.id
      WHERE d.domain=$1 AND d.status='verified' AND t.status='active'
      AND EXISTS(SELECT 1 FROM white_label_requests w WHERE w.tenant_id=t.id AND w.status='delivered')`, [hostname]);
    return r.rows[0]?.slug as string | undefined;
  });
  if (!slug) throw new HttpError(404, "Website not available.");
  return getPublicSite(slug);
}
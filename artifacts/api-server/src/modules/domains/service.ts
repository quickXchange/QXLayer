import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { withDatabase } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { contextFor, type Principal } from "../authentication/service";
import { assertOperational, resolveEntitlements } from "../entitlements/resolver";
import { getPublicSite } from "../website/service";

export function newDomainChallenge() { return `wl-core-${randomBytes(24).toString("hex")}`; }
export function getDomainVerification(principal: Principal, tenantId: string) {
  return withDatabase(contextFor(principal, tenantId), async (client) => {
    const r = await client.query("SELECT domain,status,verification_token FROM tenant_domains WHERE tenant_id=$1", [tenantId]);
    const row = r.rows[0];
    return { domain: row?.domain ?? null, status: row?.status ?? "unconfigured", txtName: row ? `_white-label.${row.domain}` : null, txtValue: row?.verification_token ?? null, hostingConnected: false };
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
  const slug = await withDatabase({ actorId: "public-domain", publicDomain: hostname }, async (client) => {
    const r = await client.query("SELECT t.slug FROM tenants t JOIN tenant_domains d ON d.tenant_id=t.id WHERE d.domain=$1 AND d.status='verified' AND t.status='active'", [hostname]);
    return r.rows[0]?.slug as string | undefined;
  });
  if (!slug) throw new HttpError(404, "Website not available.");
  return getPublicSite(slug);
}
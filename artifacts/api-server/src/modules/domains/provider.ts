import { withDatabase } from "@workspace/db";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { challengeHash } from "./hosting";
import { getDomainVerification } from "./service";

// Customer DNS is never edited here. This adapter can register/read an exact
// ownership-verified hostname on the explicitly configured protected project.
export const hostingProvider = () => process.env.QXLAYER_HOSTING_PROVIDER === "vercel" ||
  !!process.env.QXLAYER_EXTERNAL_ENVIRONMENT ? "vercel" as const : "replit" as const;
export const providerManagementAvailable = () => !!process.env.VERCEL_DOMAIN_TOKEN &&
  /^prj_[A-Za-z0-9]+$/.test(process.env.VERCEL_DOMAIN_PROJECT_ID ?? "") &&
  /^team_[A-Za-z0-9]+$/.test(process.env.VERCEL_DOMAIN_TEAM_ID ?? "");
export function providerObservation(c: import("@workspace/db").DatabaseClient, tenantId: string, token: string) {
  return c.query(`SELECT metadata,created_at FROM audit_events WHERE tenant_id=$1 AND event_type='domain.provider_checked'
    AND metadata->>'challengeHash'=$2 ORDER BY created_at DESC,id DESC LIMIT 1`, [tenantId, challengeHash(token)]);
}
export async function manageDomainProvider(p: Principal, tenantId: string, action: "register" | "refresh") {
  const ctx = contextFor(p, tenantId, true, "domains.manage");
  if (action === "register") requireSuperAdmin(p);
  if (!providerManagementAvailable()) throw new HttpError(503, "Hosting management is not configured. Super Admin must configure the protected project's server-only Vercel domain token.");
  const domain = await getDomainVerification(p, tenantId);
  if (!domain.domain || domain.status !== "verified") throw new HttpError(409, "Verify this tenant's domain TXT ownership before contacting the hosting provider.");
  if (action === "register" && process.env.QXLAYER_CUSTOM_DOMAIN_ACTIVATION_APPROVED !== "true")
    throw new HttpError(409, "Custom-domain registration is held until Super Admin approves the real hostname and hosting deployment. No provider or DNS change was made.");
  const project = process.env.VERCEL_DOMAIN_PROJECT_ID!, team = process.env.VERCEL_DOMAIN_TEAM_ID!;
  const request = async (path: string, method = "GET", body?: unknown) => {
    const r = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
      method, headers: { Authorization: `Bearer ${process.env.VERCEL_DOMAIN_TOKEN}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: "error", signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new HttpError(r.status === 404 ? 409 : 502, r.status === 404
      ? "This hostname is not registered on the configured hosting project."
      : r.status === 401 || r.status === 403 ? "Hosting management authorization was rejected. Super Admin must check the server token and project scope."
      : "Hosting provider request failed. Check project ownership and hostname availability.");
    return await r.json() as {
      name?: string; verified?: boolean; misconfigured?: boolean;
      verification?: { type: string; domain: string; value: string }[];
      recommendedCNAME?: { value: string }[];
      recommendedIPv4?: { value: string | string[] }[];
    };
  };
  // A register call deliberately does not create an alias to Production or Preview.
  // Provider routing must be bound explicitly to the accepted deployment by the operator.
  const current = action === "register"
    ? await request(`/v10/projects/${project}/domains`, "POST", { name: domain.domain })
    : await request(`/v9/projects/${project}/domains/${encodeURIComponent(domain.domain)}`);
  if (current.name !== domain.domain) throw new HttpError(502, "Hosting provider returned a different hostname. No tenant readiness was changed.");
  const records: { type: string; name: string; value: string; purpose: string }[] = (current.verification ?? [])
    .filter((v: any) => v.type === "TXT" && typeof v.domain === "string" && typeof v.value === "string")
    .map((v: any) => ({ type: "TXT", name: v.domain, value: v.value, purpose: "Vercel ownership verification" }));
  const config = await request(`/v6/domains/${encodeURIComponent(domain.domain)}/config?projectId=${project}`);
  for (const item of config.recommendedCNAME ?? [])
    if (typeof item.value === "string") records.push({ type: "CNAME", name: domain.domain, value: item.value, purpose: "Hosting routing (provider recommendation)" });
  for (const item of config.recommendedIPv4 ?? [])
    for (const value of Array.isArray(item.value) ? item.value : [item.value])
      if (typeof value === "string") records.push({ type: "A", name: domain.domain, value, purpose: "Hosting routing (provider recommendation)" });
  await withDatabase(ctx, async c => {
    const r = await c.query("SELECT domain,verification_token FROM tenant_domains WHERE tenant_id=$1 FOR UPDATE", [tenantId]);
    if (r.rows[0]?.domain !== domain.domain || r.rows[0]?.verification_token !== domain.txtValue) throw new HttpError(409, "Domain changed while checking hosting. Refresh and retry.");
    await audit(c, p, tenantId, "domain.provider_checked", "Read hosting registration and DNS recommendations; no DNS changed", {
      challengeHash: challengeHash(domain.txtValue!), registered: true, verified: current.verified === true,
      records, error: config.misconfigured ? "Hosting DNS is not correctly configured yet." : null,
    });
  });
  return getDomainVerification(p, tenantId);
}

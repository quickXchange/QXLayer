import { requireSuperAdmin, type Principal } from "../authentication/service";
import { getTenant } from "../tenants/service";
import { HttpError } from "../../lib/errors";
import { issuePreview } from "./operator-preview";

export async function getTenantWebsitePreview(principal: Principal, tenantId: string) {
  requireSuperAdmin(principal);
  const tenant = await getTenant(principal, tenantId);
  if (tenant.environment !== "sandbox" || !["draft", "active"].includes(tenant.status)) {
    throw new HttpError(404, "Website preview is unavailable for this tenant.");
  }
  return { url: `/api/tenants/${tenantId}/website-preview/open`, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
}

export async function openTenantWebsitePreview(principal: Principal, tenantId: string) {
  await getTenantWebsitePreview(principal, tenantId);
  const tenant = await getTenant(principal, tenantId);
  return { ...issuePreview(tenantId, tenant.slug, principal.userId), slug: tenant.slug };
}

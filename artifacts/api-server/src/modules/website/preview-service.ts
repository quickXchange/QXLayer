import { requireSuperAdmin, type Principal } from "../authentication/service";
import { getTenant } from "../tenants/service";
import { HttpError } from "../../lib/errors";
import { createDevelopmentPreviewToken, developmentPreviewEnabled } from "./development-preview";

export async function getTenantWebsitePreview(principal: Principal, tenantId: string) {
  if (!developmentPreviewEnabled()) throw new HttpError(404, "Development website preview is unavailable.");
  requireSuperAdmin(principal);
  const tenant = await getTenant(principal, tenantId);
  if (tenant.environment !== "sandbox" || !["draft", "active"].includes(tenant.status)) {
    throw new HttpError(404, "Website preview is unavailable for this tenant.");
  }
  const { token, expiresAt } = createDevelopmentPreviewToken(tenantId, tenant.slug);
  return { url: `/private-label-website/${encodeURIComponent(tenant.slug)}?preview=${encodeURIComponent(token)}`, expiresAt };
}

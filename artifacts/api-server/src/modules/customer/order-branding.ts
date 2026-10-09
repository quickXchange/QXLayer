import { customerHostname } from "../domains/hostname";
import type { DatabaseClient } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { newDomainChallenge } from "../domains/service";
import { masterWebsiteDefaults } from "../../products/exchange/master-template";

/** Apply only this order's collected identity, inside the preparation transaction. */
export async function applyOrderBranding(c: DatabaseClient, tenantId: string, slug: string,
  order: { id: string; configuration: Record<string, any> }) {
  const config = order.configuration;
  const design = config.design;
  const websiteName = config.websiteName?.trim() || config.brandName;
  const settings = masterWebsiteDefaults(websiteName);
  if (design?.faviconAttachmentId) settings.faviconUrl = `/api/public/sites/${slug}/branding/favicon`;
  await c.query(`UPDATE tenant_branding SET brand_name=$2,logo_url=$3,
    primary_color=$4,accent_color=$5,theme_mode=$6,website_settings=$7 WHERE tenant_id=$1`, [
    tenantId, config.brandName,
    design?.logoAttachmentId ? `/api/public/sites/${slug}/branding/logo` : null,
    design?.primaryColor ?? "#18263c", design?.accentColor ?? "#5b7df6",
    design?.themePreference === "both" ? "system" : design?.themePreference ?? "system",
    JSON.stringify(settings),
  ]);
  let domain: string | null = null;
  if (config.preferredDomain) {
    domain = customerHostname(config.preferredDomain);
    await c.query("INSERT INTO tenant_domains(tenant_id,domain,verification_token) VALUES($1,$2,$3)", [tenantId, domain, newDomainChallenge()]);
  }
  await c.query("UPDATE tenants SET completed_steps=ARRAY(SELECT DISTINCT unnest(completed_steps || ARRAY['brand','domain']::text[])) WHERE id=$1", [tenantId]);
}

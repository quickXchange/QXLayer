import { withDatabase } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { readTenant } from "../tenants/service";
import { requireFeature, resolveEntitlements } from "../entitlements/resolver";
import { previewBrandingUrl, type WebsitePreview } from "./operator-preview";
import { publicExchangeConfiguration } from "../../products/exchange/public-configuration";
import { ACTIONS } from "../../products/exchange/settings";
import { DEMO_SLUG } from "../demo/identity";

export async function publicTenantId(slug: string, preview?: WebsitePreview) {
  if (slug === DEMO_SLUG) throw new HttpError(403, "This reserved demo uses isolated fictional configuration only.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 48) throw new HttpError(404, "Website not available.");
  if (preview && (preview.slug !== slug || preview.expiresAt <= Date.now())) throw new HttpError(403, "Private preview expired.");
  const id = await withDatabase({ actorId: "public-site", publicSlug: slug, isSuperAdmin: !!preview }, async (client) => {
    const r = await client.query(`SELECT id FROM tenants t WHERE slug=$1 AND
      ((status='active' AND NOT EXISTS (SELECT 1 FROM white_label_requests w WHERE w.tenant_id=t.id AND w.status<>'delivered'))
        OR ($2::uuid=t.id AND t.environment='sandbox' AND t.status IN ('draft','active')))`, [slug, preview?.tenantId ?? null]);
    return r.rows[0]?.id as string | undefined;
  });
  if (!id) throw new HttpError(404, "Website not available.");
  return id;
}
export async function getPublicSite(slug: string, feature?: string, preview?: WebsitePreview) {
  const id = await publicTenantId(slug, preview);
  return withDatabase({ actorId: "public-site", tenantId: id, isSuperAdmin: !!preview }, async (client) => {
    const e = await resolveEntitlements(client, id);
    if ((!preview && e.tenantStatus !== "active") || e.status !== "active" || !e.features.website) throw new HttpError(404, "Website not available.");
    if (feature) requireFeature(e, feature);
    const t = await readTenant(client, id);
    if (feature === "crypto_exchange") return { feature, status: "sandbox_ready", message: "White Label Exchange supports manually configured sandbox quotes, simulated orders and private tracking. No funds, wallets, deposit addresses, blockchain transactions or payments are involved." };
    if (feature) return { feature, status: "foundation_only", message: "This capability is entitled for this tenant. Product execution is deferred; no payment, exchange, wallet, blockchain, webhook delivery or Telegram connection is performed." };
    const exchange = e.features.crypto_exchange ? await publicExchangeConfiguration(client, id, e) : null;
    const publicFeatures = { ...e.features };
    if (exchange) for (const action of ACTIONS) publicFeatures[action] = exchange.actions.includes(action);
    const assets = exchange
      ? { rows: exchange.assets }
      : await client.query(
      `SELECT c.asset_id AS "assetId",a.symbol,a.name,c.network_id AS "networkId",n.name AS "networkName",n.testnet
       FROM tenant_asset_networks t JOIN asset_network_catalog c ON c.id=t.asset_network_id
       JOIN asset_catalog a ON a.id=c.asset_id JOIN network_catalog n ON n.id=c.network_id
       WHERE t.tenant_id=$1 ORDER BY a.symbol,n.name`, [id],
    );
    // Never serialize t/e wholesale: their plan, usage, overrides, IDs and staff are private.
    return {
      tenantSlug: t.slug, brandName: t.brandName, logoUrl: previewBrandingUrl(t.logoUrl, slug, preview),
      primaryColor: t.primaryColor, accentColor: t.accentColor, themeMode: t.themeMode,
      domain: t.domain, sandboxOnly: true, websiteSettings: {
        ...t.websiteSettings, faviconUrl: previewBrandingUrl(t.websiteSettings.faviconUrl, slug, preview),
      },
      features: publicFeatures, assets: assets.rows,
    };
  });
}
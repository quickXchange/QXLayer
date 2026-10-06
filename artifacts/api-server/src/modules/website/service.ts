import { withDatabase } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { readTenant } from "../tenants/service";
import { requireFeature, resolveEntitlements } from "../entitlements/resolver";

export async function publicTenantId(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 48) throw new HttpError(404, "Website not available.");
  const id = await withDatabase({ actorId: "public-site", publicSlug: slug }, async (client) => {
    const r = await client.query(`SELECT id FROM tenants t WHERE slug=$1 AND status='active'
      AND NOT EXISTS (SELECT 1 FROM white_label_requests w WHERE w.tenant_id=t.id AND w.status<>'delivered')`, [slug]);
    return r.rows[0]?.id as string | undefined;
  });
  if (!id) throw new HttpError(404, "Website not available.");
  return id;
}
export async function getPublicSite(slug: string, feature?: string) {
  const id = await publicTenantId(slug);
  return withDatabase({ actorId: "public-site", tenantId: id }, async (client) => {
    const e = await resolveEntitlements(client, id);
    if (e.tenantStatus !== "active" || !e.features.website) throw new HttpError(404, "Website not available.");
    if (feature) requireFeature(e, feature);
    const t = await readTenant(client, id);
    if (feature === "crypto_exchange") return { feature, status: "sandbox_ready", message: "White Label Exchange supports manually configured sandbox quotes, simulated orders and private tracking. No funds, wallets, deposit addresses, blockchain transactions or payments are involved." };
    if (feature) return { feature, status: "foundation_only", message: "This capability is entitled for this tenant. Product execution is deferred; no payment, exchange, wallet, blockchain, webhook delivery or Telegram connection is performed." };
    const assets = await client.query(
      `SELECT c.asset_id AS "assetId",a.symbol,a.name,c.network_id AS "networkId",n.name AS "networkName",n.testnet
       FROM tenant_asset_networks t JOIN asset_network_catalog c ON c.id=t.asset_network_id
       JOIN asset_catalog a ON a.id=c.asset_id JOIN network_catalog n ON n.id=c.network_id
       WHERE t.tenant_id=$1 ORDER BY a.symbol,n.name`, [id],
    );
    // Never serialize t/e wholesale: their plan, usage, overrides, IDs and staff are private.
    return {
      tenantSlug: t.slug, brandName: t.brandName, logoUrl: t.logoUrl,
      primaryColor: t.primaryColor, accentColor: t.accentColor, themeMode: t.themeMode,
      domain: t.domain, sandboxOnly: true, websiteSettings: t.websiteSettings,
      features: e.features, assets: assets.rows,
    };
  });
}
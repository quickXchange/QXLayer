import { SaveExchangeConfigurationBody } from "@workspace/api-zod";
import type { ExchangeSettings, ExchangeCatalogAsset } from "@workspace/api-zod";
import type { DatabaseClient } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { decimal } from "../../modules/entitlements/decimal";
import { requireFeature, type EffectiveEntitlements } from "../../modules/entitlements/resolver";
import { safeHttps } from "../../modules/website/settings";

export const ACTIONS = ["swap", "convert", "buy", "sell"] as const;
export function emptySettings(): ExchangeSettings {
  return { enabled: false, defaultAction: "swap", publicNote: "", fiatCurrency: "USD", fiatPlanRate: "0",
    actions: { swap: false, convert: false, buy: false, sell: false },
    assets: [], networks: [], routes: [], paymentMethods: [] };
}
export async function readExchange(client: DatabaseClient, tenantId: string) {
  const rows = await client.query("SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
  const raw = rows.rows[0]?.configuration ?? {};
  const configuration = SaveExchangeConfigurationBody.parse({ ...emptySettings(), ...raw });
  const catalog = (await client.query(
    `SELECT c.id AS "assetNetworkId",c.asset_id AS "assetId",a.symbol,a.name,c.network_id AS "networkId",n.name AS "networkName",n.testnet
     FROM tenant_asset_networks t JOIN asset_network_catalog c ON c.id=t.asset_network_id
     JOIN asset_catalog a ON a.id=c.asset_id JOIN network_catalog n ON n.id=c.network_id
     WHERE t.tenant_id=$1 ORDER BY a.symbol,n.name`, [tenantId])).rows as ExchangeCatalogAsset[];
  return { configuration, catalog };
}
function unique(values: string[], label: string) {
  if (values.length !== new Set(values).size) throw new HttpError(400, `Duplicate ${label}.`);
}
export function validateExchange(value: unknown, e: EffectiveEntitlements, catalog?: ExchangeCatalogAsset[]) {
  const s = SaveExchangeConfigurationBody.parse(value);
  if (Buffer.byteLength(JSON.stringify(s)) > 32768) throw new HttpError(400, "Exchange configuration must be at most 32 KiB.");
  for (const action of ACTIONS) if (s.actions[action]) requireFeature(e, action);
  unique(s.assets.map(a => a.assetId), "assets");
  unique(s.networks.map(n => n.assetNetworkId), "networks");
  unique(s.routes.map(r => r.id), "route identifiers");
  unique(s.routes.map(r => `${r.action}:${r.source}:${r.destination}`), "routes for an action and pair");
  unique(s.paymentMethods.map(m => m.id), "payment methods");
  const assetIds = catalog && new Set(catalog.map(a => a.assetId));
  const networkIds = catalog && new Set(catalog.map(a => a.assetNetworkId));
  for (const a of s.assets) {
    if (assetIds && !assetIds.has(a.assetId)) throw new HttpError(400, "Select the asset in tenant Assets & Networks before configuring it.");
    if (!/^[A-Za-z0-9._-]+$/.test(a.symbol)) throw new HttpError(400, "Invalid asset symbol.");
    safeHttps(a.logoUrl);
  }
  for (const n of s.networks) {
    if (networkIds && !networkIds.has(n.assetNetworkId)) throw new HttpError(400, "Network is not selected for this tenant.");
    if (decimal(n.maximum) < decimal(n.minimum)) throw new HttpError(400, "Network maximum must be at least its minimum.");
  }
  for (const m of s.paymentMethods) {
    if (!m.label.trim()) throw new HttpError(400, "Payment method label is required.");
    if (m.currency !== s.fiatCurrency) throw new HttpError(400, "Payment method currency must match exchange fiat currency.");
    if (m.enabled && m.buy) requireFeature(e, "buy");
    if (m.enabled && m.sell) requireFeature(e, "sell");
  }
  const fiat = `fiat:${s.fiatCurrency}`;
  const validEndpoint = (id: string) => id === fiat || s.networks.some(n => n.assetNetworkId === id);
  for (const r of s.routes) {
    if (r.source === r.destination || !validEndpoint(r.source) || !validEndpoint(r.destination)) throw new HttpError(400, "Routes require distinct, configured source and destination endpoints.");
    if ((r.action === "buy" && (r.source !== fiat || r.destination === fiat)) ||
        (r.action === "sell" && (r.destination !== fiat || r.source === fiat)) ||
        (["swap", "convert"].includes(r.action) && (r.source === fiat || r.destination === fiat))) throw new HttpError(400, "Route endpoints do not match its exchange action.");
    if (decimal(r.rate) <= 0n || decimal(r.maximum) < decimal(r.minimum) || decimal(r.maximum) === 0n) throw new HttpError(400, "Set a positive rate and valid nonzero route limits.");
    if (r.enabled) requireFeature(e, r.action);
    if (r.paymentMethodIds.some(id => !s.paymentMethods.some(m => m.id === id))) throw new HttpError(400, "Route payment method does not belong to this exchange.");
  }
  return s;
}
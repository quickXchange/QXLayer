import type { DatabaseClient } from "@workspace/db";
import type { EffectiveEntitlements } from "../../modules/entitlements/resolver";
import { ACTIONS, readExchange } from "./settings";
import type { ExchangeSettings, ExchangeCatalogAsset } from "@workspace/api-zod";

// One tenant-scoped projection for BOTH the Master website and its widget.
// Operational admission remains separate: displaying configured controls does
// not enable quotes/orders for a paused, unactivated or preview-only tenant.
export async function publicExchangeConfiguration(client: DatabaseClient, tenantId: string, e: EffectiveEntitlements) {
  const { configuration: s, catalog } = await readExchange(client, tenantId);
  const legacy = await client.query("SELECT exchange_enabled FROM tenant_configuration WHERE tenant_id=$1", [tenantId]);
  return projectPublicExchangeConfiguration(s, catalog, e, legacy.rows[0]?.exchange_enabled === true);
}

export function projectPublicExchangeConfiguration(s: ExchangeSettings, catalog: ExchangeCatalogAsset[], e: Pick<EffectiveEntitlements, "features" | "overLimit">, legacyEnabled: boolean) {
  const enabled = s.enabled && legacyEnabled && !e.overLimit;
  const assets = catalog.flatMap(c => {
    const a = s.assets.find(a => a.assetId === c.assetId && a.enabled);
    const n = s.networks.find(n => n.assetNetworkId === c.assetNetworkId && n.enabled && n.available);
    return a && n ? [{ assetNetworkId: c.assetNetworkId, assetId: c.assetId, symbol: a.symbol, name: c.name, networkId: c.networkId, networkName: c.networkName, testnet: c.testnet, logoUrl: a.logoUrl, decimals: a.decimals }] : [];
  }).sort((a, b) => (s.assets.find(x => x.assetId === a.assetId)?.displayOrder ?? 0) - (s.assets.find(x => x.assetId === b.assetId)?.displayOrder ?? 0));
  const actions = ACTIONS.filter(a => s.actions[a] && e.features[a]);
  const endpointEnabled = (id: string) => id === `fiat:${s.fiatCurrency}` || catalog.some(c => c.assetNetworkId === id && assets.some(a => a.assetId === c.assetId && a.networkId === c.networkId));
  return {
    enabled, defaultAction: s.defaultAction, actions, assets,
    routes: s.routes.filter(r => r.enabled && actions.includes(r.action) && endpointEnabled(r.source) && endpointEnabled(r.destination)),
    // Never expose administrator-only reserve metadata.
    paymentMethods: s.paymentMethods.filter(m => m.enabled).map(({ reserve: _reserve, ...method }) => method),
    fiatCurrency: s.fiatCurrency, publicNote: s.publicNote,
  };
}

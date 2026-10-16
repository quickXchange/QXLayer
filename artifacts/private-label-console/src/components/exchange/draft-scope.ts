import type { ExchangeSettings, ExchangeCatalogAsset } from '@workspace/api-client-react';

/** Reapply saved tenant scope without changing settings on retained records. */
export function reconcileExchangeScope(d: ExchangeSettings, catalog: ExchangeCatalogAsset[]): ExchangeSettings {
  const assetIds = new Set(catalog.map(c => c.assetId));
  const netIds = new Set(catalog.map(c => c.assetNetworkId));
  const assets = d.assets.filter(a => assetIds.has(a.assetId));
  catalog.forEach(c => {
    if (!assets.some(a => a.assetId === c.assetId)) assets.push({ assetId: c.assetId, enabled: false, displayOrder: assets.length, symbol: c.symbol, decimals: 8, logoUrl: null, sandboxPlanRate: '0' });
  });
  const networks = d.networks.filter(n => netIds.has(n.assetNetworkId));
  catalog.forEach(c => {
    if (!networks.some(n => n.assetNetworkId === c.assetNetworkId)) networks.push({ assetNetworkId: c.assetNetworkId, enabled: false, available: false, minimum: '0', maximum: '0', fee: '0', information: '' });
  });
  const routes = d.routes.filter(r => (r.source.startsWith('fiat:') || netIds.has(r.source)) && (r.destination.startsWith('fiat:') || netIds.has(r.destination)));
  const pricingRules = d.pricingRules?.filter(r => (r.source === '*' || r.source.startsWith('fiat:') || netIds.has(r.source)) && (r.destination === '*' || r.destination.startsWith('fiat:') || netIds.has(r.destination)));
  const wallets = d.wallets?.filter(w => netIds.has(w.assetNetworkId));
  const unchanged = <T,>(a: T[], b: T[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  return unchanged(assets, d.assets) && unchanged(networks, d.networks) && unchanged(routes, d.routes) &&
    (!d.pricingRules || unchanged(pricingRules!, d.pricingRules)) &&
    (!d.wallets || unchanged(wallets!, d.wallets)) ? d : { ...d, assets, networks, routes, ...(pricingRules ? { pricingRules } : {}), ...(wallets ? { wallets } : {}) };
}

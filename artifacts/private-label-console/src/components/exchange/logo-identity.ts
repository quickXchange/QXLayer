import type { ExchangeVisualAsset, ExchangeSettings, ExchangeCatalogAsset, ExchangePaymentMethod } from '@workspace/api-client-react';
import { useVisualCatalog } from './visual-catalog';
import { findVisual, normalizeIdentity as normalize, type LogoKind } from './logo-matching';
export { findVisual, type LogoKind } from './logo-matching';
export type Identity = {
  label: string; name: string; logoUrl: string | null; kind: LogoKind; generic?: 'bank' | 'card';
  network?: string; networkLogoUrl?: string | null; currencyLogoUrl?: string | null; currencyFlagName?: string | null;
};
export function createIdentityResolver(visuals: ExchangeVisualAsset[], configuration?: ExchangeSettings | null, catalog: ExchangeCatalogAsset[] = []) {
  const payment = (input: string | ExchangePaymentMethod | null | undefined): Identity => {
    const configured = typeof input === 'string'
      ? configuration?.paymentMethods.find(p => p.id === input) ??
        configuration?.paymentMethods.find(p => normalize(p.label) === normalize(input))
      : input;
    const label = configured?.label || (typeof input === 'string' ? input : '') || 'Payment method';
    const art = findVisual(visuals, 'payment-method', configured?.id ?? '') ?? findVisual(visuals, 'payment-method', label);
    const generic = !configured?.logoUrl && !art
      ? /\bcard\b/i.test(label) ? 'card' : /\bbank\b|\btransfer\b/i.test(label) ? 'bank' : undefined
      : undefined;
    return { label, name: label, logoUrl: configured?.logoUrl || art?.logoUrl || null, kind: 'payment-method', generic };
  };
  const asset = (assetId: string, symbol?: string): Identity => {
    const saved = configuration?.assets.find(a => a.assetId === assetId);
    const c = catalog.find(c => c.assetId === assetId);
    const art = findVisual(visuals, 'crypto', assetId) ?? findVisual(visuals, 'crypto', symbol || saved?.symbol || c?.symbol || '');
    const label = symbol || saved?.symbol || c?.symbol || art?.code || assetId;
    return { label, name: c?.name || art?.name || label, logoUrl: saved?.logoUrl || art?.logoUrl || null, kind: 'crypto' };
  };
  const network = (assetNetworkId: string): Identity => {
    const c = catalog.find(c => c.assetNetworkId === assetNetworkId);
    const art = findVisual(visuals, 'network', c?.networkId || assetNetworkId) ??
      findVisual(visuals, 'network', c?.networkName || assetNetworkId);
    const label = c?.networkName || art?.name || assetNetworkId;
    return { label, name: label, logoUrl: art?.logoUrl || null, kind: 'network' };
  };
  const endpoint = (id: string, symbol?: string, method?: string | null): Identity => {
    if (id.startsWith('fiat:')) {
      const code = id.slice(5);
      const currency = findVisual(visuals, 'currency', code);
      const flag = visuals.find(v => v.kind === 'flag' && v.logoUrl === currency?.logoUrl && v.currencies.includes(code));
      const pm = method ? payment(method) : null;
      return { label: symbol || code, name: pm?.name || currency?.name || code,
        logoUrl: pm ? pm.logoUrl : currency?.logoUrl || null, kind: pm ? 'payment-method' : 'currency',
        generic: pm?.generic, currencyLogoUrl: currency?.logoUrl || null, currencyFlagName: flag?.name || null };
    }
    const c = catalog.find(c => c.assetNetworkId === id);
    const a = asset(c?.assetId || id, symbol || c?.symbol);
    const n = network(id);
    return { ...a, network: n.name, networkLogoUrl: n.logoUrl };
  };
  return { payment, asset, network, endpoint, visuals };
}

export function useIdentityResolver(configuration?: ExchangeSettings | null, catalog?: ExchangeCatalogAsset[]) {
  const q = useVisualCatalog();
  return createIdentityResolver(q.data?.assets ?? [], configuration, catalog);
}

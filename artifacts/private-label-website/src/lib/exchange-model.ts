import type { AssetNetwork, ExchangePaymentMethod, ExchangeRoute, PublicExchange } from '@workspace/api-client-react';
import type { ExchangeTab } from './capabilities';

export const AMOUNT = /^\d{0,12}(\.\d{0,18})?$/;
export const isTab = (a: string): a is ExchangeTab => a === 'swap' || a === 'convert';
export const assetKey = (a: AssetNetwork) => `${a.assetId}:${a.networkId}`;

/** One selectable side of an exchange: a crypto asset on a network, or a fiat payment method in a currency. */
export interface Option {
  key: string;
  kind: 'crypto' | 'fiat';
  /** Route endpoint: assetNetworkId or `fiat:CUR`. */
  endpoint: string;
  symbol: string;
  title: string;
  subtitle: string;
  logoUrl?: string | null;
  asset?: AssetNetwork;
  method?: ExchangePaymentMethod;
  currency?: string;
}
export interface Pair { from: Option; to: Option; route: ExchangeRoute }

const cryptoOption = (a: AssetNetwork): Option => ({ key: `c:${assetKey(a)}`, kind: 'crypto', endpoint: a.assetNetworkId ?? '', symbol: a.symbol, title: a.symbol, subtitle: `${a.name} on ${a.networkName}${a.testnet ? ' testnet' : ''}`, logoUrl: a.logoUrl, asset: a });
const fiatOption = (m: ExchangePaymentMethod, currency: string): Option => ({ key: `f:${currency}:${m.id}`, kind: 'fiat', endpoint: `fiat:${currency}`, symbol: currency, title: m.label, subtitle: currency, logoUrl: m.logoUrl, method: m, currency });

export function methodCurrencies(m: ExchangePaymentMethod): string[] {
  return [...new Set([m.currency, ...(m.currencies ?? [])].filter(Boolean))];
}

/** Every compatible, enabled route expanded to concrete option pairs. */
export function buildPairs(cfg: PublicExchange | undefined, action: ExchangeTab): Pair[] {
  if (!cfg) return [];
  const assets = new Map(cfg.assets.filter((a) => a.assetNetworkId).map((a) => [a.assetNetworkId as string, a]));
  const methods = new Map(cfg.paymentMethods.filter((m) => m.enabled).map((m) => [m.id, m]));
  const out: Pair[] = [];
  const expand = (endpoint: string, route: ExchangeRoute): Option[] => {
    if (endpoint.startsWith('fiat:')) {
      const cur = endpoint.slice(5);
      return route.paymentMethodIds.flatMap((id) => { const m = methods.get(id); return m && methodCurrencies(m).includes(cur) ? [fiatOption(m, cur)] : []; });
    }
    const a = assets.get(endpoint);
    return a ? [cryptoOption(a)] : [];
  };
  for (const r of cfg.routes) {
    if (!r.enabled || r.action !== action) continue;
    const froms = expand(r.source, r), tos = expand(r.destination, r);
    for (const from of froms) for (const to of tos) {
      if (action === 'swap' && from.kind === to.kind) continue;
      if (action === 'convert' && (from.kind !== 'crypto' || to.kind !== 'crypto' || from.key === to.key)) continue;
      out.push({ from, to, route: r });
    }
  }
  return out;
}

export const uniqueOptions = (list: Option[]) => [...new Map(list.map((o) => [o.key, o])).values()];

export const money = (v: string | undefined, sym: string | undefined) => (v ? `${v} ${sym ?? ''}`.trim() : 'Unavailable');
export const pricingLabel = (s?: string) => (s ? s.replace(':manual_fallback', ' (manual fallback)').replace(/[_:]/g, ' ') : undefined);
export const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : '');
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import type { PublicSite } from '@workspace/api-client-react';

export type ExchangeTab = 'swap' | 'convert' | 'buy' | 'sell';
export const TAB_ORDER: ExchangeTab[] = ['swap', 'convert', 'buy', 'sell'];
export interface Caps {
  exchange: 'off' | 'empty' | 'on';
  exchangeKey: string | null;
  tabs: ExchangeTab[];
  payments: boolean; bot: boolean; mini: boolean; api: boolean; keys: boolean; webhooks: boolean;
  services: number;
  assets: number; networks: number;
  faq: { question: string; answer: string }[];
  enabled: string[];
}
export function resolveCaps(site: PublicSite): Caps {
  const enabled = Object.entries(site.features).filter(([, v]) => v === true).map(([k]) => k);
  const on = (k: string) => site.features[k] === true;
  const exchangeKey = on('crypto_exchange') ? 'crypto_exchange' : null;
  const tabs = exchangeKey ? TAB_ORDER.filter(on) : [];
  const payments = on('crypto_payments');
  const bot = on('telegram_bot');
  const mini = on('telegram_mini_app');
  const api = on('merchant_api');
  const keys = on('api_keys');
  const webhooks = on('webhooks');
  const exchange = !exchangeKey ? 'off' : tabs.length ? 'on' : 'empty';
  return {
    exchange, exchangeKey, tabs, payments, bot, mini, api, keys, webhooks,
    services: [!!exchangeKey, payments, bot, mini, api].filter(Boolean).length,
    assets: new Set(site.assets.map((a) => a.assetId)).size,
    networks: new Set(site.assets.map((a) => a.networkId)).size,
    faq: (site.websiteSettings.faq ?? []).filter((f) => f.question.trim() && f.answer.trim()),
    enabled,
  };
}
export interface NavItem { id: string; label: string }
export function navItems(site: PublicSite, c: Caps): NavItem[] {
  const n: NavItem[] = [];
  if (c.exchange !== 'off') n.push({ id: 'exchange', label: 'Exchange' });
  if (c.payments) n.push({ id: 'payments', label: 'Payments' });
  if (c.services > 0) n.push({ id: 'how', label: 'How it works' });
  if (c.api) n.push({ id: 'developers', label: 'Developers' });
  n.push({ id: 'about', label: 'About' });
  if (c.faq.length) n.push({ id: 'faq', label: 'FAQ' });
  void site;
  return n;
}
export function primaryCta(c: Caps): NavItem {
  if (c.exchange !== 'off') return { id: 'exchange', label: 'Open exchange' };
  if (c.payments) return { id: 'payments', label: 'Explore payments' };
  if (c.api) return { id: 'developers', label: 'View developer tools' };
  return { id: 'about', label: 'Learn more' };
}

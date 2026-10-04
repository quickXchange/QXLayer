import type { ReactNode } from 'react';
import { ShowcaseFrame } from './showcase-frame';
import { fintechScenes } from './showcase-fintech';
import { phoneScenes } from './showcase-phones';
import { infraScenes } from './showcase-infra';

export const scenes: Record<string, () => ReactNode> = { ...fintechScenes, ...phoneScenes, ...infraScenes };
const brands: Record<string, string> = {
  crypto_exchange: 'Exchange', crypto_payments: 'Pay', crypto_card: 'Card',
  ios_app: 'iOS', android_app: 'Android', crypto_engine: 'Engine',
  staking: 'Staking', earn: 'Earn', dex: 'DEX', telegram_bot: 'Telegram',
  telegram_mini_app: 'Mini App', whatsapp_bot: 'WhatsApp', rpc_nodes: 'Nodes',
  cloud_mining: 'Mining', articles: 'Content', kolo: 'Kolo',
};

export function ShowcaseScene({ productKey, label }: { productKey: string; label: string }) {
  const s = scenes[productKey] ?? scenes.crypto_engine;
  const teal = ['crypto_payments', 'whatsapp_bot', 'rpc_nodes', 'staking', 'dex', 'articles'].includes(productKey);
  return <ShowcaseFrame label={label} brandLabel={brands[productKey]} accent={teal ? 'var(--s-accent)' : 'var(--s-primary)'}>{s()}</ShowcaseFrame>;
}
export const SHOWCASE_KEYS = Object.keys(scenes);

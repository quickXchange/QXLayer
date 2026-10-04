import type { Plan, EntitlementDefinition } from '@workspace/api-client-react';
import { cash, toCents, limitText, periodPrice, type PricedAddon } from '@/lib/wl';

export function Entitlements({ items, defs }: { items: { key: string; value: boolean | string }[]; defs: EntitlementDefinition[] }) {
  const shown = items.filter((e) => e.value !== false && e.value !== '' && e.value !== '0');
  if (!shown.length) return null;
  return <ul className="mt-2 grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">{shown.map((e) => { const d = defs.find((x) => x.key === e.key); return <li key={e.key}>{d?.label ?? e.key}{e.value === true ? '' : `: ${limitText(e.value)}`}</li>; })}</ul>;
}

export function PriceLine({ x, period }: { x: Plan | PricedAddon; period: string }) {
  const p = x as PricedAddon & { setupFee?: string | null };
  const rec = periodPrice(p, period);
  return <p className="font-mono text-xs uppercase tracking-wide text-copper">{rec == null ? 'Requires review' : `${cash(rec, p.currency)} / ${period === 'yearly' ? 'year' : 'month'}`}{p.setupFee == null ? ' + setup: requires review' : toCents(p.setupFee) > 0n ? ` + ${cash(p.setupFee, p.currency)} setup` : ''}</p>;
}

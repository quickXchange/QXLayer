import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useGlobalCatalog } from '@/hooks/use-global-catalog';
import { ErrorState, ListSkeleton } from '@/components/app/bits';
import { ExSection as Section } from './manage';
import { DraftFooter, Field, Pick, SimNote } from './ui';
import { fiatCodes, planRates, type ExchangeDraft } from './use-exchange-draft';

/** Single editor for offered fiat currencies; Settings links here instead of duplicating it. */
export function CurrenciesPanel({ d, locked, root }: { d: ExchangeDraft; locked: boolean; root: string }) {
  const s = d.draft!; const gc = useGlobalCatalog(); const [q, setQ] = useState('');
  const entries = (gc.data?.entries ?? []).filter((e) => e.kind === 'currencies' && e.status === 'enabled');
  const selected = fiatCodes(s);
  const known = new Set(entries.map((e) => e.code));
  const rows = [...entries.map((e) => ({ code: e.code, name: e.name })), ...selected.filter((c) => !known.has(c)).map((c) => ({ code: c, name: 'Not in global catalog' }))]
    .filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const prec = (s.fiatPrecisions ?? {}) as Record<string, number | undefined>;
  const rates = planRates(s);
  /** Why a currency cannot be removed; null when safe. */
  const blocker = (c: string): string | null => {
    if (c === s.fiatCurrency) return 'Primary currency';
    if (s.routes.some((r) => r.enabled && (r.source === `fiat:${c}` || r.destination === `fiat:${c}`))) return 'Used by an enabled route';
    if (s.paymentMethods.some((p) => p.enabled && p.currency === c && !(p.currencies ?? []).some((x) => x !== c && selected.includes(x)))) return 'Only served by an enabled payment method';
    return null;
  };
  const apply = (next: string[]) => { const u = [...new Set(next)]; if (u.length === 0) return; d.patch({ fiatCurrencies: u, fiatCurrency: u.includes(s.fiatCurrency) ? s.fiatCurrency : u[0] }); };
  const toggle = (c: string, on: boolean) => apply(on ? [...selected, c] : selected.filter((x) => x !== c));
  const selectAll = () => apply([...selected, ...rows.map((r) => r.code)]);
  const clearSafe = () => apply(selected.filter((c) => !rows.some((r) => r.code === c) || blocker(c) !== null));
  return (
    <Section n="X8" title="Currencies" note="Fiat currencies this exchange offers, from the global catalog. Selecting a currency never creates a route or enables a payment method." footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      {gc.isLoading ? <ListSkeleton rows={4} /> : gc.isError ? <ErrorState what="the currency catalog" onRetry={() => gc.refetch()} /> : (
        <div className="space-y-3" data-testid="section-currencies">
          <Field label="Primary fiat currency (must be offered)"><div className="w-48"><Pick bounded testid="select-fiat" disabled={locked} value={s.fiatCurrency} onChange={(v) => d.patch({ fiatCurrency: v })} options={selected.map((c): [string, string] => [c, c])} /></div></Field>
          <div className="flex flex-wrap items-center gap-2">
            <Input data-testid="input-currency-search" className="w-full sm:w-64" placeholder="Search code or name" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button type="button" size="sm" variant="outline" disabled={locked || rows.length === 0} data-testid="button-currencies-select-all" onClick={selectAll}>Select all shown</Button>
            <Button type="button" size="sm" variant="outline" disabled={locked} data-testid="button-currencies-clear" onClick={clearSafe}>Clear removable shown</Button>
            <span className="ml-auto font-mono text-xs text-muted-foreground" data-testid="text-currency-count">{selected.length} offered, primary {s.fiatCurrency}</span>
          </div>
          <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead><tr className="border-b text-left font-mono text-[10px] uppercase text-muted-foreground"><th className="p-2">Offer</th><th className="p-2">Currency</th><th className="p-2">Precision</th><th className="p-2">Plan rate</th><th className="p-2">Status</th></tr></thead>
            <tbody>{rows.map((r) => { const on = selected.includes(r.code); const b = on ? blocker(r.code) : null; return (
              <tr key={r.code} className="border-b last:border-0" data-testid={`row-currency-${r.code}`}>
                <td className="p-2"><Checkbox data-testid={`check-currency-${r.code}`} disabled={locked || (on && b !== null)} checked={on} onCheckedChange={(v) => toggle(r.code, v === true)} aria-label={`Offer ${r.code}`} /></td>
                <td className="p-2"><span className="font-mono text-xs">{r.code}</span> <span className="text-muted-foreground">{r.name}</span></td>
                <td className="p-2 font-mono text-xs">{prec[r.code] ?? 'n/a'}</td>
                <td className="p-2 font-mono text-xs">{r.code === s.fiatCurrency ? s.fiatPlanRate : rates[r.code] || 'not set'}</td>
                <td className="p-2 text-xs text-muted-foreground">{b ?? (on ? 'Offered' : 'Not offered')}</td>
              </tr>); })}</tbody></table>
            {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground" data-testid="text-no-currency-match">No currency matches the search.</p>}</div>
          <p className="text-xs text-muted-foreground">Plan reference rates are edited under <Link href={`${root}/pricing`} className="text-copper hover:underline">Pricing Rules</Link>. Changes are staged until you save.</p>
        </div>)}
    </Section>
  );
}

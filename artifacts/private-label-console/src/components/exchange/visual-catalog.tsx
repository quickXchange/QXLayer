import { useEffect, useMemo, useState } from 'react';
import { useGetExchangeVisualCatalog, getGetExchangeVisualCatalogQueryKey, type ExchangeVisualAsset } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/app/sections';
import { ErrorState } from '@/components/app/bits';
import { Pick } from './ui';

export const VISUAL_URL = /^\/api\/exchange\/visual-assets\/[a-f0-9]{64}\.(svg|png|webp|jpg|jpeg)$/;
export const isAllowedLogo = (u: string) => {
  if (VISUAL_URL.test(u)) return true;
  try { const url = new URL(u); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
};

export function useVisualCatalog() {
  return useGetExchangeVisualCatalog({ query: { queryKey: getGetExchangeVisualCatalogQueryKey(), staleTime: 5 * 60_000 } });
}

export function VisualImg({ url, label, size = 28 }: { url?: string | null; label: string; size?: number }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [url]);
  const st = { width: size, height: size };
  return url && !bad
    ? <img src={url} alt="" loading="lazy" decoding="async" style={st} className="shrink-0 rounded-full bg-muted object-contain" onError={() => setBad(true)} />
    : <span style={st} className="grid shrink-0 place-items-center rounded-full bg-muted font-mono text-[10px]">{label.slice(0, 3).toUpperCase()}</span>;
}

const KINDS: [string, string][] = [['all', 'All categories'], ['crypto', 'Crypto'], ['network', 'Networks'], ['payment-method', 'Payment methods'], ['flag', 'Flags'], ['currency', 'Currencies']];

export function VisualCatalogBrowser() {
  const q = useVisualCatalog();
  const [s, setS] = useState(''); const [k, setK] = useState('all');
  const data = q.data;
  const rows = useMemo(() => (data?.assets ?? []).filter((a) => (k === 'all' || a.kind === k) && `${a.code} ${a.name}`.toLowerCase().includes(s.trim().toLowerCase())), [data, s, k]);
  const un = (data?.unavailable ?? []).filter((u) => k === 'all' || u.type === k);
  return (
    <Section n="X0" title="Visual catalog" note="Browse supplied logos and artwork. Catalog-only reference: nothing here adds or enables assets, networks or routes." footer={null}>
      {q.isLoading ? <p className="text-sm text-muted-foreground" data-testid="text-visual-loading">Loading visual catalog</p> : q.isError || !data ? (
        <div data-testid="visual-catalog-error"><ErrorState what="the visual catalog" onRetry={() => q.refetch()} /></div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input data-testid="input-visual-search" className="w-full sm:w-64" placeholder="Search code or name" value={s} onChange={(e) => setS(e.target.value)} />
            <div className="w-44"><Pick testid="select-visual-kind" value={k} onChange={setK} options={KINDS} /></div>
            <span className="font-mono text-[10px] uppercase text-copper">catalog only</span>
            <span className="font-mono text-xs text-muted-foreground">{rows.length} of {data.assets.length}</span>
          </div>
          {rows.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No visuals match.</p> : (
            <ul className="grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3" data-testid="list-visual-assets">
              {rows.map((a) => (
                <li key={`${a.kind}:${a.code}`} className="flex items-start gap-3 rounded-md border bg-card p-3" data-testid={`visual-${a.kind}-${a.code}`}>
                  <VisualImg url={a.logoUrl} label={a.code} size={36} />
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a.code} · {a.kind}</p>
                    {a.recordId && <p className="font-mono text-[10px] text-muted-foreground">linked: {a.recordId}</p>}
                    {a.currencies.length > 0 && <p className="text-[10px] text-muted-foreground">Currencies: {a.currencies.join(', ')}</p>}
                    {a.alternatives.length > 0 && <div className="mt-1 flex flex-wrap gap-1" title="Variants">{a.alternatives.map((u) => <VisualImg key={u} url={u} label={a.code} size={20} />)}</div>}
                  </div>
                </li>))}
            </ul>)}
          {un.length > 0 && (
            <div className="rounded-md border border-dashed p-3 text-xs" data-testid="list-visual-unavailable">
              <p className="font-medium">Unavailable ({un.length})</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">{un.map((u) => <li key={`${u.type}:${u.code}`}><span className="font-mono">{u.code}</span> {u.name} ({u.type}): {u.reason}</li>)}</ul>
            </div>)}
        </div>)}
    </Section>
  );
}

/** Choose a supplied primary/variant logo. Stages via onPick; never typed. */
export function LogoChooser({ kind, hint, current, onPick, disabled }: { kind: 'crypto' | 'payment-method'; hint: string; current?: string | null; onPick: (url: string) => void; disabled?: boolean }) {
  const q = useVisualCatalog();
  const [s, setS] = useState('');
  const hl = hint.trim().toLowerCase();
  const list: ExchangeVisualAsset[] = (q.data?.assets ?? []).filter((a) => a.kind === kind && (s ? `${a.code} ${a.name}`.toLowerCase().includes(s.toLowerCase()) : true));
  const top = s ? list : [...list.filter((a) => hl && (a.code.toLowerCase() === hl || a.name.toLowerCase() === hl)), ...list.filter((a) => !(hl && (a.code.toLowerCase() === hl || a.name.toLowerCase() === hl)))];
  return (
    <div className="space-y-2" data-testid="logo-chooser">
      {q.isError ? <p className="text-xs text-destructive">Visual catalog unavailable. <button type="button" className="underline" onClick={() => q.refetch()}>Retry</button></p> : q.isLoading ? <p className="text-xs text-muted-foreground">Loading logos</p> : (
        <>
          <Input placeholder="Search supplied logos" value={s} onChange={(e) => setS(e.target.value)} data-testid="input-logo-search" />
          <div className="grid max-h-56 gap-1 overflow-y-auto">
            {top.slice(0, 40).map((a) => [a.logoUrl, ...a.alternatives].map((u, i) => (
              <Button key={`${a.code}-${u}`} type="button" variant={current === u ? 'default' : 'outline'} size="sm" disabled={disabled} className="h-auto justify-start gap-2 py-1" data-testid={`button-logo-${a.code}-${i}`} onClick={() => onPick(u)}>
                <VisualImg url={u} label={a.code} size={22} /><span className="truncate">{a.name}</span><span className="font-mono text-[10px] opacity-70">{i === 0 ? 'primary' : `variant ${i}`}</span>
              </Button>)))}
            {top.length === 0 && <p className="text-xs text-muted-foreground">No supplied logos match.</p>}
          </div>
        </>)}
    </div>
  );
}

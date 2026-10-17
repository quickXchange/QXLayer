import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ExSection as Section } from './manage';
import { SubscriptionSections } from '@/components/app/subscription';
import { Checkbox } from '@/components/ui/checkbox';
import { useGlobalCatalog } from '@/hooks/use-global-catalog';
import { fiatCodes, methodServes } from './use-exchange-draft';
import type { ExchangeSettings } from '@workspace/api-client-react';
import { DraftFooter, Field, Pick, SimNote } from './ui';
import type { ExchangeDraft } from './use-exchange-draft';

export function SettingsPanel({ tenantId, d, locked, canManageSub, features }: { tenantId: string; d: ExchangeDraft; locked: boolean; canManageSub: boolean; features: Record<string, boolean> }) {
  const s = d.draft!;
  const acts = ['swap', 'convert'] as const;
  const gc = useGlobalCatalog();
  const globalFiat = (gc.data?.entries ?? []).filter((e) => e.kind === 'currencies' && e.status === 'enabled').map((e) => [e.code, `${e.code} ${e.name}`] as [string, string]);
  const known = new Set(globalFiat.map(([c]) => c));
  const fiatOptions: [string, string][] = [...globalFiat, ...fiatCodes(s).filter((c) => !known.has(c)).map((c) => [c, `${c} (not in global catalog)`] as [string, string])];
  const selected = fiatCodes(s);
  const label = (id: string) => { if (id.startsWith('fiat:')) return id.slice(5); const c = d.catalog.find((x) => x.assetNetworkId === id); return c ? `${c.symbol} on ${c.networkName}` : id; };
  const pairKey = (p?: { source: string; destination: string }) => (p ? `${p.source}>${p.destination}` : 'none');
  const routesOf = (a: 'swap' | 'convert') => s.routes.filter((r) => r.action === a && r.enabled);
  const setPair = (a: 'swap' | 'convert', key: string, pm?: string) => { const dp = { ...(s.defaultPairs ?? {}) }; if (key === 'none') delete dp[a]; else { const [source, destination] = key.split('>'); dp[a] = a === 'swap' && pm ? { source, destination, paymentMethodId: pm } : { source, destination }; } d.patch({ defaultPairs: dp }); };
  const toggleFiat = (c: string, on: boolean) => { const next = on ? [...new Set([...selected, c])] : selected.filter((x) => x !== c); if (next.length === 0) return; d.patch({ fiatCurrencies: next, fiatCurrency: next.includes(s.fiatCurrency) ? s.fiatCurrency : next[0] }); };
  const swapPair = s.defaultPairs?.swap;
  const swapFiat = swapPair ? [swapPair.source, swapPair.destination].find((e) => e.startsWith('fiat:'))?.slice(5) : undefined;
  const swapMethods = swapFiat ? s.paymentMethods.filter((p) => p.enabled && methodServes(p, swapFiat)) : [];
  return (
    <div className="space-y-6">
      <details className="min-w-0 rounded-md border bg-card" data-testid="details-exchange-plan">
        <summary className="cursor-pointer px-5 py-4 font-display text-lg">Subscription, features &amp; limits</summary>
        <div className="min-w-0 space-y-4 border-t p-4"><SubscriptionSections tenantId={tenantId} canManage={canManageSub} /></div>
      </details>
      <Section n="X6" title="Exchange settings" note="Pause or enable this tenant's exchange sandbox and choose which actions it offers." footer={<DraftFooter d={d} locked={locked} />}>
        <SimNote />
        <fieldset disabled={locked} className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><p className="text-sm font-medium">Exchange {s.enabled ? 'enabled' : 'paused'}</p><p className="text-xs text-muted-foreground" data-testid="text-effective">Effective state: {d.effectiveEnabled ? 'live in sandbox' : 'not serving'}. The plan and subscription also gate the exchange.</p></div>
            <Switch data-testid="switch-exchange-enabled" disabled={locked} checked={s.enabled} onCheckedChange={(v) => d.patch({ enabled: v })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {acts.map((a) => (
              <div key={a} className="flex items-center justify-between rounded-md border p-3"><span className="text-sm capitalize">{a}{!features[a] && <span className="ml-2 text-xs text-muted-foreground">Not entitled</span>}</span>
                <Switch data-testid={`switch-action-${a}`} disabled={locked || (!features[a] && !s.actions[a])} checked={s.actions[a]} onCheckedChange={(v) => d.patch({ actions: { ...s.actions, [a]: v, buy: false, sell: false } })} /></div>))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default action"><Pick testid="select-default-action" disabled={locked} value={s.defaultAction} onChange={(v) => d.patch({ defaultAction: v as ExchangeSettings['defaultAction'] })} options={acts.map((a) => [a, a] as [string, string])} /></Field>
            <Field label="Primary fiat currency (ISO 4217)"><Pick testid="select-fiat" bounded disabled={locked} value={s.fiatCurrency} onChange={(v) => d.patch({ fiatCurrency: v, fiatCurrencies: [...new Set([v, ...selected])] })} options={fiatOptions} /></Field>
          </div>
          <Field label={`Offered fiat currencies (${selected.length})`}><div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-4" data-testid="list-fiat-currencies">{fiatOptions.map(([c]) => <label key={c} className="flex items-center gap-2 text-sm"><Checkbox data-testid={`check-fiat-${c}`} checked={selected.includes(c)} onCheckedChange={(v) => toggleFiat(c, v === true)} /><span className="font-mono text-xs">{c}</span></label>)}</div><p className="text-xs text-muted-foreground">Only enabled global currencies are listed. Selecting a currency never creates a route; add Swap routes and linked payment methods separately. Existing routes keep working when you change this list.</p></Field>
          <div className="space-y-3 rounded-md border p-3" data-testid="section-default-pairs">
            <p className="text-sm font-medium">Default widget pairs</p>
            <p className="text-xs text-muted-foreground">Each product has its own default. Only enabled, configured routes are offered.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Swap default (You send to You receive)"><Pick testid="select-default-swap" bounded disabled={locked} value={pairKey(swapPair)} onChange={(v) => { const f = v === 'none' ? undefined : v.split('>').find((x) => x.startsWith('fiat:'))?.slice(5); const pm = f ? s.paymentMethods.find((p) => p.enabled && methodServes(p, f))?.id : undefined; setPair('swap', v, pm); }} options={[['none', 'No default'], ...routesOf('swap').map((r) => [pairKey(r), `${label(r.source)} to ${label(r.destination)}`] as [string, string])]} /></Field>
              <Field label="Swap payment method (required)"><Pick testid="select-default-swap-method" disabled={locked || !swapPair} value={swapPair?.paymentMethodId ?? ''} onChange={(v) => swapPair && setPair('swap', pairKey(swapPair), v)} options={[...(swapMethods.length ? [] : [['', 'No compatible enabled method'] as [string, string]]), ...swapMethods.map((p) => [p.id, p.label || 'Unnamed'] as [string, string])]} /></Field>
              <Field label="Convert default (You send to You receive)"><Pick testid="select-default-convert" bounded disabled={locked} value={pairKey(s.defaultPairs?.convert)} onChange={(v) => setPair('convert', v)} options={[['none', 'No default'], ...routesOf('convert').map((r) => [pairKey(r), `${label(r.source)} to ${label(r.destination)}`] as [string, string])]} /></Field>
            </div>
          </div>
          <Field label={`Public note (${s.publicNote.length}/1000)`}><Textarea data-testid="input-public-note" maxLength={1000} className="min-h-24" value={s.publicNote} onChange={(e) => d.patch({ publicNote: e.target.value })} /></Field>
        </fieldset>
      </Section>
    </div>
  );
}

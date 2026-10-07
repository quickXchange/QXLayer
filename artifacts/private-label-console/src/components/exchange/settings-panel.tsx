import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ExSection as Section } from './manage';
import { SubscriptionSections } from '@/components/app/subscription';
import type { ExchangeSettings } from '@workspace/api-client-react';
import { DraftFooter, Field, Pick, SimNote } from './ui';
import type { ExchangeDraft } from './use-exchange-draft';

export function SettingsPanel({ tenantId, d, locked, canManageSub, features }: { tenantId: string; d: ExchangeDraft; locked: boolean; canManageSub: boolean; features: Record<string, boolean> }) {
  const s = d.draft!;
  const acts = ['swap', 'convert', 'buy', 'sell'] as const;
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
                <Switch data-testid={`switch-action-${a}`} disabled={locked || (!features[a] && !s.actions[a])} checked={s.actions[a]} onCheckedChange={(v) => d.patch({ actions: { ...s.actions, [a]: v } })} /></div>))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default action"><Pick testid="select-default-action" disabled={locked} value={s.defaultAction} onChange={(v) => d.patch({ defaultAction: v as ExchangeSettings['defaultAction'] })} options={acts.map((a) => [a, a] as [string, string])} /></Field>
            <Field label="Fiat currency"><Pick testid="select-fiat" disabled={locked} value={s.fiatCurrency} onChange={(v) => d.patch({ fiatCurrency: v as ExchangeSettings['fiatCurrency'] })} options={[['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP']]} /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Changing fiat currency changes the fiat endpoint of Buy and Sell routes. Re-point those routes and payment methods before saving.</p>
          <Field label={`Public note (${s.publicNote.length}/1000)`}><Textarea data-testid="input-public-note" maxLength={1000} className="min-h-24" value={s.publicNote} onChange={(e) => d.patch({ publicNote: e.target.value })} /></Field>
        </fieldset>
      </Section>
    </div>
  );
}

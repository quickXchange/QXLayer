import { useQueryClient } from '@tanstack/react-query';
import { getGetExchangeConfigurationQueryKey, type Tenant } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Section, AssetsSection } from '@/components/app/sections';
import { Dec, DraftFooter, Field, IntInput, SimNote } from './ui';
import type { ExchangeDraft } from './use-exchange-draft';

export function AssetsPanel({ tenant, d, locked, catalogReadOnly }: { tenant: Tenant; d: ExchangeDraft; locked: boolean; catalogReadOnly: boolean }) {
  const qc = useQueryClient();
  const s = d.draft!;
  const setA = (i: number, p: Partial<typeof s.assets[number]>) => d.patch({ assets: s.assets.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  const nameOf = (id: string) => d.catalog.find((c) => c.assetId === id)?.name ?? id;
  return (
    <div className="space-y-6">
      <AssetsSection tenant={tenant} readOnly={catalogReadOnly} onSaved={() => qc.invalidateQueries({ queryKey: getGetExchangeConfigurationQueryKey(tenant.id) })} />
      <Section n="X1" title="Asset details" note="Display and sandbox reference data for each tenant-selected asset. Only enabled assets can quote." footer={<DraftFooter d={d} locked={locked} />}>
        <SimNote />
        {s.assets.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-assets">No assets are selected for this tenant. Select sandbox assets and networks above.</p>}
        <div className="divide-y rounded-md border">
          {s.assets.map((a, i) => (
            <fieldset key={a.assetId} disabled={locked} className="grid gap-3 p-4 md:grid-cols-6" data-testid={`row-asset-${a.assetId}`}>
              <div className="flex items-center gap-3 md:col-span-6">
                {a.logoUrl ? <img src={a.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-muted font-mono text-[10px]">{a.symbol.slice(0, 3)}</span>}
                <div className="flex-1"><p className="text-sm font-medium">{nameOf(a.assetId)}</p><p className="font-mono text-[11px] text-muted-foreground">{a.assetId}</p></div>
                <Switch data-testid={`switch-asset-${a.assetId}`} disabled={locked} checked={a.enabled} onCheckedChange={(v) => setA(i, { enabled: v })} aria-label="Enabled" />
              </div>
              <Field label="Symbol"><Input data-testid={`input-asset-symbol-${a.assetId}`} value={a.symbol} onChange={(e) => setA(i, { symbol: e.target.value })} /></Field>
              <Field label="Display order"><IntInput value={a.displayOrder} onChange={(v) => setA(i, { displayOrder: v })} /></Field>
              <Field label="Precision"><IntInput value={a.decimals} onChange={(v) => setA(i, { decimals: v })} /></Field>
              <Field label={`Plan rate (1 ${a.symbol || 'unit'} in plan currency)`} className="md:col-span-3"><Dec positive testid={`input-asset-rate-${a.assetId}`} value={a.sandboxPlanRate} onChange={(v) => setA(i, { sandboxPlanRate: v })} placeholder="manual reference rate" /></Field>
              <Field label="Logo URL" className="md:col-span-6"><Input placeholder="https://" value={a.logoUrl ?? ''} onChange={(e) => setA(i, { logoUrl: e.target.value.trim() === '' ? null : e.target.value.trim() })} /></Field>
            </fieldset>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function NetworksPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const s = d.draft!;
  const setN = (i: number, p: Partial<typeof s.networks[number]>) => d.patch({ networks: s.networks.map((n, j) => (j === i ? { ...n, ...p } : n)) });
  return (
    <Section n="X2" title="Networks" note="Only networks that are enabled and available can quote. Limits and fee are decimal strings in asset units." footer={<DraftFooter d={d} locked={locked} />}>
      {s.networks.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-networks">No asset networks are selected. Use the Assets section to select them.</p>}
      <div className="divide-y rounded-md border">
        {s.networks.map((n, i) => {
          const c = d.catalog.find((x) => x.assetNetworkId === n.assetNetworkId);
          return (
            <fieldset key={n.assetNetworkId} disabled={locked} className="grid gap-3 p-4 md:grid-cols-3" data-testid={`row-network-${n.assetNetworkId}`}>
              <div className="flex flex-wrap items-center gap-4 md:col-span-3">
                <div className="flex-1"><p className="text-sm font-medium">{c?.symbol} on {c?.networkName}{c?.testnet && <span className="ml-2 font-mono text-[10px] uppercase text-copper">testnet</span>}</p><p className="font-mono text-[11px] text-muted-foreground">{n.assetNetworkId}</p></div>
                <label className="flex items-center gap-2 text-sm"><Switch disabled={locked} checked={n.enabled} onCheckedChange={(v) => setN(i, { enabled: v })} data-testid={`switch-network-enabled-${n.assetNetworkId}`} />Enabled</label>
                <label className="flex items-center gap-2 text-sm"><Switch disabled={locked} checked={n.available} onCheckedChange={(v) => setN(i, { available: v })} data-testid={`switch-network-available-${n.assetNetworkId}`} />Available</label>
              </div>
              <Field label="Minimum"><Dec value={n.minimum} onChange={(v) => setN(i, { minimum: v })} /></Field>
              <Field label="Maximum"><Dec value={n.maximum} onChange={(v) => setN(i, { maximum: v })} /></Field>
              <Field label="Network fee"><Dec value={n.fee} onChange={(v) => setN(i, { fee: v })} /></Field>
              <Field label="Information" className="md:col-span-3"><Textarea className="min-h-16" value={n.information} onChange={(e) => setN(i, { information: e.target.value })} /></Field>
            </fieldset>
          );
        })}
      </div>
    </Section>
  );
}

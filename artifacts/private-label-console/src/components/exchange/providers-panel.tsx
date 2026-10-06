import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Section } from '@/components/app/sections';
import type { ExchangeProvider, ExchangeProviderConfiguration } from '@workspace/api-client-react';
import { DraftFooter, Field, SimNote } from './ui';
import { VisualImg } from './visual-catalog';
import { EditDrawer, FilterBar, NoMatch, StatusPill } from './bulk';
import { Pick } from './ui';
import { useStaged } from './bulk';
import type { ExchangeDraft } from './use-exchange-draft';

const STATUS: Record<string, string> = { sandbox: 'Sandbox only', configuration_only: 'Configuration only', coming_soon: 'Coming soon' };

export function ProvidersPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const staged = useStaged();
  const s = d.draft!;
  const [q, setQ] = useState(''); const [ty, setTy] = useState('all'); const [stf, setStf] = useState('all');
  const all = d.providerCatalog;
  const types = [...new Set(all.map((p) => p.category))];
  const cat = all.filter((p) => (ty === 'all' || p.category === ty) && (stf === 'all' || p.status === stf) && `${p.name} ${p.capabilities.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()));
  const resetF = () => { setQ(''); setTy('all'); setStf('all'); };
  const [edit, setEdit] = useState<{ p: ExchangeProvider; c: ExchangeProviderConfiguration } | null>(null);
  const cfgOf = (id: string): ExchangeProviderConfiguration => (s.providers ?? []).find((x) => x.providerId === id) ?? { providerId: id, enabled: false };
  const upsert = (c: ExchangeProviderConfiguration) => { const cur = s.providers ?? []; d.patch({ providers: cur.some((x) => x.providerId === c.providerId) ? cur.map((x) => (x.providerId === c.providerId ? c : x)) : [...cur, c] }); };
  return (
    <Section n="X7" title="Providers / Integrations" note="Provider catalog supplied by the platform. This section stores a label, a public HTTPS endpoint and an enabled flag only." footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      <p className="rounded-md border p-3 text-xs text-muted-foreground" data-testid="text-provider-notice">No API credentials are accepted until a secure real adapter exists. Enabling a provider here is metadata only: it does not connect, quote, or execute anything. Every quote remains manual and sandbox.</p>
      <FilterBar noun="providers" search={q} onSearch={setQ} placeholder="Search provider or capability" shown={cat.length} total={all.length} onReset={resetF} active={q !== '' || ty !== 'all' || stf !== 'all'}>
        <div className="w-44"><Pick testid="select-provider-type" value={ty} onChange={setTy} options={[['all', 'Any type'], ...types.map((t) => [t, t.replace(/_/g, ' ')] as [string, string])]} /></div>
        <div className="w-48"><Pick testid="select-provider-state" value={stf} onChange={setStf} options={[['all', 'Any state'], ...Object.entries(STATUS)]} /></div>
      </FilterBar>
      {all.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-providers">The provider catalog is not available.</p> : cat.length === 0 ? <NoMatch noun="providers" onReset={resetF} /> : (
        <div className="max-w-full min-w-0 overflow-x-auto rounded-md border bg-card"><table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{['Provider', 'Type', 'Status', 'Connection', 'Capabilities', 'Enabled', 'Configure'].map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{cat.map((p) => { const c = cfgOf(p.id); const soon = p.status === 'coming_soon'; return (
            <tr key={p.id} data-testid={`row-provider-${p.id}`}>
              <td className="px-3 py-2"><span className="flex items-center gap-2"><VisualImg label={p.name} kind="provider" size={28} /><span><span className="font-medium">{c.label || p.name}</span>{c.label && <span className="block text-xs text-muted-foreground">{p.name}</span>}</span></span></td>
              <td className="px-3 py-2 text-xs capitalize">{p.category.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2"><StatusPill on={p.functional} onLabel={STATUS[p.status]} offLabel={STATUS[p.status] ?? p.status} /></td>
              <td className="px-3 py-2 text-xs">{p.functional ? 'Sandbox only' : 'Not connected'}</td>
              <td className="px-3 py-2 text-xs">{p.capabilities.join(', ') || 'None'}</td>
              <td className="px-3 py-2"><Switch aria-label="Enabled" data-testid={`switch-provider-${p.id}`} disabled={locked || soon} checked={c.enabled && !soon} onCheckedChange={(v) => { upsert({ ...c, enabled: v }); staged(1, 'provider'); }} /></td>
              <td className="px-3 py-2"><Button size="sm" variant="outline" data-testid={`button-edit-provider-${p.id}`} onClick={() => setEdit({ p, c })}>{soon ? 'View' : 'Configure'}</Button></td></tr>); })}</tbody></table></div>)}
      <EditDrawer item={edit} itemKey={edit?.p.id ?? ''} title={edit?.p.name ?? 'Provider'} note={edit ? `${STATUS[edit.p.status] ?? edit.p.status}. ${edit.p.functional ? '' : 'Not connected.'}` : ''} locked={locked || edit?.p.status === 'coming_soon'} onClose={() => setEdit(null)}
        onApply={(v) => { const c = { ...v.c, label: v.c.label?.trim() || undefined, endpoint: v.c.endpoint?.trim() || null }; upsert(c); staged(1, 'provider'); setEdit(null); }}>
        {(f, set) => (<>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled (metadata only)<Switch checked={f.c.enabled} onCheckedChange={(v) => set({ c: { ...f.c, enabled: v } })} /></div>
          <Field label="Label"><Input maxLength={100} data-testid="input-provider-label" value={f.c.label ?? ''} onChange={(e) => set({ c: { ...f.c, label: e.target.value } })} /></Field>
          <Field label="Public endpoint (HTTPS, no secrets)"><Input data-testid="input-provider-endpoint" placeholder="https://" value={f.c.endpoint ?? ''} onChange={(e) => set({ c: { ...f.c, endpoint: e.target.value } })} /></Field>
          <Field label="API key"><Input disabled placeholder="Not accepted" /></Field>
          <Field label="API secret"><Input disabled placeholder="Not accepted" /></Field>
          <p className="text-xs text-muted-foreground">No credentials accepted until a secure real adapter exists. There is no connection test because no real integration is implemented for this provider.</p>
        </>)}
      </EditDrawer>
    </Section>
  );
}

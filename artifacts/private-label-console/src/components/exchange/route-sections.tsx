import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Section } from '@/components/app/sections';
import { useToast } from '@/hooks/use-toast';
import { Dec, DraftFooter, EndpointView, Field, IntInput, LogoText, Pick, SimNote, isDec, isInt } from './ui';
import { useIdentityResolver } from './logo-identity';
import { BulkBar, BulkBtn, DataTable, FilterBar, NoMatch, EditDrawer, Logo, StatusPill, providerOptions, useConfirm, useSelection, useStaged } from './bulk';
import { LogoChooser, VisualImg, useVisualCatalog } from './visual-catalog';
import { fiatId, type ExchangeDraft } from './use-exchange-draft';
import type { ExchangeRoute, ExchangePaymentMethod } from '@workspace/api-client-react';

const ACTIONS: [string, string][] = [['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy (fiat to crypto)'], ['sell', 'Sell (crypto to fiat)']];

function RouteManager({ d, locked, action, mode }: { d: ExchangeDraft; locked: boolean; action?: ExchangeRoute['action']; mode: 'routes' | 'pricing' }) {
  const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm(locked);
  const s = d.draft!; const fiat = fiatId(s); const idr = useIdentityResolver(s, d.catalog);
  const [q, setQ] = useState(''); const [fa, setFa] = useState('all'); const [fs, setFs] = useState('all');
  const label = (id: string) => (id.startsWith('fiat:') ? id.slice(5) : d.catalog.find((c) => c.assetNetworkId === id)?.symbol ?? id);
  const scoped = s.routes.filter((r) => !action || r.action === action);
  const rows = scoped.filter((r) => (fa === 'all' || r.action === fa) && (fs === 'all' || (fs === 'on') === r.enabled) && `${label(r.source)} ${label(r.destination)} ${r.action}`.toLowerCase().includes(q.trim().toLowerCase()));
  const resetF = () => { setQ(''); setFa('all'); setFs('all'); };
  const sel = useSelection(rows.map((r) => r.id));
  const rname = (id: string) => { const r = s.routes.find((x) => x.id === id); return r ? `${r.action}: ${label(r.source)} to ${label(r.destination)} (${id.slice(0, 8)})` : id; };
  const [edit, setEdit] = useState<ExchangeRoute | null>(null);
  const [bulk, setBulk] = useState<'fees' | 'limits' | 'all' | null>(null);
  const epOpt = (id: string, sym: string, text: string): [string, React.ReactNode] => [id, <LogoText key={id} id={idr.endpoint(id, sym)} text={text} />];
  const endpoints: [string, React.ReactNode][] = [...d.catalog.map((c) => epOpt(c.assetNetworkId, c.symbol, `${c.symbol} on ${c.networkName}`)), epOpt(fiat, s.fiatCurrency, `${s.fiatCurrency} (fiat)`)];
  const sym = (id: string) => label(id);
  const methodChips = (r: ExchangeRoute) => r.paymentMethodIds.length === 0 ? null : <span className="flex flex-wrap gap-1">{r.paymentMethodIds.map((id) => { const p = s.paymentMethods.find((x) => x.id === id); if (!p) return null; const pi = idr.payment(p); return <span key={id} className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]"><VisualImg url={pi.logoUrl} label={pi.label} kind="payment-method" generic={pi.generic} size={14} />{pi.name}</span>; })}</span>;
  const pair = (r: ExchangeRoute) => <span className="flex flex-wrap items-center gap-2"><EndpointView r={idr} id={r.source} symbol={sym(r.source)} size={24} /><span className="text-muted-foreground">to</span><EndpointView r={idr} id={r.destination} symbol={sym(r.destination)} size={24} /></span>;
  const setMany = (ids: string[], p: Partial<ExchangeRoute>) => d.patch({ routes: s.routes.map((r) => (ids.includes(r.id) ? { ...r, ...p } : r)) });
  const pms = s.paymentMethods.filter((p) => p.currency === s.fiatCurrency);
  const add = () => {
    const c0 = d.catalog[0]?.assetNetworkId; const c1 = d.catalog[1]?.assetNetworkId ?? c0; if (!c0) return;
    const a = action ?? 'swap';
    const r: ExchangeRoute = { id: crypto.randomUUID(), source: a === 'buy' ? fiat : c0, destination: a === 'sell' ? fiat : (c1 ?? c0), action: a, enabled: false, rate: '', minimum: '0', maximum: '', fixedFee: '0', feeBps: 0, spreadBps: 0, paymentMethodIds: [] };
    d.patch({ routes: [...s.routes, r] }); setEdit(r);
  };
  const changeAction = (r: ExchangeRoute, a: ExchangeRoute['action']): Partial<ExchangeRoute> => {
    const c0 = d.catalog[0]?.assetNetworkId ?? ''; const c1 = d.catalog[1]?.assetNetworkId ?? c0; const has = (id: string) => d.catalog.some((c) => c.assetNetworkId === id);
    if (a === 'buy') return { action: a, source: fiat, destination: has(r.destination) ? r.destination : c0 };
    if (a === 'sell') return { action: a, destination: fiat, source: has(r.source) ? r.source : c0 };
    return { action: a, source: r.source === fiat ? c0 : r.source, destination: r.destination === fiat ? c1 : r.destination, paymentMethodIds: [] };
  };
  const toggle = (on: boolean) => { const ids = sel.ids; ask({ title: `${on ? 'Enable' : 'Disable'} ${ids.length} route${ids.length === 1 ? '' : 's'}?`, body: <><p>Proposed: {on ? 'enable' : 'disable'} these routes (staged, not saved). Enabling still needs a valid rate, limits and (Buy/Sell) a payment method; validation blocks Save otherwise.</p><ul className="font-mono text-xs">{ids.map((i) => <li key={i}>{rname(i)}</li>)}</ul></>, label: `Stage ${on ? 'enable' : 'disable'}`, run: () => { setMany(ids, { enabled: on }); staged(ids.length, 'route'); sel.clear(); } }); };
  const remove = () => { const ids = sel.ids; ask({ title: `Delete ${ids.length} route${ids.length === 1 ? '' : 's'}?`, destructive: true, body: <><p>Removed from the draft. Customers lose these pairs only after you save. Discard changes restores them.</p><ul className="font-mono text-xs">{ids.map((i) => <li key={i}>{rname(i)}</li>)}</ul></>, label: 'Stage delete', run: () => { d.patch({ routes: s.routes.filter((r) => !ids.includes(r.id)) }); staged(ids.length, 'route deletion'); sel.clear(); } }); };
  const feeText = (r: ExchangeRoute) => `${r.feeBps} bps${r.fixedFee !== '0' ? ` + ${r.fixedFee}` : ''}`;
  const provName = (id?: string) => (id ? d.providerCatalog.find((p) => p.id === id)?.name ?? id : 'Manual / sandbox');
  const applyBulk = (v: Record<string, string>) => {
    const p: Partial<ExchangeRoute> = {};
    for (const k of ['feeBps', 'spreadBps'] as const) if (v[k] !== '') { if (!isInt(Number(v[k]), 5000)) { toast({ title: 'Fee and spread are integer basis points 0 to 5000', variant: 'destructive' }); return; } p[k] = Number(v[k]); }
    for (const k of ['fixedFee', 'minimum', 'maximum'] as const) if (v[k] !== '') { if (!isDec(v[k])) { toast({ title: `${k} must be a decimal string`, variant: 'destructive' }); return; } p[k] = v[k]; }
    if (v.rate !== '' && v.rate !== undefined) { if (!isDec(v.rate) || !/[1-9]/.test(v.rate)) { toast({ title: 'Rate must be a positive decimal', variant: 'destructive' }); return; } p.rate = v.rate; }
    if (Object.keys(p).length === 0) { toast({ title: 'Nothing to change', description: 'Fill at least one field.', variant: 'destructive' }); return; }
    const ids = sel.ids; setBulk(null);
    ask({ title: `Apply to ${ids.length} route${ids.length === 1 ? '' : 's'}?`, body: <><ul className="font-mono text-xs">{Object.entries(p).map(([k, x]) => <li key={k}>{k}: {String(x)}</li>)}</ul><p>Applies to:</p><ul className="font-mono text-xs">{ids.map((i) => <li key={i}>{rname(i)}</li>)}</ul><p>Staged only. Press Save to persist.</p></>, label: 'Stage edit', run: () => { setMany(ids, p); staged(ids.length, 'route'); sel.clear(); } });
  };
  const bf = (f: Record<string, string>, set: (p: Record<string, string>) => void, k: string, l: string, int?: boolean) => <Field label={l}>{int ? <Input inputMode="numeric" data-testid={`input-bulk-${k}`} value={f[k]} onChange={(e) => set({ [k]: e.target.value.trim() })} /> : <Dec testid={`input-bulk-${k}`} value={f[k]} onChange={(v) => set({ [k]: v })} />}</Field>;
  const empty = { feeBps: '', spreadBps: '', fixedFee: '', minimum: '', maximum: '', rate: '' };
  const title = mode === 'pricing' ? 'Pricing & fees' : action ? `Routes: ${action}` : 'Routes';
  return (
    <Section n={mode === 'pricing' ? 'X5' : 'X3'} title={title} note={mode === 'pricing' ? 'Reference rates, service fee, spread, fixed fee and limits per route. Basis points are integers: 100 bps is 1%.' : 'Each route is one directed pair with an explicit manual rate. Nothing is derived or fetched.'} footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      {mode === 'pricing' && <fieldset disabled={locked} className="grid gap-3 md:grid-cols-4"><Field label={`Fiat plan rate (${s.fiatCurrency})`}><Dec positive value={s.fiatPlanRate} onChange={(v) => d.patch({ fiatPlanRate: v })} testid="input-fiat-plan-rate" /></Field></fieldset>}
      {scoped.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-routes">{s.routes.length === 0 ? `No routes yet. ${d.catalog.length === 0 ? 'Select tenant assets first.' : 'Add a route and enter its manual rate.'}` : 'No routes for this action.'}</p> : (
        <>
          <FilterBar noun="routes" search={q} onSearch={setQ} placeholder="Search symbol or action" shown={rows.length} total={scoped.length} onReset={resetF} active={q !== '' || fa !== 'all' || fs !== 'all'}>
            {!action && <div className="w-36"><Pick testid="select-route-action-filter" value={fa} onChange={setFa} options={[['all', 'Any action'], ...ACTIONS]} /></div>}
            <div className="w-36"><Pick testid="select-route-status-filter" value={fs} onChange={setFs} options={[['all', 'Any status'], ['on', 'Enabled'], ['off', 'Disabled']]} /></div>
          </FilterBar>
          <BulkBar sel={sel} noun="routes" locked={locked} testid="routes">
            {mode === 'routes' && <><BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-routes" onClick={() => toggle(true)}>Enable</BulkBtn><BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-routes" onClick={() => toggle(false)}>Disable</BulkBtn></>}
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-fees-routes" onClick={() => setBulk('fees')}>Fee / spread</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-limits-routes" onClick={() => setBulk('limits')}>Limits</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-edit-routes" onClick={() => setBulk('all')}>Bulk edit</BulkBtn>
            {mode === 'routes' && <BulkBtn destructive sel={sel} locked={locked} testid="button-bulk-delete-routes" onClick={remove}>Delete</BulkBtn>}
          </BulkBar>
          {rows.length === 0 ? <NoMatch noun="routes" onReset={resetF} /> : <DataTable testid="route" rows={rows} getId={(r) => r.id} sel={sel} locked={locked} cols={[
            { h: 'Action', cell: (r) => <span className="font-mono text-[10px] uppercase text-copper">{r.action}</span> },
            { h: 'Source', cell: (r) => <EndpointView r={idr} id={r.source} symbol={label(r.source)} size={24} /> },
            { h: 'Target', cell: (r) => <EndpointView r={idr} id={r.destination} symbol={label(r.destination)} size={24} /> },
            { h: 'Methods', cell: (r) => methodChips(r) ?? <span className="text-xs text-muted-foreground">None</span> },
            { h: 'Rate', cell: (r) => <span className="font-mono text-xs">{r.rate || 'not set'}</span> },
            { h: 'Fee', cell: (r) => <span className="font-mono text-xs">{feeText(r)}</span> },
            { h: 'Spread', cell: (r) => <span className="font-mono text-xs">{r.spreadBps} bps</span> },
            { h: 'Min', cell: (r) => <span className="font-mono text-xs">{r.minimum}</span> },
            { h: 'Max', cell: (r) => <span className="font-mono text-xs">{r.maximum || 'not set'}</span> },
            { h: 'Status', cell: (r) => <StatusPill on={r.enabled} /> },
            ...(mode === 'routes' ? [{ h: 'Enabled', cell: (r: ExchangeRoute) => <Switch aria-label="Enabled" disabled={locked} checked={r.enabled} onCheckedChange={(v) => setMany([r.id], { enabled: v })} data-testid={`switch-route-${r.id}`} /> }] : []),
            { h: 'Edit', cell: (r) => <Button size="sm" variant="outline" data-testid={`button-edit-route-${r.id}`} onClick={() => setEdit(r)}>Edit</Button> },
          ]} />}
        </>)}
      {mode === 'routes' && !locked && <Button type="button" variant="outline" data-testid="button-add-route" disabled={d.catalog.length === 0} onClick={add}>Add route</Button>}
      <EditDrawer item={edit} itemKey={edit?.id ?? ''} title={edit ? `${label(edit.source)} to ${label(edit.destination)}` : 'Route'} note={mode === 'pricing' ? 'Pricing fields only. Stages into the draft.' : 'Stages into the exchange draft. Press Save exchange settings to persist.'} locked={locked} onClose={() => setEdit(null)}
        onApply={(v) => { setMany([v.id], v); staged(1, 'route'); setEdit(null); }}>
        {(f, set) => { const pay = f.action === 'buy' || f.action === 'sell'; return (<>
          <div className="rounded-md border bg-muted/30 p-3" data-testid="route-preview">{pair(f)}{methodChips(f) && <div className="mt-2">{methodChips(f)}</div>}</div>
          {mode === 'routes' && <>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => set({ enabled: v })} /></div>
            <Field label="Action"><Pick disabled={action !== undefined} value={f.action} onChange={(v) => set(changeAction(f, v as ExchangeRoute['action']))} options={ACTIONS} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source"><Pick disabled={f.action === 'buy'} value={f.source} onChange={(v) => set({ source: v })} options={f.action === 'buy' ? [[fiat, `${s.fiatCurrency} (fiat)`]] : endpoints.filter(([v]) => v !== fiat)} /></Field>
              <Field label="Destination"><Pick disabled={f.action === 'sell'} value={f.destination} onChange={(v) => set({ destination: v })} options={f.action === 'sell' ? [[fiat, `${s.fiatCurrency} (fiat)`]] : endpoints.filter(([v]) => v !== fiat)} /></Field>
            </div></>}
          <Field label="Manual rate (positive)"><Dec positive value={f.rate} onChange={(v) => set({ rate: v })} placeholder="required" testid="input-route-rate" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Minimum"><Dec value={f.minimum} onChange={(v) => set({ minimum: v })} /></Field><Field label="Maximum"><Dec value={f.maximum} onChange={(v) => set({ maximum: v })} placeholder="required" /></Field></div>
          <div className="grid grid-cols-3 gap-3"><Field label="Fee (bps)"><IntInput value={f.feeBps} onChange={(v) => set({ feeBps: v })} /></Field><Field label="Spread (bps)"><IntInput value={f.spreadBps} onChange={(v) => set({ spreadBps: v })} /></Field><Field label="Fixed fee"><Dec value={f.fixedFee} onChange={(v) => set({ fixedFee: v })} /></Field></div>
          {mode === 'routes' && pay && <Field label={`Payment methods (${f.action})`}>{pms.length === 0 ? <p className="text-xs text-muted-foreground">No {s.fiatCurrency} payment methods exist.</p> : <div className="flex flex-wrap gap-3">{pms.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><Checkbox checked={f.paymentMethodIds.includes(p.id)} onCheckedChange={(v) => set({ paymentMethodIds: v === true ? [...f.paymentMethodIds, p.id] : f.paymentMethodIds.filter((x) => x !== p.id) })} /><LogoText id={idr.payment(p)} text={p.label || 'Unnamed'} size={18} /></label>)}</div>}</Field>}
          {mode === 'routes' && f.action === 'convert' && <><Field label="Convert provider assignment (future)"><Pick testid="select-route-provider" value={f.providerId || 'manual'} onChange={(v) => set({ providerId: v === 'manual' ? undefined : v })} options={providerOptions(d.providerCatalog, 'convert', f.providerId)} /></Field><p className="text-xs text-muted-foreground">Currently {provName(f.providerId)}. Stored for future use; every quote stays manual and sandbox and no provider is called.</p></>}
        </>); }}
      </EditDrawer>
      <EditDrawer item={bulk ? { ...empty } : null} itemKey={`bulk-${bulk}`} title={`${bulk === 'fees' ? 'Bulk fee / spread' : bulk === 'limits' ? 'Bulk limits' : 'Bulk edit'}: ${sel.count} routes`} note="Blank fields stay unchanged. You will review the change before it is staged." locked={locked} onClose={() => setBulk(null)} applyLabel="Review" onApply={applyBulk}>
        {(f, set) => (<>
          {(bulk === 'fees' || bulk === 'all') && <div className="grid grid-cols-3 gap-3">{bf(f, set, 'feeBps', 'Fee (bps)', true)}{bf(f, set, 'spreadBps', 'Spread (bps)', true)}{bf(f, set, 'fixedFee', 'Fixed fee')}</div>}
          {(bulk === 'limits' || bulk === 'all') && <div className="grid grid-cols-2 gap-3">{bf(f, set, 'minimum', 'Minimum')}{bf(f, set, 'maximum', 'Maximum')}</div>}
          {bulk === 'all' && bf(f, set, 'rate', 'Manual rate (applies the same rate to every selected route)')}
        </>)}
      </EditDrawer>
      {confirmNode}
    </Section>
  );
}

export function RoutesPanel({ d, locked, action }: { d: ExchangeDraft; locked: boolean; action?: ExchangeRoute['action'] }) { return <RouteManager d={d} locked={locked} action={action} mode="routes" />; }
export function PricingPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) { return <RouteManager d={d} locked={locked} mode="pricing" />; }

type PM = ExchangePaymentMethod;
const TYPES: [string, string][] = [['manual', 'Manual'], ['bank', 'Bank'], ['card', 'Card']];

export function PaymentMethodsPanel({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm(locked);
  const s = d.draft!; const idr = useIdentityResolver(s);
  const [q, setQ] = useState(''); const [ft, setFt] = useState('all'); const [fs, setFs] = useState('all'); const [fd, setFd] = useState('all');
  const rows = s.paymentMethods.filter((p) => (ft === 'all' || (p.methodType ?? 'manual') === ft) && (fs === 'all' || (fs === 'on') === p.enabled) && (fd === 'all' || (fd === 'buy' ? p.buy : p.sell)) && (p.label || 'Unnamed').toLowerCase().includes(q.trim().toLowerCase()));
  const resetF = () => { setQ(''); setFt('all'); setFs('all'); setFd('all'); };
  const sel = useSelection(rows.map((p) => p.id), { persist: true, universe: s.paymentMethods.map((p) => p.id) });
  const mname = (id: string) => s.paymentMethods.find((p) => p.id === id)?.label || 'Unnamed';
  const [edit, setEdit] = useState<PM | null>(null);
  const [bulk, setBulk] = useState<'fees' | 'limits' | 'reserve' | 'all' | null>(null);
  const setMany = (ids: string[], p: Partial<PM>) => d.patch({ paymentMethods: s.paymentMethods.map((x) => (ids.includes(x.id) ? { ...x, ...p } : x)) });
  const toggle = (on: boolean) => { const ids = sel.ids; ask({ title: `${on ? 'Enable' : 'Disable'} ${ids.length} payment method${ids.length === 1 ? '' : 's'}?`, body: <><p>Proposed: {on ? 'enable' : 'disable'} (staged, not saved). Disabling removes a method from customer checkout after you save.</p><ul className="text-xs">{ids.map((i) => <li key={i}>{mname(i)} ({i.slice(0, 8)})</li>)}</ul></>, label: `Stage ${on ? 'enable' : 'disable'}`, run: () => { setMany(ids, { enabled: on }); staged(ids.length, 'payment method'); sel.clear(); } }); };
  const remove = () => { const ids = sel.ids; ask({ title: `Delete ${ids.length} payment method${ids.length === 1 ? '' : 's'}?`, destructive: true, body: <><p>{ids.map((i) => mname(i)).join(', ')} will be removed from the draft and from any route that uses it.</p><p>Existing orders keep their recorded payment method name. Discard changes restores the draft.</p></>, label: 'Stage delete', run: () => { d.patch({ paymentMethods: s.paymentMethods.filter((p) => !ids.includes(p.id)), routes: s.routes.map((r) => ({ ...r, paymentMethodIds: r.paymentMethodIds.filter((x) => !ids.includes(x)) })) }); staged(ids.length, 'payment method deletion'); sel.clear(); } }); };
  const applyBulk = (v: Record<string, string>) => {
    const p: Partial<PM> = {};
    if (v.reserve !== '' && v.reserve !== undefined) { if (!isDec(v.reserve)) { toast({ title: 'Reserve must be a decimal >= 0 with up to 18 decimal places', variant: 'destructive' }); return; } p.reserve = v.reserve; }
    if (v.feeBps !== '') { if (!isInt(Number(v.feeBps), 5000)) { toast({ title: 'Fee is integer basis points 0 to 5000', variant: 'destructive' }); return; } p.feeBps = Number(v.feeBps); }
    if (v.fixedFee !== '') { if (!isDec(v.fixedFee)) { toast({ title: 'Fixed fee must be a decimal string', variant: 'destructive' }); return; } p.fixedFee = v.fixedFee; }
    if (v.minimum !== '') { if (!isDec(v.minimum)) { toast({ title: 'Minimum must be a decimal string', variant: 'destructive' }); return; } p.minimum = v.minimum; }
    if (v.maximum !== '') { if (v.maximum.toLowerCase() === 'unlimited') p.maximum = null; else if (!isDec(v.maximum)) { toast({ title: 'Maximum must be a decimal or "unlimited"', variant: 'destructive' }); return; } else p.maximum = v.maximum; }
    if (v.methodType !== 'keep') p.methodType = v.methodType as ExchangePaymentMethod['methodType'];
    if (v.buy !== undefined && v.buy !== 'keep') p.buy = v.buy === 'true';
    if (v.sell !== undefined && v.sell !== 'keep') p.sell = v.sell === 'true';
    if (Object.keys(p).length === 0) { toast({ title: 'Nothing to change', variant: 'destructive' }); return; }
    const ids = sel.ids; setBulk(null);
    ask({ title: `Apply to ${ids.length} payment method${ids.length === 1 ? '' : 's'}?`, body: <><ul className="font-mono text-xs">{Object.entries(p).map(([k, x]) => <li key={k}>{k}: {x === null ? 'unlimited' : String(x)}</li>)}</ul>{p.reserve !== undefined && <p className="text-copper">Reserve is sandbox metadata only. It does not represent real funds.</p>}<p>Applies to:</p><ul className="text-xs">{ids.map((i) => <li key={i}>{mname(i)} ({i.slice(0, 8)})</li>)}</ul><p>Amounts are in {s.fiatCurrency}. Staged only, saved on Save.</p></>, label: 'Stage edit', run: () => { setMany(ids, p); staged(ids.length, 'payment method'); sel.clear(); } });
  };
  const emptyB = { feeBps: '', fixedFee: '', minimum: '', maximum: '', methodType: 'keep', reserve: '', buy: 'keep', sell: 'keep' };
  return (
    <Section n="X4" title="Payment methods" note={`Fees and limits are applied in ${s.fiatCurrency}. Sell limits are measured on fiat proceeds before the payment fee.`} footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      {s.paymentMethods.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-methods">No payment methods yet. Buy and Sell routes need at least one enabled method.</p> : (
        <>
          <FilterBar noun="payment methods" search={q} onSearch={setQ} placeholder="Search name" shown={rows.length} total={s.paymentMethods.length} onReset={resetF} active={q !== '' || ft !== 'all' || fs !== 'all' || fd !== 'all'}>
            <div className="w-32"><Pick testid="select-method-type" value={ft} onChange={setFt} options={[['all', 'Any type'], ...TYPES]} /></div>
            <div className="w-32"><Pick testid="select-method-status" value={fs} onChange={setFs} options={[['all', 'Any status'], ['on', 'Enabled'], ['off', 'Disabled']]} /></div>
            <div className="w-32"><Pick testid="select-method-direction" value={fd} onChange={setFd} options={[['all', 'Buy / Sell'], ['buy', 'Buy'], ['sell', 'Sell']]} /></div>
          </FilterBar>
          <BulkBar sel={sel} noun="payment methods" locked={locked} testid="methods">
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-methods" onClick={() => toggle(true)}>Enable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-methods" onClick={() => toggle(false)}>Disable</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-fees-methods" onClick={() => setBulk('fees')}>Bulk fee</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-limits-methods" onClick={() => setBulk('limits')}>Bulk limits</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-reserve-methods" onClick={() => setBulk('reserve')}>Set reserve</BulkBtn>
            <BulkBtn sel={sel} locked={locked} testid="button-bulk-edit-methods" onClick={() => setBulk('all')}>Edit</BulkBtn>
            <BulkBtn destructive sel={sel} locked={locked} testid="button-bulk-delete-methods" onClick={remove}>Delete</BulkBtn>
          </BulkBar>
          {rows.length === 0 ? <NoMatch noun="payment methods" onReset={resetF} /> : <DataTable testid="method" rows={rows} getId={(p) => p.id} sel={sel} locked={locked} cols={[
            { h: 'Logo', cell: (p) => { const pi = idr.payment(p); return <Logo url={pi.logoUrl} label={p.label || '?'} kind="payment-method" generic={pi.generic} />; } },
            { h: 'Name', cell: (p) => <span className="font-medium">{idr.payment(p).name || p.label || 'Unnamed'}<span className="ml-2 text-xs text-muted-foreground">{[p.buy && 'Buy', p.sell && 'Sell'].filter(Boolean).join(' / ')}</span></span> },
            { h: 'Currency', cell: (p) => <span className="font-mono text-xs">{p.currency}</span> },
            { h: 'Type', cell: (p) => <span className="text-xs capitalize">{p.methodType ?? 'manual'}</span> },
            { h: 'Min', cell: (p) => <span className="font-mono text-xs">{p.minimum ?? '0'}</span> },
            { h: 'Max', cell: (p) => <span className="font-mono text-xs">{p.maximum ?? 'Unlimited'}</span> },
            { h: 'Fee', cell: (p) => <span className="font-mono text-xs">{p.feeBps ?? 0} bps + {p.fixedFee ?? '0'}</span> },
            { h: 'Reserve (sandbox)', cell: (p) => <span className="font-mono text-xs">{(p as PM).reserve ?? 'not set'}</span> },
            { h: 'Status', cell: (p) => <StatusPill on={p.enabled} /> },
            { h: 'Enabled', cell: (p) => <Switch aria-label="Enabled" disabled={locked} checked={p.enabled} onCheckedChange={(v) => setMany([p.id], { enabled: v })} data-testid={`switch-method-${p.id}`} /> },
            { h: 'Edit', cell: (p) => <Button size="sm" variant="outline" data-testid={`button-edit-method-${p.id}`} onClick={() => setEdit(p)}>Edit</Button> },
          ]} />}
        </>)}
      {!locked && <CatalogAdd d={d} onAdded={setEdit} />}
      {!locked && <Button type="button" variant="outline" data-testid="button-add-method" onClick={() => { const m: ExchangePaymentMethod = { id: crypto.randomUUID(), label: '', enabled: false, currency: s.fiatCurrency, buy: true, sell: false, logoUrl: null, methodType: 'manual', minimum: '0', maximum: null, feeBps: 0, fixedFee: '0' }; d.patch({ paymentMethods: [...s.paymentMethods, m] }); setEdit(m); }}>Add payment method</Button>}
      <EditDrawer item={edit} itemKey={edit?.id ?? ''} title={edit?.label || 'New payment method'} note={`Amounts are in ${s.fiatCurrency}. Stages into the draft; Save to persist.`} locked={locked} onClose={() => setEdit(null)}
        onApply={(v) => { setMany([v.id], v); staged(1, 'payment method'); setEdit(null); }}>
        {(f, set) => (<>
          <div className="rounded-md border bg-muted/30 p-3" data-testid="method-preview"><LogoText id={idr.payment(f)} text={f.label || 'Unnamed'} size={36} /></div>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => set({ enabled: v })} /></div>
          <Field label="Name"><Input data-testid="input-method-label" value={f.label} onChange={(e) => set({ label: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Currency"><Pick disabled value={f.currency} onChange={() => undefined} options={[[s.fiatCurrency, s.fiatCurrency]]} /></Field><Field label="Type"><Pick value={f.methodType ?? 'manual'} onChange={(v) => set({ methodType: v as ExchangePaymentMethod['methodType'] })} options={TYPES} /></Field></div>
          <div className="flex gap-6 text-sm"><label className="flex items-center gap-2"><Checkbox checked={f.buy} onCheckedChange={(v) => set({ buy: v === true })} />Buy</label><label className="flex items-center gap-2"><Checkbox checked={f.sell} onCheckedChange={(v) => set({ sell: v === true })} />Sell</label></div>
          <Field label="Logo URL (HTTPS)"><Input placeholder="https://" value={f.logoUrl ?? ''} onChange={(e) => set({ logoUrl: e.target.value.trim() === '' ? null : e.target.value.trim() })} /></Field>
          <Field label="Choose supplied logo"><LogoChooser kind="payment-method" hint={f.label} current={f.logoUrl} disabled={locked} onPick={(u) => set({ logoUrl: u })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Minimum"><Dec value={f.minimum ?? '0'} onChange={(v) => set({ minimum: v })} /></Field><Field label="Maximum (blank = unlimited)"><Dec value={f.maximum ?? ''} onChange={(v) => set({ maximum: v === '' ? null : v })} placeholder="unlimited" /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Fee (bps)"><IntInput value={f.feeBps ?? 0} onChange={(v) => set({ feeBps: v })} /></Field><Field label="Fixed fee"><Dec value={f.fixedFee ?? '0'} onChange={(v) => set({ fixedFee: v })} /></Field></div>
          <Field label="Reserve (sandbox metadata, blank = not set)"><Dec testid="input-method-reserve" value={f.reserve ?? ''} onChange={(v) => set({ reserve: v === '' ? undefined : v })} placeholder="not set" /></Field>
          <p className="text-xs text-muted-foreground">Reserve is a sandbox label only. It is not real funds and does not affect quotes or pricing.</p>
        </>)}
      </EditDrawer>
      <EditDrawer item={bulk ? { ...emptyB } : null} itemKey={`bulk-${bulk}`} title={`${bulk === 'fees' ? 'Bulk fee' : bulk === 'limits' ? 'Bulk limits' : bulk === 'reserve' ? 'Set reserve' : 'Bulk edit'}: ${sel.count} methods`} note="Blank fields stay unchanged. You will review before staging." locked={locked} onClose={() => setBulk(null)} applyLabel="Review" onApply={applyBulk}>
        {(f, set) => (<>
          {(bulk === 'fees' || bulk === 'all') && <div className="grid grid-cols-2 gap-3"><Field label="Fee (bps)"><Input inputMode="numeric" data-testid="input-bulk-feeBps" value={f.feeBps} onChange={(e) => set({ feeBps: e.target.value.trim() })} /></Field><Field label="Fixed fee"><Dec testid="input-bulk-fixedFee" value={f.fixedFee} onChange={(v) => set({ fixedFee: v })} /></Field></div>}
          {(bulk === 'limits' || bulk === 'all') && <div className="grid grid-cols-2 gap-3"><Field label="Minimum"><Dec testid="input-bulk-minimum" value={f.minimum} onChange={(v) => set({ minimum: v })} /></Field><Field label='Maximum or "unlimited"'><Input data-testid="input-bulk-maximum" className="font-mono" value={f.maximum} onChange={(e) => set({ maximum: e.target.value.trim() })} /></Field></div>}
          {(bulk === 'reserve' || bulk === 'all') && <Field label="Reserve (sets the same sandbox metadata value)"><Dec testid="input-bulk-reserve" value={f.reserve} onChange={(v) => set({ reserve: v })} /></Field>}
          {bulk === 'all' && <Field label="Type"><Pick value={f.methodType} onChange={(v) => set({ methodType: v })} options={[['keep', 'Keep current'], ...TYPES]} /></Field>}
          {bulk === 'all' && <div className="grid grid-cols-2 gap-3">
            <Field label="Buy support"><Pick testid="select-bulk-method-buy" value={f.buy} onChange={(v) => set({ buy: v })} options={[['keep', 'Keep current'], ['true', 'Allow Buy'], ['false', 'Disable Buy']]} /></Field>
            <Field label="Sell support"><Pick testid="select-bulk-method-sell" value={f.sell} onChange={(v) => set({ sell: v })} options={[['keep', 'Keep current'], ['true', 'Allow Sell'], ['false', 'Disable Sell']]} /></Field>
          </div>}
        </>)}
      </EditDrawer>
      {confirmNode}
    </Section>
  );
}

function CatalogAdd({ d, onAdded }: { d: ExchangeDraft; onAdded: (m: ExchangePaymentMethod) => void }) {
  const q = useVisualCatalog(); const { toast } = useToast(); const s = d.draft!;
  const items = (q.data?.assets ?? []).filter((a) => a.kind === 'payment-method');
  if (items.length === 0) return null;
  return (
    <div className="mb-2 w-full sm:w-72" data-testid="add-method-from-catalog">
      <Pick testid="select-add-from-catalog" bounded value="choose" onChange={(code) => {
        const a = items.find((x) => x.code === code); if (!a) return;
        const normalized = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (s.paymentMethods.some((p) => normalized(p.id) === normalized(a.code) || normalized(p.label) === normalized(a.name) || normalized(p.label) === normalized(a.code))) { toast({ title: `${a.name} already exists`, description: 'Edit the existing method instead.', variant: 'destructive' }); return; }
        const m: ExchangePaymentMethod = { id: crypto.randomUUID(), label: a.name, enabled: false, currency: s.fiatCurrency, buy: true, sell: false, logoUrl: a.logoUrl, methodType: 'manual', minimum: '0', maximum: null, feeBps: 0, fixedFee: '0' };
        d.patch({ paymentMethods: [...s.paymentMethods, m] }); onAdded(m);
      }} options={[['choose', 'Add from catalog (starts disabled)'], ...items.map((a) => [a.code, <span key={a.code} className="inline-flex items-center gap-2"><VisualImg url={a.logoUrl} label={a.name} kind="payment-method" size={18} />{a.name}</span>] as [string, React.ReactNode])]} />
    </div>
  );
}

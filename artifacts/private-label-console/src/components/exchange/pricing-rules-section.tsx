import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dec, Field, IntInput, Pick, isDec, isInt, isPos } from './ui';
import { BulkBar, BulkBtn, DataTable, EditDrawer, FilterBar, NoMatch, StatusPill, useConfirm, useSelection, useStaged } from './bulk';
import { NameList, PageBar, usePaged } from './manage';
import { fiatCodes, fiatId, isFiatEp, methodServes, type ExchangeDraft } from './use-exchange-draft';
import type { ExchangePricingRule } from '@workspace/api-client-react';

type Rule = ExchangePricingRule;
const ANY = '*';
const ACTIONS: [string, string][] = [['swap', 'Swap (crypto and fiat)'], ['convert', 'Convert (crypto to crypto)']];
const LEGACY: [string, string][] = [['buy', 'Buy (legacy)'], ['sell', 'Sell (legacy)']];

export function PricingRulesSection({ d, locked }: { d: ExchangeDraft; locked: boolean }) {
  const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm(locked);
  const s = d.draft!; const fiat = fiatId(s);
  const rules: Rule[] = s.pricingRules ?? [];
  const [q, setQ] = useState(''); const [fa, setFa] = useState('all'); const [fs, setFs] = useState('all');
  const [edit, setEdit] = useState<Rule | null>(null); const [isNew, setIsNew] = useState(false);
  const [bulk, setBulk] = useState(false);
  const label = (id: string) => (id === ANY ? 'Any' : id === 'crypto:*' ? 'Any Crypto' : id === 'fiat:*' ? 'Any Fiat' : id.startsWith('fiat:') ? id.slice(5) : d.catalog.find((c) => c.assetNetworkId === id)?.symbol ?? id);
  const full = (id: string) => { if (id === ANY) return 'Any'; if (id === 'crypto:*') return 'Any Crypto'; if (id === 'fiat:*') return 'Any Fiat'; const c = d.catalog.find((x) => x.assetNetworkId === id); return c ? `${c.symbol} on ${c.networkName}` : id.startsWith('fiat:') ? `${id.slice(5)} (fiat)` : id; };
  const rname = (r: Rule) => `${r.action}: ${label(r.source)} to ${label(r.destination)} (priority ${r.priority}, ${r.id.slice(0, 8)})`;
  const filtered = rules.filter((r) => (fa === 'all' || r.action === fa) && (fs === 'all' || (fs === 'on') === r.enabled) && `${label(r.source)} ${label(r.destination)} ${r.action}`.toLowerCase().includes(q.trim().toLowerCase()));
  const resetF = () => { setQ(''); setFa('all'); setFs('all'); };
  const pg = usePaged(filtered, `${q}|${fa}|${fs}`);
  const sel = useSelection(pg.pageRows.map((r) => r.id));
  // Clear selection whenever a filter changes
  const setF = (fn: (v: string) => void) => (v: string) => { sel.clear(); fn(v); };
  const set = (next: Rule[]) => d.patch({ pricingRules: next });
  const setMany = (ids: string[], p: Partial<Rule>) => set(rules.map((r) => (ids.includes(r.id) ? { ...r, ...p } : r)));
  const sig = (r: Rule) => `${r.action}|${r.source}|${r.destination}|${r.paymentMethodId ?? ''}|${r.priority}`;
  const conflictOf = (r: Rule, all: Rule[]) => r.enabled && all.some((x) => x.id !== r.id && x.enabled && sig(x) === sig(r));
  const endpoints: [string, string][] = [[ANY, 'Any'], ['crypto:*', 'Any Crypto'], ['fiat:*', 'Any Fiat'], ...d.catalog.map((c): [string, string] => [c.assetNetworkId, `${c.symbol} on ${c.networkName}`]), ...fiatCodes(s).map((c): [string, string] => [`fiat:${c}`, `${c} (fiat)`])];
  const pmsFor = (r: Rule) => { const codes = [r.source, r.destination].filter(isFiatEp).map((e) => e.slice(5)); return s.paymentMethods.filter((p) => (codes.length ? codes : fiatCodes(s)).some((c) => methodServes(p, c))); };

  const add = () => { const r: Rule = { id: crypto.randomUUID(), action: 'swap', source: ANY, destination: ANY, enabled: false, priority: 100, feeBps: 0, fixedFee: '0', spreadBps: 0 }; setIsNew(true); setEdit(r); };
  const check = (r: Rule, all: Rule[]): string | null => {
    if (r.source === r.destination && r.source !== ANY) return 'Source and destination must differ';
    if (r.action === 'buy' && r.source !== ANY && r.source !== fiat) return 'Buy source must be fiat or Any';
    if (r.action === 'sell' && r.destination !== ANY && r.destination !== fiat) return 'Sell destination must be fiat or Any';
    if (r.action === 'convert' && (isFiatEp(r.source) || isFiatEp(r.destination))) return 'Convert is crypto to crypto and cannot use a fiat endpoint';
    if (r.action === 'swap' && r.source !== ANY && r.destination !== ANY && isFiatEp(r.source) === isFiatEp(r.destination)) return 'Swap needs one fiat endpoint and one crypto endpoint';
    if (!isInt(r.priority, 1000)) return 'Priority is an integer 0 to 1000';
    if (!isInt(r.feeBps, 5000) || !isInt(r.spreadBps, 5000)) return 'Fee and spread are integer basis points 0 to 5000';
    if (!isDec(r.fixedFee)) return 'Fixed fee must be a decimal string';
    if (r.rate !== undefined && !isPos(r.rate)) return 'Manual rate must be a positive decimal or blank';
    if (conflictOf(r, all)) return 'Conflict: another enabled rule has the same action, source, destination, payment method and priority';
    return null;
  };
  const apply = (v: Rule) => {
    const clean: Rule = { ...v }; if (!clean.rate) delete clean.rate; if (clean.action === 'convert' || !clean.paymentMethodId) delete clean.paymentMethodId;
    const next = isNew ? [...rules, clean] : rules.map((r) => (r.id === clean.id ? clean : r));
    const err = check(clean, next); if (err) { toast({ title: err, variant: 'destructive' }); return; }
    setEdit(null);
    ask({ title: isNew ? 'Add pricing rule?' : 'Apply rule changes?', label: 'Stage changes', body: <><p>Staged only; not saved until you press Save.</p><NameList names={[rname(clean)]} /></>, run: () => { set(next); staged(1, 'pricing rule'); } });
  };
  const toggle = (on: boolean) => { const ids = sel.ids; const next = rules.map((r) => (ids.includes(r.id) ? { ...r, enabled: on } : r)); const bad = next.find((r) => ids.includes(r.id) && conflictOf(r, next)); if (on && bad) { toast({ title: 'Enabling would create a conflict', description: rname(bad), variant: 'destructive' }); return; }
    ask({ title: `${on ? 'Enable' : 'Disable'} ${ids.length} rule${ids.length === 1 ? '' : 's'}?`, label: `Stage ${on ? 'enable' : 'disable'}`, body: <><p>Staged only, not saved.</p><NameList names={rules.filter((r) => ids.includes(r.id)).map(rname)} /></>, run: () => { setMany(ids, { enabled: on }); staged(ids.length, 'pricing rule'); sel.clear(); } }); };
  const remove = (only?: string[]) => { const ids = only ?? sel.ids; ask({ title: `Delete ${ids.length} rule${ids.length === 1 ? '' : 's'}?`, destructive: true, label: 'Stage delete', body: <><p>Removed from the draft. Quotes use the base route pricing after you save. Discard changes restores them.</p><NameList names={rules.filter((r) => ids.includes(r.id)).map(rname)} /></>, run: () => { set(rules.filter((r) => !ids.includes(r.id))); staged(ids.length, 'pricing rule deletion'); sel.clear(); } }); };
  const applyBulk = (v: { feeBps: string; spreadBps: string; fixedFee: string }) => {
    const p: Partial<Rule> = {};
    for (const k of ['feeBps', 'spreadBps'] as const) if (v[k] !== '') { if (!/^\d+$/.test(v[k]) || !isInt(Number(v[k]), 5000)) { toast({ title: 'Fee and spread are integer basis points 0 to 5000', variant: 'destructive' }); return; } p[k] = Number(v[k]); }
    if (v.fixedFee !== '') { if (!isDec(v.fixedFee)) { toast({ title: 'Fixed fee must be a decimal string', variant: 'destructive' }); return; } p.fixedFee = v.fixedFee; }
    if (Object.keys(p).length === 0) { toast({ title: 'Nothing to change', variant: 'destructive' }); return; }
    const ids = sel.ids; setBulk(false);
    ask({ title: `Apply to ${ids.length} rule${ids.length === 1 ? '' : 's'}?`, label: 'Stage edit', body: <><ul className="font-mono text-xs">{Object.entries(p).map(([k, x]) => <li key={k}>{k}: {String(x)}</li>)}</ul><NameList names={rules.filter((r) => ids.includes(r.id)).map(rname)} /><p>Staged only. Press Save to persist.</p></>, run: () => { setMany(ids, p); staged(ids.length, 'pricing rule'); sel.clear(); } });
  };

  return (
    <div className="space-y-3 border-t pt-4" data-testid="section-pricing-rules">
      <div>
        <h3 className="font-display text-lg">Any-to-Any pricing rules (Swap and Convert)</h3>
        <p className="text-xs text-muted-foreground">Rules adjust fees and spread on routes you have already configured; they never create routes. They apply to sandbox quotes only. The most specific matching rule wins first (exact source and destination, then payment method), and priority only breaks ties between equally specific rules. Two enabled rules with identical action, endpoints, payment method and priority are rejected as a conflict. Use exact tenant asset/network IDs from the selectors, an explicit fiat currency, or Any. Manual rate is optional: leave blank to inherit the route or provider rate.</p>
      </div>
      {rules.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-pricing-rules">No pricing rules. Routes use their own fee and spread.</p>}
      {rules.length > 0 && <>
        <FilterBar noun="pricing rules" search={q} onSearch={setF(setQ)} placeholder="Search symbol or action" shown={filtered.length} total={rules.length} onReset={() => { sel.clear(); resetF(); }} active={q !== '' || fa !== 'all' || fs !== 'all'}>
          <div className="w-36"><Pick testid="select-rule-action-filter" value={fa} onChange={setF(setFa)} options={[['all', 'Any action'], ...ACTIONS]} /></div>
          <div className="w-36"><Pick testid="select-rule-status-filter" value={fs} onChange={setF(setFs)} options={[['all', 'Any status'], ['on', 'Enabled'], ['off', 'Disabled']]} /></div>
        </FilterBar>
        <BulkBar sel={sel} noun="pricing rules" locked={locked} testid="pricing-rules">
          <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-rules" onClick={() => toggle(true)}>Enable</BulkBtn>
          <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-rules" onClick={() => toggle(false)}>Disable</BulkBtn>
          <BulkBtn sel={sel} locked={locked} testid="button-bulk-fees-rules" onClick={() => setBulk(true)}>Fee / spread</BulkBtn>
          <BulkBtn destructive sel={sel} locked={locked} testid="button-bulk-delete-rules" onClick={() => remove()}>Delete</BulkBtn>
        </BulkBar>
        {filtered.length === 0 ? <NoMatch noun="pricing rules" onReset={resetF} /> : <><DataTable testid="pricing-rule" onRowClick={(r) => { setIsNew(false); setEdit(r); }} rows={pg.pageRows} getId={(r) => r.id} sel={sel} locked={locked} cols={[
          { h: 'Match', cell: (r) => <span className="flex flex-col"><span className="font-mono text-[10px] uppercase text-copper">{r.action}</span><span className="text-xs">{full(r.source)} to {full(r.destination)}</span>{r.paymentMethodId && <span className="text-[10px] text-muted-foreground">{s.paymentMethods.find((p) => p.id === r.paymentMethodId)?.label || r.paymentMethodId.slice(0, 8)}</span>}</span> },
          { h: 'Priority', cell: (r) => <span className="font-mono text-xs">{r.priority}</span> },
          { h: 'Pricing', cell: (r) => <span className="font-mono text-xs">{r.rate ?? 'inherits rate'}<span className="block text-muted-foreground">fee {r.feeBps} bps{r.fixedFee !== '0' ? ` + ${r.fixedFee}` : ''}, spread {r.spreadBps} bps</span></span> },
          { h: 'Status', cell: (r) => <StatusPill on={r.enabled} /> },
          { h: 'Actions', cell: (r) => <span className="flex items-center gap-2"><Switch aria-label="Enabled" disabled={locked} checked={r.enabled} onCheckedChange={(v) => { const next = rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)); const c = next.find((x) => x.id === r.id)!; if (v && conflictOf(c, next)) { toast({ title: 'Enabling would create a conflict', variant: 'destructive' }); return; } set(next); }} data-testid={`switch-rule-${r.id}`} /><Button size="sm" variant="outline" data-testid={`button-edit-rule-${r.id}`} onClick={() => { setIsNew(false); setEdit(r); }}>Edit</Button><Button size="sm" variant="outline" className="text-destructive" disabled={locked} data-testid={`button-delete-rule-${r.id}`} onClick={() => remove([r.id])}>Delete</Button></span> },
        ]} /><PageBar p={pg} noun="pricing rules" testid="pricing-rules" /></>}
      </>}
      {!locked && <Button type="button" variant="outline" data-testid="button-add-rule" onClick={add}>Add pricing rule</Button>}
      <EditDrawer item={edit} itemKey={edit?.id ?? ''} title={isNew ? 'New pricing rule' : 'Pricing rule'} note="Stages into the exchange draft. Press Save exchange settings to persist." locked={locked} onClose={() => setEdit(null)} applyLabel="Review changes" onApply={apply}>
        {(f, upd) => { const pay = f.action !== 'convert'; const pms = pmsFor(f); const cryptoOnly = endpoints.filter(([v]) => v === ANY || v === 'crypto:*' || (!isFiatEp(v))); return (<>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => upd({ enabled: v })} /></div>
          <Field label="Action"><Pick testid="select-rule-action" value={f.action} onChange={(v) => upd({ action: v as Rule['action'], source: ANY, destination: ANY, paymentMethodId: undefined })} options={[...ACTIONS, ...(f.action === 'buy' || f.action === 'sell' ? LEGACY.filter(([k]) => k === f.action) : [])]} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source"><Pick bounded value={f.source} onChange={(v) => upd({ source: v })} options={f.action === 'swap' ? endpoints : f.action === 'buy' ? endpoints.filter(([v]) => v === ANY || v === fiat) : cryptoOnly} /></Field>
            <Field label="Destination"><Pick bounded value={f.destination} onChange={(v) => upd({ destination: v })} options={f.action === 'swap' ? endpoints.filter(([v]) => v === ANY || !isFiatEp(f.source) || f.source === ANY ? (f.source === ANY || isFiatEp(v) !== isFiatEp(f.source)) : true) : f.action === 'sell' ? endpoints.filter(([v]) => v === ANY || v === fiat) : cryptoOnly} /></Field>
          </div>
          {pay && <Field label="Payment method (optional, only methods linked to the fiat currency)"><Pick value={f.paymentMethodId ?? ANY} onChange={(v) => upd({ paymentMethodId: v === ANY ? undefined : v })} options={[[ANY, 'Any payment method'], ...pms.map((p): [string, string] => [p.id, p.label || 'Unnamed'])]} /></Field>}
          <Field label="Priority (0 to 1000, tie-break only)"><IntInput value={f.priority} onChange={(v) => upd({ priority: v })} /></Field>
          <Field label="Manual rate (blank inherits route/provider rate)"><Dec positive value={f.rate ?? ''} onChange={(v) => upd({ rate: v === '' ? undefined : v })} placeholder="inherit" testid="input-rule-rate" /></Field>
          <div className="grid grid-cols-3 gap-3"><Field label="Fee (bps)"><IntInput value={f.feeBps} onChange={(v) => upd({ feeBps: v })} /></Field><Field label="Spread (bps)"><IntInput value={f.spreadBps} onChange={(v) => upd({ spreadBps: v })} /></Field><Field label="Fixed fee"><Dec value={f.fixedFee} onChange={(v) => upd({ fixedFee: v })} /></Field></div>
        </>); }}
      </EditDrawer>
      <EditDrawer item={bulk ? { feeBps: '', spreadBps: '', fixedFee: '' } : null} itemKey="bulk-rules" title={`Bulk fee / spread: ${sel.count} rules`} note="Blank fields stay unchanged. You will review the change before it is staged." locked={locked} onClose={() => setBulk(false)} applyLabel="Review" onApply={applyBulk}>
        {(f, upd) => <div className="grid grid-cols-3 gap-3">
          <Field label="Fee (bps)"><input inputMode="numeric" data-testid="input-bulk-rule-feeBps" className="flex h-9 w-full rounded-md border bg-transparent px-3 font-mono text-sm" value={f.feeBps} onChange={(e) => upd({ feeBps: e.target.value.trim() })} /></Field>
          <Field label="Spread (bps)"><input inputMode="numeric" data-testid="input-bulk-rule-spreadBps" className="flex h-9 w-full rounded-md border bg-transparent px-3 font-mono text-sm" value={f.spreadBps} onChange={(e) => upd({ spreadBps: e.target.value.trim() })} /></Field>
          <Field label="Fixed fee"><Dec value={f.fixedFee} onChange={(v) => upd({ fixedFee: v })} /></Field>
        </div>}
      </EditDrawer>
      {confirmNode}
    </div>
  );
}

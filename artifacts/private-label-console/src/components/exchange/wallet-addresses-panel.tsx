import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useScanExchangeWallet, type ExchangeWallet, type ExchangeWalletScan } from '@workspace/api-client-react';
import { ExSection as Section, NameList, PageBar, usePaged } from './manage';
import { DraftFooter, Field, Pick, SimNote } from './ui';
import { BulkBar, BulkBtn, DataTable, EditDrawer, FilterBar, NoMatch, StatusPill, useConfirm, useSelection, useStaged } from './bulk';
import type { ExchangeDraft } from './use-exchange-draft';

type W = ExchangeWallet;
const ADAPTERS: [string, string][] = [['evm', 'EVM'], ['bitcoin', 'Bitcoin'], ['tron', 'Tron'], ['solana', 'Solana']];
const PROVIDERS: [string, string][] = [['rpc', 'RPC'], ['alchemy', 'Alchemy']];
const KINDS: [string, string][] = [['native', 'Native'], ['token', 'Token']];

export function WalletAddressesPanel({ d, locked, tenantId }: { d: ExchangeDraft; locked: boolean; tenantId: string }) {
  const { toast } = useToast(); const staged = useStaged(); const [ask, confirmNode] = useConfirm(locked);
  const s = d.draft!; const wallets: W[] = s.wallets ?? [];
  const [q, setQ] = useState(''); const [fa, setFa] = useState('all'); const [fs, setFs] = useState('all'); const [fp, setFp] = useState('all');
  const [edit, setEdit] = useState<W | null>(null); const [isNew, setIsNew] = useState(false); const [bulk, setBulk] = useState(false);
  const [scan, setScan] = useState<ExchangeWalletScan | null>(null);
  const scanM = useScanExchangeWallet();
  const walletsKey = JSON.stringify([tenantId, wallets, s.assets, s.networks]);
  const latestScope = useRef(walletsKey);
  latestScope.current = walletsKey;
  useEffect(() => { setScan(null); }, [walletsKey]);
  const asset = (id: string) => { const c = d.catalog.find((x) => x.assetNetworkId === id); return c ? `${c.symbol} on ${c.networkName}` : id; };
  const short = (a: string) => (a.length > 18 ? `${a.slice(0, 8)}...${a.slice(-6)}` : a);
  const wname = (w: W) => `${w.label || 'Unnamed'} (${asset(w.assetNetworkId)}, ${short(w.address)})`;
  const filtered = wallets.filter((w) => (fa === 'all' || w.adapterKind === fa) && (fp === 'all' || w.providerKey === fp) && (fs === 'all' || (fs === 'on') === w.enabled) && `${w.label} ${w.address} ${asset(w.assetNetworkId)}`.toLowerCase().includes(q.trim().toLowerCase()));
  const resetF = () => { setQ(''); setFa('all'); setFs('all'); setFp('all'); };
  const pg = usePaged(filtered, `${q}|${fa}|${fs}|${fp}`);
  const sel = useSelection(pg.pageRows.map((w) => w.id));
  const f2 = (fn: (v: string) => void) => (v: string) => { sel.clear(); fn(v); };
  const set = (next: W[]) => d.patch({ wallets: next });
  const setMany = (ids: string[], p: Partial<W>) => set(wallets.map((w) => (ids.includes(w.id) ? { ...w, ...p } : w)));
  const copy = (text: string, what: string) => { navigator.clipboard?.writeText(text).then(() => toast({ title: `${what} copied` }), () => toast({ title: 'Copy failed', variant: 'destructive' })); };

  const add = () => { if (d.catalog.length === 0) return; setIsNew(true); setEdit({ id: crypto.randomUUID(), label: '', assetNetworkId: d.catalog[0].assetNetworkId, address: '', enabled: false, adapterKind: 'evm', kind: 'native', providerKey: 'rpc' }); };
  const check = (w: W): string | null => {
    if (!w.label.trim() || w.label.length > 80) return 'Label is required, up to 80 characters';
    if (!d.catalog.some((c) => c.assetNetworkId === w.assetNetworkId)) return 'Choose a tenant asset and network';
    if (!w.address.trim() || w.address.length > 160) return 'Public address is required, up to 160 characters';
    if (w.memo && w.memo.length > 120) return 'Memo is up to 120 characters';
    if (w.kind === 'token' && !w.contractOrMint) return 'Token wallets need a contract or mint';
    if (w.contractOrMint && w.contractOrMint.length > 160) return 'Contract or mint is up to 160 characters';
    return null;
  };
  const apply = (v: W) => {
    const c: W = { ...v, label: v.label.trim(), address: v.address.trim() };
    if (!c.memo?.trim()) delete c.memo; else c.memo = c.memo.trim();
    if (c.kind === 'native' || !c.contractOrMint?.trim()) delete c.contractOrMint; else c.contractOrMint = c.contractOrMint.trim();
    const err = check(c); if (err) { toast({ title: err, variant: 'destructive' }); return; }
    const next = isNew ? [...wallets, c] : wallets.map((w) => (w.id === c.id ? c : w));
    setEdit(null);
    ask({ title: isNew ? 'Add wallet address?' : 'Apply wallet changes?', label: 'Stage changes', body: <><p>Staged only; not saved until you press Save. Only a public address is stored. The backend validates the address, endpoint and duplicate bindings on save.</p><NameList names={[wname(c)]} /></>, run: () => { set(next); staged(1, 'wallet'); } });
  };
  const toggle = (on: boolean) => { const ids = sel.ids; ask({ title: `${on ? 'Enable' : 'Disable'} ${ids.length} wallet${ids.length === 1 ? '' : 's'}?`, label: `Stage ${on ? 'enable' : 'disable'}`, body: <><p>Staged only, not saved. Enabled does not mean connected; it only allows read-only scans once saved and an RPC provider is configured.</p><NameList names={wallets.filter((w) => ids.includes(w.id)).map(wname)} /></>, run: () => { setMany(ids, { enabled: on }); staged(ids.length, 'wallet'); sel.clear(); } }); };
  const remove = (only?: string[]) => { const ids = only ?? sel.ids; ask({ title: `Delete ${ids.length} wallet${ids.length === 1 ? '' : 's'}?`, destructive: true, label: 'Stage delete', body: <><p>Removed from the draft only after you save. Discard changes restores them.</p><NameList names={wallets.filter((w) => ids.includes(w.id)).map(wname)} /></>, run: () => { set(wallets.filter((w) => !ids.includes(w.id))); staged(ids.length, 'wallet deletion'); sel.clear(); } }); };
  const applyBulk = (v: { adapterKind: string; providerKey: string }) => {
    const p: Partial<W> = {};
    if (v.adapterKind) p.adapterKind = v.adapterKind as W['adapterKind'];
    if (v.providerKey) p.providerKey = v.providerKey as W['providerKey'];
    if (Object.keys(p).length === 0) { toast({ title: 'Nothing to change', description: 'Blank fields stay unchanged.', variant: 'destructive' }); return; }
    const ids = sel.ids; setBulk(false);
    ask({ title: `Apply to ${ids.length} wallet${ids.length === 1 ? '' : 's'}?`, label: 'Stage edit', body: <><ul className="font-mono text-xs">{Object.entries(p).map(([k, x]) => <li key={k}>{k}: {String(x)}</li>)}</ul><NameList names={wallets.filter((w) => ids.includes(w.id)).map(wname)} /><p>Staged only. Press Save to persist.</p></>, run: () => { setMany(ids, p); staged(ids.length, 'wallet'); sel.clear(); } });
  };
  const runScan = (w: W) => {
    const requestedScope = walletsKey;
    setScan(null);
    scanM.mutate({ tenantId, walletId: w.id, data: { reason: 'Operator requested read-only wallet observations' } }, {
      onSuccess: (r) => { if (latestScope.current === requestedScope) setScan(r); },
      onError: (e) => toast({ title: 'Scan failed', description: (e as Error)?.message ?? 'Request rejected', variant: 'destructive' }),
    });
  };
  const scanBlock = (w: W) => d.dirty ? 'Save first' : locked ? 'Locked' : !w.enabled ? 'Enable first' : '';
  const scanW = scan ? wallets.find((w) => w.id === scan.walletId) : null;

  return (
    <Section n="X6" title="Wallet addresses" note="Public address configuration and read-only observations only. No private keys, deposit activation or financial execution." footer={<DraftFooter d={d} locked={locked} />}>
      <SimNote />
      <p className="rounded-md border p-3 text-xs text-muted-foreground" data-testid="text-wallet-scan-help">Scans read the last five blocks through the independently assigned RPC provider. Save your changes first, and configure that provider in Integrations before scanning. Results are not an indexed history or a balance, and zero results do not prove there were no transfers. Enabled does not mean connected.</p>
      {wallets.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-no-wallets">{d.catalog.length === 0 ? 'No wallet addresses. Select tenant assets and networks first.' : 'No wallet addresses yet. Add a public address for a tenant asset and network.'}</p>}
      {wallets.length > 0 && <>
        <FilterBar noun="wallets" search={q} onSearch={f2(setQ)} placeholder="Search label, address or asset" shown={filtered.length} total={wallets.length} onReset={() => { sel.clear(); resetF(); }} active={q !== '' || fa !== 'all' || fs !== 'all' || fp !== 'all'}>
          <div className="w-36"><Pick testid="select-wallet-adapter-filter" value={fa} onChange={f2(setFa)} options={[['all', 'Any adapter'], ...ADAPTERS]} /></div>
          <div className="w-36"><Pick testid="select-wallet-provider-filter" value={fp} onChange={f2(setFp)} options={[['all', 'Any provider'], ...PROVIDERS]} /></div>
          <div className="w-36"><Pick testid="select-wallet-status-filter" value={fs} onChange={f2(setFs)} options={[['all', 'Any status'], ['on', 'Enabled'], ['off', 'Disabled']]} /></div>
        </FilterBar>
        <BulkBar sel={sel} noun="wallets" locked={locked} testid="wallets">
          <BulkBtn sel={sel} locked={locked} testid="button-bulk-enable-wallets" onClick={() => toggle(true)}>Enable</BulkBtn>
          <BulkBtn sel={sel} locked={locked} testid="button-bulk-disable-wallets" onClick={() => toggle(false)}>Disable</BulkBtn>
          <BulkBtn sel={sel} locked={locked} testid="button-bulk-edit-wallets" onClick={() => setBulk(true)}>Adapter / provider</BulkBtn>
          <BulkBtn destructive sel={sel} locked={locked} testid="button-bulk-delete-wallets" onClick={() => remove()}>Delete</BulkBtn>
        </BulkBar>
        {filtered.length === 0 ? <NoMatch noun="wallets" onReset={resetF} /> : <><DataTable testid="wallet" onRowClick={(w) => { setIsNew(false); setEdit(w); }} rows={pg.pageRows} getId={(w) => w.id} sel={sel} locked={locked} cols={[
          { h: 'Wallet', cell: (w) => <span className="flex flex-col"><span className="font-medium">{w.label || 'Unnamed'}</span><span className="text-xs text-muted-foreground">{asset(w.assetNetworkId)}</span></span> },
          { h: 'Address', cell: (w) => <span className="flex flex-col gap-1"><span className="break-all font-mono text-xs">{w.address}</span>{w.memo && <span className="font-mono text-[10px] text-muted-foreground">memo {w.memo}</span>}<span className="flex gap-1"><Button size="sm" variant="ghost" data-testid={`button-copy-address-${w.id}`} onClick={() => copy(w.address, 'Address')}>Copy address</Button>{w.memo && <Button size="sm" variant="ghost" data-testid={`button-copy-memo-${w.id}`} onClick={() => copy(w.memo ?? '', 'Memo')}>Copy memo</Button>}</span></span> },
          { h: 'Type', cell: (w) => <span className="font-mono text-xs">{w.adapterKind} / {w.kind}{w.contractOrMint && <span className="block break-all text-muted-foreground">{short(w.contractOrMint)}</span>}</span> },
          { h: 'Provider', cell: (w) => <span className="font-mono text-xs uppercase">{w.providerKey}</span> },
          { h: 'Status', cell: (w) => <StatusPill on={w.enabled} /> },
          { h: 'Actions', cell: (w) => <span className="flex flex-wrap items-center gap-2"><Switch aria-label="Enabled" disabled={locked} checked={w.enabled} onCheckedChange={(v) => setMany([w.id], { enabled: v })} data-testid={`switch-wallet-${w.id}`} /><Button size="sm" variant="outline" data-testid={`button-edit-wallet-${w.id}`} onClick={() => { setIsNew(false); setEdit(w); }}>Edit</Button><Button size="sm" variant="outline" disabled={!!scanBlock(w) || scanM.isPending} title={scanBlock(w) || 'Read-only scan of the last five blocks'} data-testid={`button-scan-wallet-${w.id}`} onClick={() => runScan(w)}>{scanM.isPending && scanM.variables?.walletId === w.id ? 'Scanning' : scanBlock(w) ? `Scan: ${scanBlock(w)}` : 'Scan'}</Button><Button size="sm" variant="outline" className="text-destructive" disabled={locked} data-testid={`button-delete-wallet-${w.id}`} onClick={() => remove([w.id])}>Delete</Button></span> },
        ]} /><PageBar p={pg} noun="wallets" testid="wallets" /></>}
      </>}
      {!locked && <Button type="button" variant="outline" data-testid="button-add-wallet" disabled={d.catalog.length === 0} onClick={add}>Add wallet address</Button>}
      {scan && <div className="space-y-2 rounded-md border bg-muted/30 p-3" data-testid="wallet-scan-result">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Read-only scan: {scanW ? wname(scanW) : scan.walletId}</p>
        <p className="text-xs">Observed at {new Date(scan.observedAt).toLocaleString()}. Range {scan.from} to {scan.to}. Confirmations required: {scan.confirmationsRequired}. Sandbox only; execution disabled.</p>
        <p className="text-xs text-muted-foreground">Bounded to the last five blocks. This is not an indexed history or a balance; no results does not prove there were no transfers.</p>
        {scan.observations.length === 0 ? <p className="text-sm" data-testid="text-scan-empty">No observations in this range.</p> : <ul className="space-y-2">{scan.observations.map((o) => <li key={o.eventId} className="rounded-md border bg-card p-2 text-xs" data-testid={`scan-observation-${o.eventId}`}>
          <span className="flex flex-wrap items-center gap-2"><span className="break-all font-mono">{o.transactionHash}</span><Button size="sm" variant="ghost" onClick={() => copy(o.transactionHash, 'Transaction hash')}>Copy hash</Button></span>
          <span className="mt-1 block font-mono text-muted-foreground">amount {o.amount} | block/slot {o.blockOrSlot} | {o.confirmations} confirmations</span>
          <span className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] uppercase"><span>{o.canonical ? 'Canonical' : 'Not canonical'}</span><span>{o.successful ? 'Successful' : 'Failed'}</span><span>{o.confirmed ? 'Confirmed' : 'Unconfirmed'}</span></span>
        </li>)}</ul>}
      </div>}
      <EditDrawer item={edit} itemKey={edit?.id ?? ''} title={isNew ? 'New wallet address' : edit?.label || 'Wallet address'} note="Public address only. Never enter private keys or seed phrases. Stages into the draft; Save to persist." locked={locked} onClose={() => setEdit(null)} applyLabel="Review changes" onApply={apply}>
        {(f, upd) => (<>
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => upd({ enabled: v })} /></div>
          <Field label="Label"><Input maxLength={80} data-testid="input-wallet-label" value={f.label} onChange={(e) => upd({ label: e.target.value })} /></Field>
          <Field label="Asset and network"><Pick bounded value={f.assetNetworkId} onChange={(v) => upd({ assetNetworkId: v })} options={d.catalog.map((c): [string, string] => [c.assetNetworkId, `${c.symbol} on ${c.networkName}`])} /></Field>
          <Field label="Public address"><Input maxLength={160} className="font-mono" data-testid="input-wallet-address" value={f.address} onChange={(e) => upd({ address: e.target.value.trim() })} /></Field>
          <Field label="Memo (optional)"><Input maxLength={120} className="font-mono" value={f.memo ?? ''} onChange={(e) => upd({ memo: e.target.value === '' ? undefined : e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adapter"><Pick value={f.adapterKind} onChange={(v) => upd({ adapterKind: v as W['adapterKind'] })} options={ADAPTERS} /></Field>
            <Field label="Provider"><Pick value={f.providerKey} onChange={(v) => upd({ providerKey: v as W['providerKey'] })} options={PROVIDERS} /></Field>
          </div>
          <Field label="Kind"><Pick value={f.kind} onChange={(v) => upd(v === 'native' ? { kind: 'native', contractOrMint: undefined } : { kind: 'token' })} options={KINDS} /></Field>
          {f.kind === 'token' && <Field label="Contract or mint (required for tokens)"><Input maxLength={160} className="font-mono" data-testid="input-wallet-contract" value={f.contractOrMint ?? ''} onChange={(e) => upd({ contractOrMint: e.target.value.trim() })} /></Field>}
        </>)}
      </EditDrawer>
      <EditDrawer item={bulk ? { adapterKind: '', providerKey: '' } : null} itemKey="bulk-wallets" title={`Bulk adapter / provider: ${sel.count} wallets`} note="Blank fields stay unchanged. You will review the change before it is staged." locked={locked} onClose={() => setBulk(false)} applyLabel="Review" onApply={applyBulk}>
        {(f, upd) => <div className="grid grid-cols-2 gap-3">
          <Field label="Adapter"><Pick value={f.adapterKind || 'keep'} onChange={(v) => upd({ adapterKind: v === 'keep' ? '' : v })} options={[['keep', 'Unchanged'], ...ADAPTERS]} /></Field>
          <Field label="Provider"><Pick value={f.providerKey || 'keep'} onChange={(v) => upd({ providerKey: v === 'keep' ? '' : v })} options={[['keep', 'Unchanged'], ...PROVIDERS]} /></Field>
        </div>}
      </EditDrawer>
      {confirmNode}
    </Section>
  );
}

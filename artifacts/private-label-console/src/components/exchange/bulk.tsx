import { useEffect, useRef, useState, type MouseEvent as _M, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { computeSelection, selectVisible, deselectVisible } from './selection-state';
import { useToast } from '@/hooks/use-toast';
import type { ExchangeProvider } from '@workspace/api-client-react';
import { VisualImg } from './visual-catalog';
import type { LogoKind } from './logo-identity';

export interface Selection { ids: string[]; count: number; all: boolean; some: boolean; has: (id: string) => boolean; toggle: (id: string) => void; selectAll: () => void; clear: () => void; persist: boolean; hidden: number; deselectVisible: () => void }

/** visible = rows currently shown. persist + universe = keep selection across filters within the full dataset. */
export function useSelection(visible: string[], opts?: { persist?: boolean; universe?: string[] }): Selection {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const persist = !!opts?.persist;
  const scope = persist && opts?.universe ? opts.universe : visible;
  const scopeKey = JSON.stringify(scope);
  useEffect(() => {
    const allowed = new Set(scope);
    setSel((current) => {
      const next = new Set([...current].filter((id) => allowed.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = computeSelection(sel, visible, persist ? opts?.universe : undefined);
  const ids = v.ids; const uni = new Set(persist && opts?.universe ? opts.universe : visible);
  return {
    ids, count: ids.length, persist, hidden: v.hidden,
    all: v.all, some: v.some,
    has: (id) => sel.has(id) && uni.has(id),
    toggle: (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    selectAll: () => setSel((s) => selectVisible(s, visible, persist)),
    deselectVisible: () => setSel((s) => deselectVisible(s, visible)),
    clear: () => setSel(new Set()),
  };
}

export function BulkBar({ sel, noun, locked, children, testid }: { sel: Selection; noun: string; locked?: boolean; children?: ReactNode; testid: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2" data-testid={`bulk-${testid}`}>
      <label className="flex items-center gap-2 text-sm"><Checkbox data-testid={`checkbox-select-all-${testid}`} aria-label={`Select all shown ${noun}`} checked={sel.all ? true : sel.some ? 'indeterminate' : false} onCheckedChange={() => (sel.all ? (sel.persist ? sel.deselectVisible() : sel.clear()) : sel.selectAll())} />{sel.persist ? 'Select filtered results' : 'Select all shown'}</label>
      {sel.persist && <Button type="button" size="sm" variant="ghost" data-testid={`button-deselect-filtered-${testid}`} disabled={sel.count === sel.hidden} onClick={sel.deselectVisible}>Deselect filtered results</Button>}
      <Button type="button" size="sm" variant="ghost" data-testid={`button-deselect-${testid}`} disabled={sel.count === 0} onClick={sel.clear}>Deselect all</Button>
      <span className="font-mono text-xs text-muted-foreground" data-testid={`text-selected-${testid}`}>Selected: {sel.count}{sel.hidden > 0 ? ` (${sel.hidden} hidden by filters)` : ''}</span>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
      {sel.hidden > 0 && <p className="w-full text-xs text-copper" data-testid={`text-hidden-${testid}`}>{sel.hidden} selected {noun} are hidden by the current filters and will be included in bulk actions. Use Deselect all to clear them.</p>}
      {locked && <p className="w-full text-xs text-muted-foreground">Bulk changes are locked: permission, plan feature, subscription state or read-only demo. Selection is for inspection only; nothing can be written.</p>}
    </div>
  );
}

export function FilterBar({ search, onSearch, placeholder, children, shown, total, noun, onReset, active }: { search: string; onSearch: (v: string) => void; placeholder: string; children?: ReactNode; shown: number; total: number; noun: string; onReset: () => void; active: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" data-testid={`filters-${noun}`}>
      <Input className="w-full sm:w-64" aria-label={`Search ${noun}`} data-testid={`input-search-${noun}`} placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} />
      {children}
      {active && <Button type="button" size="sm" variant="ghost" data-testid={`button-reset-${noun}`} onClick={onReset}>Reset filters</Button>}
      <span className="font-mono text-xs text-muted-foreground" data-testid={`text-count-${noun}`}>{shown} of {total} {noun}</span>
    </div>
  );
}

export function NoMatch({ noun, onReset }: { noun: string; onReset: () => void }) {
  return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid={`text-nomatch-${noun}`}>No {noun} match the current filters. <Button type="button" size="sm" variant="outline" className="ml-2" onClick={onReset}>Reset filters</Button></div>;
}

export function BulkBtn({ sel, locked, onClick, children, testid, destructive }: { sel: Selection; locked?: boolean; onClick: () => void; children: ReactNode; testid: string; destructive?: boolean }) {
  return <Button type="button" size="sm" variant={destructive ? 'outline' : 'outline'} className={destructive ? 'text-destructive' : ''} data-testid={testid} disabled={locked || sel.count === 0} onClick={onClick}>{children}</Button>;
}

export interface Col<T> { h: string; cell: (r: T) => ReactNode; className?: string }

export function DataTable<T>({ rows, cols, getId, sel, locked, selectionLocked = false, testid, onRowClick, readOnlyRows = false }: { rows: T[]; cols: Col<T>[]; getId: (r: T) => string; sel: Selection; locked?: boolean; selectionLocked?: boolean; testid: string; onRowClick?: (r: T) => void; readOnlyRows?: boolean }) {
  const click = (e: _M, r: T) => { if (!(e.target as HTMLElement).closest('button, input, a, [role="checkbox"], [role="switch"]')) onRowClick?.(r); };
  const selectionLabel = sel.persist ? 'Select all filtered results' : 'Select visible';
  const headCheck = <Checkbox disabled={selectionLocked} aria-label={selectionLabel} checked={sel.all ? true : sel.some ? 'indeterminate' : false} onCheckedChange={() => (sel.all ? (sel.persist ? sel.deselectVisible() : sel.clear()) : sel.selectAll())} />;
  return (
    <div className="max-w-full min-w-0" data-testid={`table-${testid}`}>
      <div className="hidden max-w-full min-w-0 overflow-x-auto rounded-md border bg-card md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr>
            {!readOnlyRows && <th className="w-10 px-3 py-2">{headCheck}</th>}
            {cols.map((c) => <th key={c.h} className="whitespace-nowrap px-3 py-2 font-normal">{c.h}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((r) => { const id = getId(r); return (
            <tr key={id} className={`${sel.has(id) ? 'bg-muted/50' : 'hover:bg-muted/30'} ${onRowClick ? 'cursor-pointer' : ''}`} data-testid={`row-${testid}-${id}`} onClick={(e) => click(e, r)}>
              {!readOnlyRows && <td className="px-3 py-2"><Checkbox disabled={selectionLocked} data-testid={`checkbox-${testid}-${id}`} aria-label="Select row" checked={sel.has(id)} onCheckedChange={() => sel.toggle(id)} /></td>}
              {cols.map((c) => <td key={c.h} className={`px-3 py-2 ${c.className ?? ''}`}>{c.cell(r)}</td>)}</tr>); })}</tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden" data-testid={`cards-${testid}`}>
        <li className="flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{!readOnlyRows && headCheck}{readOnlyRows ? 'Records' : selectionLabel}</li>
        {rows.map((r) => { const id = getId(r); const [first, ...rest] = cols; return (
          <li key={id} className={`min-w-0 space-y-2 rounded-md border bg-card p-3 ${sel.has(id) ? 'bg-muted/50' : ''} ${onRowClick ? 'cursor-pointer' : ''}`} data-testid={`card-${testid}-${id}`} onClick={(e) => click(e, r)}>
            <div className="flex min-w-0 items-center gap-3">{!readOnlyRows && <Checkbox disabled={selectionLocked} aria-label="Select row" checked={sel.has(id)} onCheckedChange={() => sel.toggle(id)} />}<div className="min-w-0 flex-1 break-words">{first.cell(r)}</div></div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">{rest.map((c) => <div key={c.h} className={`min-w-0 break-words ${c.h === 'Actions' || c.h === 'Edit' ? 'col-span-2' : ''}`}><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.h}</dt><dd className="mt-0.5 text-sm">{c.cell(r)}</dd></div>)}</dl>
          </li>); })}
      </ul>
    </div>
  );
}

export function Logo(props: { url?: string | null; label: string; kind?: LogoKind; size?: number; generic?: 'bank' | 'card' }) {
  return <VisualImg {...props} />;
}

type Opts = { title: string; body: ReactNode; label: string; destructive?: boolean; run: () => ReactNode | void | Promise<ReactNode | void>; readOnly?: boolean };

/** Review changes -> Confirm -> Apply -> Result. Guards double submission. */
export function useConfirm(readOnly = false): [(o: Opts) => void, ReactNode] {
  const [o, setO] = useState<Opts | null>(null);
  const [phase, setPhase] = useState<'review' | 'applying' | 'result'>('review');
  const [res, setRes] = useState<ReactNode>(null);
  const [err, setErr] = useState('');
  const busy = useRef(false);
  const open = (n: Opts) => { busy.current = false; setPhase('review'); setRes(null); setErr(''); setO(n); };
  const go = async () => {
    if (!o || busy.current || readOnly || o.readOnly) return; busy.current = true; setPhase('applying');
    try { const r = await o.run(); setRes(r ?? null); } catch (e) { setErr((e as Error)?.message ?? 'Failed'); }
    setPhase('result'); busy.current = false;
  };
  const node = (
    <AlertDialog open={o !== null} onOpenChange={(v) => { if (!v && phase !== 'applying') setO(null); }}>
      <AlertDialogContent data-testid="dialog-confirm" className="max-h-[85dvh] overflow-y-auto">
        <AlertDialogHeader>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground" data-testid="text-confirm-phase">{phase === 'review' ? 'Step 1 of 2: Review changes' : phase === 'applying' ? 'Applying' : 'Result'}</p>
          <AlertDialogTitle>{o?.title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div className="min-w-0 break-words space-y-2 text-sm">{phase === 'result' ? (err ? <p className="text-destructive" data-testid="text-confirm-error">{err}</p> : (res ?? <p data-testid="text-confirm-result">Applied. Exchange setting changes are staged only until you press Save exchange settings.</p>)) : phase === 'applying' ? <p>Applying, please wait.</p> : o?.body}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {phase === 'result' ? <Button type="button" data-testid="button-confirm-close" onClick={() => setO(null)}>Close</Button> : <>
            <AlertDialogCancel data-testid="button-confirm-cancel" disabled={phase === 'applying'}>Cancel</AlertDialogCancel>
            <Button type="button" data-testid="button-confirm-ok" disabled={phase === 'applying' || readOnly || o?.readOnly} variant={o?.destructive ? 'destructive' : 'default'} onClick={go}>{phase === 'applying' ? 'Applying' : `Confirm: ${o?.label}`}</Button></>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return [open, node];
}

export function useStaged() {
  const { toast } = useToast();
  return (n: number, noun: string) => toast({ title: `${n} ${noun}${n === 1 ? '' : 's'} staged`, description: 'Staged only, not saved. Use Save exchange settings or Discard changes at the bottom of this section.' });
}

function Inner<T>({ item, title, note, locked, onClose, onApply, applyLabel, children }: { item: T; title: string; note?: string; locked: boolean; onClose: () => void; onApply: (v: T) => void; applyLabel: string; children: (f: T, set: (p: Partial<T>) => void) => ReactNode }) {
  const [f, setF] = useState<T>(item);
  return (
    <>
      <SheetHeader><SheetTitle className="font-display text-2xl">{title}</SheetTitle><SheetDescription>{note}</SheetDescription></SheetHeader>
      <fieldset disabled={locked} className="mt-4 space-y-4">{children(f, (p) => setF((x) => ({ ...x, ...p })))}</fieldset>
      <SheetFooter className="mt-6 gap-2"><Button type="button" variant="ghost" data-testid="button-drawer-cancel" onClick={onClose}>Cancel</Button><Button type="button" data-testid="button-drawer-apply" disabled={locked} onClick={() => onApply(f)}>{applyLabel}</Button></SheetFooter>
    </>
  );
}

export function EditDrawer<T>({ item, itemKey, title, note, locked, onClose, onApply, applyLabel = 'Stage changes', children }: { item: T | null; itemKey: string; title: string; note?: string; locked: boolean; onClose: () => void; onApply: (v: T) => void; applyLabel?: string; children: (f: T, set: (p: Partial<T>) => void) => ReactNode }) {
  return (
    <Sheet open={item !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full max-w-none overflow-y-auto sm:max-w-lg" data-testid="drawer-edit">
        {item !== null && <Inner key={itemKey} item={item} title={title} note={note} locked={locked} onClose={onClose} onApply={onApply} applyLabel={applyLabel}>{children}</Inner>}
      </SheetContent>
    </Sheet>
  );
}

export function StatusPill({ on, onLabel = 'Enabled', offLabel = 'Disabled' }: { on: boolean; onLabel?: string; offLabel?: string }) {
  return <span className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${on ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground'}`}>{on ? onLabel : offLabel}</span>;
}

export function providerOptions(cat: ExchangeProvider[], cap: string, current?: string): [string, string][] {
  const out: [string, string][] = [['manual', 'Manual / sandbox']];
  cat.filter((p) => p.status !== 'sandbox' && p.status !== 'coming_soon' && p.capabilities.some((c) => c.toLowerCase().includes(cap))).forEach((p) => out.push([p.id, `${p.name} (configuration only)`]));
  if (current && current !== 'manual' && !out.some(([v]) => v === current)) out.push([current, current]);
  return out;
}

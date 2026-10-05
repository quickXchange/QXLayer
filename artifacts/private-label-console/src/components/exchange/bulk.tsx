import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ExchangeProvider } from '@workspace/api-client-react';

export interface Selection { ids: string[]; count: number; all: boolean; some: boolean; has: (id: string) => boolean; toggle: (id: string) => void; selectAll: () => void; clear: () => void }

export function useSelection(visible: string[]): Selection {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const key = visible.join('|');
  const ids = useMemo(() => { const v = new Set(visible); return [...sel].filter((i) => v.has(i)); }, [sel, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    ids, count: ids.length, all: visible.length > 0 && ids.length === visible.length, some: ids.length > 0 && ids.length < visible.length,
    has: (id) => ids.includes(id),
    toggle: (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    selectAll: () => setSel(new Set(visible)), clear: () => setSel(new Set()),
  };
}

export function BulkBar({ sel, noun, locked, children, testid }: { sel: Selection; noun: string; locked?: boolean; children?: ReactNode; testid: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2" data-testid={`bulk-${testid}`}>
      <label className="flex items-center gap-2 text-sm"><Checkbox data-testid={`checkbox-select-all-${testid}`} disabled={locked} aria-label={`Select all visible ${noun}`} checked={sel.all ? true : sel.some ? 'indeterminate' : false} onCheckedChange={() => (sel.all ? sel.clear() : sel.selectAll())} />Select all visible</label>
      <Button type="button" size="sm" variant="ghost" data-testid={`button-deselect-${testid}`} disabled={sel.count === 0} onClick={sel.clear}>Deselect all</Button>
      <span className="font-mono text-xs text-muted-foreground" data-testid={`text-selected-${testid}`}>Selected: {sel.count}</span>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
      {locked && <p className="w-full text-xs text-muted-foreground">Bulk changes are locked: permission, plan feature, subscription state or read-only demo.</p>}
    </div>
  );
}

export function BulkBtn({ sel, locked, onClick, children, testid, destructive }: { sel: Selection; locked?: boolean; onClick: () => void; children: ReactNode; testid: string; destructive?: boolean }) {
  return <Button type="button" size="sm" variant={destructive ? 'outline' : 'outline'} className={destructive ? 'text-destructive' : ''} data-testid={testid} disabled={locked || sel.count === 0} onClick={onClick}>{children}</Button>;
}

export interface Col<T> { h: string; cell: (r: T) => ReactNode; className?: string }

export function DataTable<T>({ rows, cols, getId, sel, locked, testid, onRowClick }: { rows: T[]; cols: Col<T>[]; getId: (r: T) => string; sel: Selection; locked?: boolean; testid: string; onRowClick?: (r: T) => void }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card" data-testid={`table-${testid}`}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr>
          <th className="w-10 px-3 py-2"><Checkbox aria-label="Select all visible" disabled={locked} checked={sel.all ? true : sel.some ? 'indeterminate' : false} onCheckedChange={() => (sel.all ? sel.clear() : sel.selectAll())} /></th>
          {cols.map((c) => <th key={c.h} className="whitespace-nowrap px-3 py-2 font-normal">{c.h}</th>)}</tr></thead>
        <tbody className="divide-y">{rows.map((r) => { const id = getId(r); return (
          <tr key={id} className={`${sel.has(id) ? 'bg-muted/50' : 'hover:bg-muted/30'} ${onRowClick ? 'cursor-pointer' : ''}`} data-testid={`row-${testid}-${id}`} onClick={(e) => { if (!(e.target as HTMLElement).closest('button, input, a, [role="checkbox"], [role="switch"]')) onRowClick?.(r); }}>
            <td className="px-3 py-2"><Checkbox data-testid={`checkbox-${testid}-${id}`} aria-label="Select row" disabled={locked} checked={sel.has(id)} onCheckedChange={() => sel.toggle(id)} /></td>
            {cols.map((c) => <td key={c.h} className={`px-3 py-2 ${c.className ?? ''}`}>{c.cell(r)}</td>)}</tr>); })}</tbody>
      </table>
    </div>
  );
}

export function Logo({ url, label }: { url?: string | null; label: string }) {
  return url ? <img src={url} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-muted font-mono text-[10px]">{label.slice(0, 3).toUpperCase()}</span>;
}

export function useConfirm(): [(o: { title: string; body: ReactNode; label: string; destructive?: boolean; run: () => void }) => void, ReactNode] {
  const [o, setO] = useState<{ title: string; body: ReactNode; label: string; destructive?: boolean; run: () => void } | null>(null);
  const node = (
    <AlertDialog open={o !== null} onOpenChange={(v) => { if (!v) setO(null); }}>
      <AlertDialogContent data-testid="dialog-confirm">
        <AlertDialogHeader><AlertDialogTitle>{o?.title}</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-2 text-sm">{o?.body}</div></AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel data-testid="button-confirm-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid="button-confirm-ok" className={o?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''} onClick={() => { o?.run(); setO(null); }}>{o?.label}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return [setO, node];
}

export function useStaged() {
  const { toast } = useToast();
  return (n: number, noun: string) => toast({ title: `${n} ${noun}${n === 1 ? '' : 's'} staged`, description: 'Staged, save to persist. Use Save exchange settings or Discard changes at the bottom of this section.' });
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" data-testid="drawer-edit">
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

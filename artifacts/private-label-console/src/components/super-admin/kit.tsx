import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/app/bits';

export const PAGE_SIZES = [10, 25, 50];
export const NOT_RECORDED = 'Not recorded';

export function usePaged<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  useEffect(() => { setPage(0); }, [resetKey, size]);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const cur = Math.min(page, pages - 1);
  const rows = useMemo(() => items.slice(cur * size, cur * size + size), [items, cur, size]);
  return { rows, page: cur, setPage, size, setSize, pages, total: items.length };
}

export function Pager({ p, id }: { p: { page: number; setPage: (n: number) => void; size: number; setSize: (n: number) => void; pages: number; total: number }; id: string }) {
  const from = p.total === 0 ? 0 : p.page * p.size + 1;
  const to = Math.min(p.total, (p.page + 1) * p.size);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-muted-foreground" data-testid={`pager-${id}`}>
      <span className="font-mono">{from}-{to} of {p.total}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">Rows
          <select aria-label="Rows per page" className="h-8 rounded-md border bg-background px-1.5 text-xs" value={p.size} onChange={(e) => p.setSize(Number(e.target.value))}>{PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <Button type="button" size="sm" variant="outline" disabled={p.page === 0} onClick={() => p.setPage(p.page - 1)} data-testid={`button-prev-${id}`}>Previous</Button>
        <Button type="button" size="sm" variant="outline" disabled={p.page >= p.pages - 1} onClick={() => p.setPage(p.page + 1)} data-testid={`button-next-${id}`}>Next</Button>
      </div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, id }: { value: string; onChange: (v: string) => void; placeholder: string; id: string }) {
  return (
    <div className="relative min-w-0 flex-1 md:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input data-testid={`input-search-${id}`} aria-label={placeholder} className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function FilterSelect({ value, onChange, label, options, id }: { value: string; onChange: (v: string) => void; label: string; options: [string, string][]; id: string }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">{label}
      <select data-testid={`select-filter-${id}`} className="h-10 rounded-md border bg-background px-2 text-sm text-foreground" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select></label>
  );
}

export function Chips({ value, onChange, options, id }: { value: string; onChange: (v: string) => void; options: [string, string][]; id: string }) {
  return (
    <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider" role="group" aria-label="Filter">
      {options.map(([v, l]) => (
        <button key={v} type="button" data-testid={`chip-${id}-${v}`} aria-pressed={value === v} onClick={() => onChange(v)}
          className={`rounded-full border px-3 py-1 ${value === v ? 'border-copper text-copper' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>))}
    </div>
  );
}

export interface Col<T> { key: string; header: string; cell: (x: T) => ReactNode; className?: string; primary?: boolean }

/** Tables on wide owner consoles; labelled cards on phones/tablets beside the sidebar. */
export function DataList<T>({ rows, cols, rowKey, href, onOpen, id, emptyTitle, emptyBody }: {
  rows: T[]; cols: Col<T>[]; rowKey: (x: T) => string; href?: (x: T) => string; onOpen?: (x: T) => void; id: string; emptyTitle: string; emptyBody: string;
}) {
  const [, nav] = useLocation();
  if (rows.length === 0) return <EmptyState title={emptyTitle} body={emptyBody} />;
  const go = (x: T) => { if (onOpen) onOpen(x); else if (href) nav(href(x)); };
  const live = !!(onOpen || href);
  const SKIP = 'a,button,input,select,textarea,label,summary,[role="dialog"],[role="menuitem"],[data-no-row]';
  const click = (x: T) => (e: React.MouseEvent<HTMLElement>) => {
    const hit = (e.target as HTMLElement).closest(SKIP);
    if (hit && hit !== e.currentTarget && e.currentTarget.contains(hit)) return;
    go(x);
  };
  const key = (x: T) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(x); }
  };
  const open = (x: T, child: ReactNode, cls: string) => (
    <div key={rowKey(x)} role={live ? 'link' : undefined} tabIndex={live ? 0 : undefined} className={cls} data-testid={`row-${id}-${rowKey(x)}`}
      onClick={live ? click(x) : undefined} onKeyDown={live ? key(x) : undefined}>{child}</div>);
  return (
    <>
      <div className="hidden max-w-full overflow-x-auto rounded-md border bg-card xl:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="border-b font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{cols.map((c) => <th key={c.key} scope="col" className={`px-3 py-2.5 font-normal ${c.className ?? ''}`}>{c.header}</th>)}</tr></thead>
          <tbody>{rows.map((x) => (
            <tr key={rowKey(x)} data-testid={`tr-${id}-${rowKey(x)}`} className={`border-b last:border-0 hover:bg-muted/40 ${onOpen || href ? 'cursor-pointer' : ''}`}
              tabIndex={live ? 0 : undefined} onKeyDown={live ? key(x) : undefined} onClick={live ? click(x) : undefined}>
              {cols.map((c) => <td key={c.key} className={`min-w-0 break-words px-3 py-3 align-middle ${c.className ?? ''}`}>{c.cell(x)}</td>)}
            </tr>))}</tbody>
        </table>
      </div>
      <div className="space-y-2 xl:hidden">
        {rows.map((x) => open(x, (
          <dl className="space-y-1.5">
            {cols.map((c) => (
              <div key={c.key} className={c.primary ? '' : 'flex items-baseline justify-between gap-3 text-xs'}>
                {!c.primary && <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.header}</dt>}
                <dd className={`min-w-0 [overflow-wrap:anywhere] ${c.primary ? 'font-display text-xl' : 'text-right'}`}>{c.cell(x)}</dd>
              </div>))}
          </dl>), 'block w-full cursor-pointer rounded-md border bg-card p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper'))}
      </div>
    </>
  );
}

/** Review -> Confirm -> Apply. Writes only happen from the final step. */
export function ReviewDialog({ open, onClose, title, rows, onApply, pending, error, destructive, applyLabel = 'Apply change' }: {
  open: boolean; onClose: () => void; title: string; rows: [string, ReactNode][]; onApply: () => void; pending: boolean; error?: string | null; destructive?: boolean; applyLabel?: string;
}) {
  const [step, setStep] = useState<'review' | 'confirm'>('review');
  useEffect(() => { if (open) setStep('review'); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !pending) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" data-testid="dialog-review">
        <DialogHeader>
          <DialogTitle>{step === 'review' ? `Review: ${title}` : `Confirm: ${title}`}</DialogTitle>
          <DialogDescription>{step === 'review' ? 'Check the change below. Nothing is saved yet.' : 'Confirm to apply these values. Success or failure will be reported.'}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-md border text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 p-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 text-right [overflow-wrap:anywhere]">{v}</dd></div>)}</dl>
        {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="text-review-error">{error}</p>}
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" disabled={pending} onClick={onClose} data-testid="button-review-cancel">Cancel</Button>
          {step === 'review'
            ? <Button type="button" onClick={() => setStep('confirm')} data-testid="button-review-continue">Continue</Button>
            : <Button type="button" variant={destructive ? 'destructive' : 'default'} disabled={pending} onClick={onApply} data-testid="button-review-apply">{pending ? 'Applying' : applyLabel}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between gap-4 py-2 text-sm"><dt className="shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 text-right [overflow-wrap:anywhere]">{v ?? NOT_RECORDED}</dd></div>;
}
export function Panel({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <section className="rounded-md border bg-card p-5"><h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-copper">{title}</h2>{note && <p className="mb-3 text-xs text-muted-foreground">{note}</p>}{children}</section>;
}
export function Pill({ children, tone }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  const c = tone === 'ok' ? 'bg-primary text-primary-foreground' : tone === 'bad' ? 'bg-destructive text-destructive-foreground' : tone === 'warn' ? 'border border-copper/50 text-copper' : 'bg-secondary text-secondary-foreground';
  return <span className={`inline-block whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c}`}>{children}</span>;
}

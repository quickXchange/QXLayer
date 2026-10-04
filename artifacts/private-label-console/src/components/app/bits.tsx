import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { label } from '@/lib/format';

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="rise mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper">{eyebrow}</p>
        <h1 className="font-display mt-1 text-4xl leading-none [overflow-wrap:anywhere]">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'active' ? 'bg-primary text-primary-foreground' : status === 'suspended' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground';
  return <Badge data-testid={`status-${status}`} className={`${tone} rounded-sm font-mono text-[10px] uppercase tracking-wider shadow-none`}>{status}</Badge>;
}
export const stepLabel = (s: string) => label(s);
export function ErrorState({ onRetry, what }: { onRetry: () => void; what: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-14 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="text-sm">Could not load {what}.</p>
      <Button data-testid="button-retry" variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-card/60 py-16 text-center">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-full border font-display text-xl text-copper">0</div>
      <p className="font-display text-2xl">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}
export function SandboxNote() {
  return <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Sandbox only · no live finance</p>;
}

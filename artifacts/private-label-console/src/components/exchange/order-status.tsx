const TONE: Record<string, string> = { pending: 'bg-amber-100 text-amber-900', processing: 'bg-sky-100 text-sky-900', completed: 'bg-emerald-100 text-emerald-900', cancelled: 'bg-muted text-muted-foreground', failed: 'bg-destructive/10 text-destructive' };
export const NEXT: Record<string, string[]> = { pending: ['processing', 'cancelled', 'failed'], processing: ['completed', 'cancelled', 'failed'] };
export function OrderStatus({ status }: { status: string }) {
  return <span data-testid={`status-order-${status}`} className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONE[status] ?? 'bg-muted'}`}>{status}</span>;
}

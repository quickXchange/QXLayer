const TONE: Record<string, string> = { pending: 'bg-[#f5d98a] text-[#4a3500] dark:bg-[#4a3a0e] dark:text-[#f8e3a3]', processing: 'bg-primary/15 text-foreground', completed: 'bg-[#bfeccf] text-[#0b3d22] dark:bg-[#12402a] dark:text-[#b4efcb]', cancelled: 'bg-muted text-muted-foreground', failed: 'bg-destructive/10 text-destructive' };
export const NEXT: Record<string, string[]> = { pending: ['processing', 'cancelled', 'failed'], processing: ['completed', 'cancelled', 'failed'] };
export function OrderStatus({ status }: { status: string }) {
  return <span data-testid={`status-order-${status}`} className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONE[status] ?? 'bg-muted'}`}>{status}</span>;
}

import type { ReactNode } from 'react';

/** Shared platform metric surface; values and permissions remain page-owned. */
export function MetricCard({ label, value, id }: { label: string; value: ReactNode; id: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-card p-5">
      <p className="break-words font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p data-testid={id} className="font-display mt-2 text-4xl">{value}</p>
    </div>
  );
}
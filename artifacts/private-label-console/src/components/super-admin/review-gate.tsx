import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { ReviewDialog } from './kit';

type Gate = (title: string, run: () => void, rows?: [string, ReactNode][]) => void;
const Ctx = createContext<Gate | null>(null);

/** Owner-only. Mounted on super-admin pages; elsewhere writes run directly (customer behaviour unchanged). */
export function OwnerReviewProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<{ title: string; run: () => void; rows: [string, ReactNode][] } | null>(null);
  const gate = useCallback<Gate>((title, run, rows) => setP({ title, run, rows: rows ?? [] }), []);
  return (
    <Ctx.Provider value={gate}>
      {children}
      <ReviewDialog open={!!p} onClose={() => setP(null)} title={p?.title ?? ''} pending={false}
        rows={[['Change', p?.title ?? ''], ...(p?.rows ?? []), ['Result', 'Success or failure is reported in a notification']]}
        onApply={() => { const r = p?.run; setP(null); r?.(); }} />
    </Ctx.Provider>
  );
}

export function useReviewGate(): Gate {
  const g = useContext(Ctx);
  return useCallback<Gate>((t, run, rows) => { if (g) g(t, run, rows); else run(); }, [g]);
}

/** Wrap a mutate function so it goes through Review, Confirm, Apply when an owner gate is mounted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGatedMutate<F extends (...a: any[]) => void>(fn: F, title: string): F {
  const gate = useReviewGate();
  return ((...a: Parameters<F>) => {
    const input = a[0] as Record<string, unknown> | undefined;
    const rows: [string, ReactNode][] = input ? Object.entries(input).map(([key, value]) => [
      key === 'data' ? 'Proposed values' : key,
      <pre className="max-h-48 max-w-full overflow-y-auto whitespace-pre-wrap break-words text-left text-xs">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</pre>,
    ]) : [];
    gate(title, () => fn(...a), rows);
  }) as F;
}

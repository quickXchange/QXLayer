import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Panel, Pill } from '@/components/super-admin/kit';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { useToast } from '@/hooks/use-toast';
import { useCommerceApi, type OpMethod } from './api';

type Draft = { id?: string; name: string; kind: 'bank_transfer' | 'manual'; instructions: string; enabled: boolean; approved: boolean };
const blank: Draft = { name: '', kind: 'bank_transfer', instructions: '', enabled: false, approved: false };
const KEY = ['phase1-methods'];

export function MethodsPanel() {
  const call = useCommerceApi(); const qc = useQueryClient(); const { toast } = useToast(); const [d, setD] = useState<Draft | null>(null);
  const q = useQuery({ queryKey: KEY, retry: 1, queryFn: async () => { const x = await call<unknown>('GET', '/operator/phase1/methods'); if (!Array.isArray(x)) throw new Error('Unexpected methods response'); return x as OpMethod[]; } });
  const ok = (t: string) => { qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: ['phase1-catalog'] }); toast({ title: t }); };
  const save = useMutation({ mutationFn: (x: Draft) => { const b = { name: x.name.trim(), kind: x.kind, currency: 'EUR', instructions: x.instructions.trim(), enabled: x.enabled, approved: x.approved }; return x.id ? call('PUT', `/operator/phase1/methods/${x.id}`, b) : call('POST', '/operator/phase1/methods', b); }, onSuccess: () => { setD(null); ok('Payment method saved'); } });
  const del = useMutation({ mutationFn: (id: string) => call('DELETE', `/operator/phase1/methods/${id}`), onSuccess: () => ok('Payment method deleted') });
  const live = (m: OpMethod) => m.enabled && m.approved;
  const complete = !!d && d.name.trim() && d.instructions.trim();
  return <Panel title="Payment methods" note="Customers can only purchase through methods that are both enabled and approved. Provisional or disabled methods never appear at checkout.">
    {q.isLoading ? <ListSkeleton rows={2} /> : q.isError ? <ErrorState what="payment methods" onRetry={() => q.refetch()} /> : <div className="space-y-3">
      {q.data && q.data.length === 0 && <EmptyState title="No payment methods" body="Without an approved, enabled method no customer can purchase." />}
      {q.data?.map((m) => <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm" data-testid={`method-${m.id}`}>
        <div className="min-w-0"><p className="font-medium [overflow-wrap:anywhere]">{m.name} <span className="font-mono text-xs text-muted-foreground">{m.kind} {m.currency}</span></p>
          <div className="mt-1 flex gap-1"><Pill tone={m.approved ? 'ok' : 'warn'}>{m.approved ? 'approved' : 'provisional'}</Pill><Pill>{m.enabled ? 'enabled' : 'disabled'}</Pill>{!live(m) && <Pill tone="bad">cannot purchase</Pill>}</div></div>
        <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { save.reset(); setD({ id: m.id, name: m.name, kind: m.kind === 'manual' ? 'manual' : 'bank_transfer', instructions: m.instructions, enabled: m.enabled, approved: m.approved }); }}>Edit</Button>
          <Button size="sm" variant="ghost" disabled={del.isPending} onClick={() => { if (window.confirm(`Delete ${m.name}?`)) del.mutate(m.id); }}>Delete</Button></div></div>)}
      {del.isError && <p role="alert" className="text-sm text-destructive">{(del.error as Error).message}</p>}
      {d ? <form className="space-y-2 rounded-md border p-3" onSubmit={(e) => { e.preventDefault(); if (complete) save.mutate(d); }}>
        <Input aria-label="Method name" placeholder="Method name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} data-testid="input-method-name" />
        <select aria-label="Kind" className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as Draft['kind'] })}><option value="bank_transfer">Bank transfer</option><option value="manual">Manual</option></select>
        <Textarea aria-label="Instructions" placeholder="Payment instructions shown to the customer (account details, reference rules)" value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value })} data-testid="input-method-instructions" />
        <p className="text-xs text-muted-foreground">Currency: EUR</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} />Enabled</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.approved} disabled={!complete} onChange={(e) => setD({ ...d, approved: e.target.checked })} data-testid="check-method-approved" />I approve this populated method for real purchases</label>
        {(!d.enabled || !d.approved) && <p className="text-xs text-copper">Customers cannot purchase with this method until it is both enabled and approved.</p>}
        {save.isError && <p role="alert" className="text-sm text-destructive">{(save.error as Error).message}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={!complete || save.isPending} data-testid="button-save-method">{save.isPending ? 'Saving' : 'Save method'}</Button><Button type="button" variant="ghost" onClick={() => setD(null)}>Cancel</Button></div></form>
        : <Button variant="outline" onClick={() => { save.reset(); setD(blank); }} data-testid="button-new-method">Add payment method</Button>}
    </div>}
  </Panel>;
}

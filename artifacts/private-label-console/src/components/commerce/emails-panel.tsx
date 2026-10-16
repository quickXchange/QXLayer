import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Panel, Pill } from '@/components/super-admin/kit';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { useToast } from '@/hooks/use-toast';
import { useCommerceApi, type EmailRow } from './api';

const KEY = ['phase1-emails'];
export function EmailsPanel() {
  const call = useCommerceApi(); const qc = useQueryClient(); const { toast } = useToast();
  const q = useQuery({ queryKey: KEY, retry: 1, refetchInterval: (s) => (s.state.data?.some((e) => e.status === 'pending') && s.state.dataUpdateCount < 30 ? 15000 : false),
    queryFn: async () => { const x = await call<unknown>('GET', '/operator/phase1/emails'); if (!Array.isArray(x)) throw new Error('Unexpected email response'); return x as EmailRow[]; } });
  const retry = useMutation({ mutationFn: (id: string) => call('POST', `/operator/phase1/emails/${id}/retry`), onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: 'Retry queued' }); } });
  return <Panel title="Email delivery" note="Transactional emails and their delivery state.">
    {q.isLoading ? <ListSkeleton rows={2} /> : q.isError ? <ErrorState what="email delivery" onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState title="No emails yet" body="Queued and sent emails appear here." /> : <div className="space-y-2">
      {q.data.map((e) => <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm" data-testid={`email-${e.id}`}>
        <div className="min-w-0"><p className="[overflow-wrap:anywhere]">{e.subject}</p><p className="text-xs text-muted-foreground">{e.attempts} attempt(s), {new Date(e.sentAt ?? e.createdAt).toLocaleString()}</p>{e.lastError && <p className="text-xs text-destructive [overflow-wrap:anywhere]">{e.lastError}</p>}</div>
        <div className="flex items-center gap-2"><Pill tone={e.status === 'sent' ? 'ok' : e.status === 'failed' ? 'bad' : 'warn'}>{e.status}</Pill>{e.status === 'failed' && <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(e.id)}>Retry</Button>}</div></div>)}
      {retry.isError && <p role="alert" className="text-sm text-destructive">{(retry.error as Error).message}</p>}</div>}
  </Panel>;
}

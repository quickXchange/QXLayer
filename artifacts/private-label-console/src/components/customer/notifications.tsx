import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCustomerNotifications, getGetCustomerNotificationsQueryKey, useMarkCustomerNotificationsRead } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/app/bits';
import { usePrincipal } from '@/lib/principal';
import { currentDemoIntent, customerQueriesAllowed } from '@/lib/demo-query-policy';
import { useToast } from '@/hooks/use-toast';
import { statusText } from '@/lib/wl';
import { stamp } from '@/lib/format';

export function NotificationsPanel() {
  const p = usePrincipal(); const qc = useQueryClient(); const { toast } = useToast();
  const q = useGetCustomerNotifications({ query: { queryKey: getGetCustomerNotificationsQueryKey(), enabled: customerQueriesAllowed(p.demo, currentDemoIntent()), refetchInterval: 15000, refetchOnWindowFocus: true } });
  const mark = useMarkCustomerNotificationsRead();
  const items = q.data?.items ?? []; const unread = items.filter((n) => !n.readAt);
  const send = (ids: string[]) => mark.mutate({ data: { ids } }, {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getGetCustomerNotificationsQueryKey() }); },
    onError: (e) => toast({ title: 'Could not mark as read', description: (e as Error).message, variant: 'destructive' }),
  });
  return (
    <section className="mt-8 rounded-md border bg-card p-5" aria-labelledby="notif-h" data-testid="panel-notifications">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="notif-h" className="font-display text-2xl">Order updates {q.data && <span className="font-mono text-xs text-copper" data-testid="text-unread-count">{q.data.unreadCount} unread</span>}</h2>
        <Button size="sm" variant="outline" data-testid="button-mark-all-read" disabled={unread.length === 0 || mark.isPending} onClick={() => send(unread.map((n) => n.id))}>{mark.isPending ? 'Marking' : 'Mark displayed as read'}</Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">In-app notifications only, refreshed every 15 seconds. Email is not connected, so nothing is sent outside this page.</p>
      <div className="mt-4" aria-live="polite">
        {q.isLoading ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : q.isError ? <ErrorState what="notifications" onRetry={() => q.refetch()} /> : items.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No updates yet. Messages from our team about your orders appear here.</p> : (
          <ul className="divide-y rounded-md border">{items.map((n) => (
            <li key={n.id} data-testid={`row-notification-${n.id}`} className={`flex flex-wrap items-start justify-between gap-3 p-3 text-sm ${n.readAt ? '' : 'bg-muted/40'}`}>
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{n.readAt ? 'Read' : 'Unread'} · {stamp(n.createdAt)}{n.status ? ` · ${statusText(n.status)}` : ''}</p>
                <p className={n.readAt ? '' : 'font-medium'}>{n.message}</p>
                <Link href={`/account/orders/${n.requestId}`} className="text-xs text-copper underline" data-testid={`link-notification-order-${n.id}`}>Order {n.orderReference}</Link>
              </div>
              {!n.readAt && <Button size="sm" variant="ghost" disabled={mark.isPending} data-testid={`button-read-${n.id}`} onClick={() => send([n.id])}>Mark read</Button>}
            </li>))}</ul>)}
      </div>
    </section>
  );
}

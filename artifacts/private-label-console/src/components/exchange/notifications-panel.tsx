import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetExchangeNotifications, getGetExchangeNotificationsQueryKey, useSaveExchangeNotificationPreferences } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { stamp, label } from '@/lib/format';
import { ExSection } from './manage';

export function NotificationsPanel({ tenantId, locked = false }: { tenantId: string; locked?: boolean }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const key = getGetExchangeNotificationsQueryKey(tenantId);
  const q = useGetExchangeNotifications(tenantId, { query: { queryKey: key, refetchInterval: 20000 } });
  const save = useSaveExchangeNotificationPreferences();
  const [created, setCreated] = useState(true); const [changed, setChanged] = useState(true);
  const p = q.data?.preferences;
  useEffect(() => { if (p) { setCreated(p.orderCreated); setChanged(p.orderStatusChanged); } }, [p?.orderCreated, p?.orderStatusChanged]);
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError || !q.data) return <ErrorState what="notifications" onRetry={() => q.refetch()} />;
  const readThrough = q.data.readThrough ? new Date(q.data.readThrough).getTime() : 0;
  const events = q.data.events;
  const unread = events.filter((e) => new Date(e.createdAt).getTime() > readThrough).length;
  const run = (markAllRead: boolean) => save.mutate({ tenantId, data: { orderCreated: created, orderStatusChanged: changed, ...(markAllRead ? { markAllRead: true } : {}) } }, {
    onSuccess: (inbox) => { qc.setQueryData(key, inbox); toast({ title: markAllRead ? 'Marked all read' : 'Notification preferences saved' }); },
    onError: (e) => toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' }),
  });
  const dirty = !!p && (p.orderCreated !== created || p.orderStatusChanged !== changed);
  return (
    <ExSection n="N" title="Notifications" note="In-app inbox of recent order events, shared by everyone on this tenant." footer={<span className="mr-auto text-xs text-muted-foreground">{unread} unread of {events.length} latest events. Refreshes every 20 seconds.</span>}>
      <p className="rounded-md border p-3 text-sm text-muted-foreground" data-testid="text-notifications-note">In-app only. This page does not configure or send email, Telegram or any other outbound message. The read marker is shared, not per user.</p>
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between text-sm">Order created<Switch disabled={locked} checked={created} onCheckedChange={setCreated} aria-label="Order created" data-testid="switch-notify-created" /></div>
        <div className="flex items-center justify-between text-sm">Order status changed<Switch disabled={locked} checked={changed} onCheckedChange={setChanged} aria-label="Order status changed" data-testid="switch-notify-status" /></div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button disabled={locked || !dirty || save.isPending} onClick={() => run(false)} data-testid="button-save-notifications">{save.isPending ? 'Saving' : 'Save preferences'}</Button>
          <Button variant="outline" disabled={locked || unread === 0 || save.isPending} onClick={() => run(true)} data-testid="button-mark-all-read">Mark all read</Button>
          <Button variant="ghost" disabled={q.isFetching} onClick={() => q.refetch()}>Refresh</Button>
        </div>
        {locked && <p className="text-xs text-muted-foreground">Read only. Changing notification settings needs configuration permission.</p>}
      </div>
      {events.length === 0 ? <EmptyState title="No notifications" body="Order events that match your preferences appear here." /> : <ol className="relative ml-2 border-l">{events.map((e) => {
        const isNew = new Date(e.createdAt).getTime() > readThrough;
        return <li key={e.id} data-testid={`row-notification-${e.id}`} className="relative py-3 pl-6"><span className={`absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full ${isNew ? 'bg-copper' : 'bg-muted-foreground/40'}`} />
          <p className="break-words text-sm">{e.description}{isNew && <span className="ml-2 font-mono text-[10px] uppercase text-copper">New</span>}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{label(e.eventType)} · {stamp(e.createdAt)}</p></li>; })}</ol>}
      <Link href={`/clients/${tenantId}/exchange/orders`} className="text-sm text-copper hover:underline" data-testid="link-notifications-orders">Go to Orders</Link>
    </ExSection>
  );
}

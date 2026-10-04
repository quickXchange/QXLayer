import { useListPlatformActivity } from '@workspace/api-client-react';
import { PageHeader, ErrorState, ListSkeleton, EmptyState } from '@/components/app/bits';
import { stamp, label } from '@/lib/format';
import { Link } from 'wouter';

export default function Activity() {
  const q = useListPlatformActivity();
  return (
    <>
      <PageHeader eyebrow="Audit" title="Activity" />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState what="activity" onRetry={() => q.refetch()} /> :
        !q.data?.length ? <EmptyState title="No activity" body="Administrative actions will appear here as they happen." /> : (
        <ol className="relative ml-2 space-y-0 border-l">
          {q.data.map((a) => (
            <li key={a.id} data-testid={`row-activity-${a.id}`} className="relative py-3 pl-6">
              <span className="absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full bg-copper" />
              <p className="text-sm">{a.description}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{label(a.eventType)} · {stamp(a.createdAt)}{a.tenantId && <> · <Link href={`/clients/${a.tenantId}`} className="text-copper hover:underline">client</Link></>}</p>
            </li>
          ))}
        </ol>)}
    </>
  );
}

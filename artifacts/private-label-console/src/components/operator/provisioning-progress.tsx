import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetWhiteLabelProvisioning, getGetWhiteLabelProvisioningQueryKey, useRetryWhiteLabelProvisioning, getGetWhiteLabelRequestQueryKey, getListWhiteLabelRequestsQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/app/bits';
import { WebsitePreviewAction } from '@/components/app/website-preview-action';
import { useInvalidateTenant } from '@/lib/invalidate';
import { useToast } from '@/hooks/use-toast';
import { errMsg } from '@/lib/wl';
import { useGatedMutate } from '@/components/super-admin/review-gate';

export function ProvisioningProgress({ requestId, closed, onDone }: { requestId: string; closed: boolean; onDone?: () => void }) {
  const key = getGetWhiteLabelProvisioningQueryKey(requestId);
  const q = useGetWhiteLabelProvisioning(requestId, { query: { queryKey: key, refetchInterval: 10000, refetchOnWindowFocus: true } });
  const m = useRetryWhiteLabelProvisioning();
  const resume = useGatedMutate(m.mutate, 'Resume provisioning; a ready website will be activated in Sandbox and delivered to the original customer account');
  const qc = useQueryClient(); const inv = useInvalidateTenant(); const { toast } = useToast();
  const d = q.data;
  if (q.isLoading) return <Skeleton className="h-24" />;
  if (q.isError || !d) return <ErrorState what="provisioning progress" onRetry={() => q.refetch()} />;
  const tone = (s: string) => s === 'complete' ? 'text-foreground' : s === 'failed' ? 'text-destructive' : 'text-muted-foreground';
  const retry = () => resume({ requestId }, {
    onSuccess: (r) => {
      qc.setQueryData(key, r); qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: getGetWhiteLabelRequestQueryKey(requestId) }); qc.invalidateQueries({ queryKey: getListWhiteLabelRequestsQueryKey() });
      qc.invalidateQueries(); inv(d.tenantId ?? undefined); onDone?.();
      toast({ title: 'Provisioning retried' });
    },
    onError: (e) => toast({ title: 'Retry failed', description: errMsg(e), variant: 'destructive' }),
  });
  return (
    <div className="space-y-3 rounded-md border p-3" data-testid="panel-provisioning">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Provisioning</p>
        <p className="text-sm" data-testid="text-provisioning-count">{d.completedCount} of {d.totalCount} steps complete</p>
      </div>
      <ol className="divide-y rounded-md border">
        {d.steps.map((s) => (
          <li key={s.key} className="p-3 text-sm" data-testid={`step-${s.key}`}>
            <div className="flex items-center justify-between gap-3"><span className={tone(s.state)}>{s.label}</span><span className={`font-mono text-[10px] uppercase ${tone(s.state)}`}>{s.state}</span></div>
            {s.message && <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{s.message}</p>}
          </li>))}
      </ol>
      {d.lastError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm [overflow-wrap:anywhere]" data-testid="text-provisioning-error">Last error: {d.lastError}</p>}
      {d.blockers.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="list-provisioning-blockers">{d.blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
      {d.canRetry && <p className="text-xs text-muted-foreground">Retry preserves saved settings. If setup is ready, it activates the Sandbox website and delivers access to the original customer account.</p>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {closed ? <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Order closed, read only</span>
          : d.canRetry ? <Button size="sm" data-testid="button-retry-provisioning" disabled={m.isPending} onClick={retry}>{m.isPending ? 'Retrying' : 'Retry provisioning'}</Button> : null}
        {d.tenantId && <Link href={`/clients/${d.tenantId}`} className="text-copper underline" data-testid="link-provisioning-tenant">Open tenant setup</Link>}
        {d.tenantId && !closed && <WebsitePreviewAction tenantId={d.tenantId} />}
        {d.websiteUrl && <a href={d.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-copper underline" data-testid="link-delivered-website">Delivered website</a>}
        {d.adminPanelUrl && (d.adminPanelUrl.startsWith('/') ? <Link href={d.adminPanelUrl} className="text-copper underline">Admin Panel</Link> : <a href={d.adminPanelUrl} target="_blank" rel="noopener noreferrer" className="text-copper underline">Admin Panel</a>)}
      </div>
    </div>
  );
}

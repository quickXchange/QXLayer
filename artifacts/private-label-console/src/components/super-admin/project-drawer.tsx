import { useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useSetTenantSuspension, type TenantSummary, type WhiteLabelRequest } from '@workspace/api-client-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, stepLabel } from '@/components/app/bits';
import { WebsitePreviewAction } from '@/components/app/website-preview-action';
import { useToast } from '@/hooks/use-toast';
import { stamp } from '@/lib/format';
import { errMsg, orderRef } from '@/lib/wl';
import { Field, ReviewDialog, NOT_RECORDED } from './kit';
import { publicSiteHref, type PmProject } from './platform';

export function ProjectDrawer({ t, project, order, customerLabel, onClose }: { t: TenantSummary | null; project?: PmProject; order?: WhiteLabelRequest; customerLabel: string; onClose: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast(); const m = useSetTenantSuspension();
  const [reason, setReason] = useState(''); const [rev, setRev] = useState(false); const [err, setErr] = useState<string | null>(null);
  if (!t) return <Sheet open={false}><SheetContent /></Sheet>;
  const suspended = t.status === 'suspended';
  const delivered = order?.status === 'delivered';
  const apply = () => { setErr(null); m.mutate({ tenantId: t.id, data: { suspended: !suspended, reason: reason.trim() } }, { onSuccess: () => { setRev(false); setReason(''); qc.invalidateQueries(); toast({ title: suspended ? 'Project reactivated' : 'Project suspended' }); }, onError: (e) => { setErr(errMsg(e)); toast({ title: 'Change failed', description: errMsg(e), variant: 'destructive' }); } }); };
  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-testid="drawer-project">
        <SheetHeader><SheetTitle className="font-display text-2xl">{t.brandName}</SheetTitle><SheetDescription>{t.slug}</SheetDescription></SheetHeader>
        <dl className="mt-4 divide-y">
          <Field k="Customer" v={customerLabel} /><Field k="Status" v={<StatusBadge status={t.status} />} /><Field k="Domain" v={t.domain ?? 'No domain'} />
          <Field k="Plan" v={project?.planName ?? 'No plan assigned'} /><Field k="Add-ons" v={project ? String(project.addonIds.length) : NOT_RECORDED} />
          <Field k="Features" v={`${t.enabledModules.length} modules`} /><Field k="Provision step" v={stepLabel(t.provisioningStep)} /><Field k="Created" v={stamp(t.createdAt)} />
          <Field k="Order" v={order ? <Link href={`/white-label-requests/${order.id}`} className="text-copper underline">{orderRef(order)}</Link> : 'No linked order'} />
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button asChild size="sm"><Link href={`/clients/${t.id}/exchange`} data-testid="link-open-admin">Open Customer Admin</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href={`/clients/${t.id}?tab=config`} data-testid="link-configure">Configure</Link></Button>
          {order && <Button asChild size="sm" variant="outline"><Link href={`/white-label-requests/${order.id}`}>View Order</Link></Button>}
          {import.meta.env.DEV && ['draft', 'active'].includes(t.status) && !['rejected', 'cancelled', 'delivered'].includes(order?.status ?? '') && <WebsitePreviewAction tenantId={t.id} />}
          {t.status === 'active' && delivered && <Button asChild size="sm" variant="outline"><a href={publicSiteHref(t.slug)} target="_blank" rel="noopener noreferrer" data-testid="link-public-site">Open Website</a></Button>}
        </div>
        <div className="mt-6 space-y-2 border-t pt-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-copper">{suspended ? 'Reactivate' : 'Suspend'}</p>
          <Input data-testid="input-drawer-reason" placeholder="Reason (required, recorded in activity)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" variant={suspended ? 'outline' : 'destructive'} disabled={reason.trim().length < 2} onClick={() => { setErr(null); setRev(true); }} data-testid="button-drawer-suspend">{suspended ? 'Reactivate' : 'Suspend'}</Button>
        </div>
        <ReviewDialog open={rev} onClose={() => setRev(false)} title={suspended ? 'reactivate project' : 'suspend project'} pending={m.isPending} error={err} destructive={!suspended} onApply={apply}
          rows={[['Project', t.brandName], ['Change', suspended ? 'Suspended to unsuspended' : `${t.status} to suspended`], ['Reason', reason.trim()]]} />
      </SheetContent>
    </Sheet>
  );
}

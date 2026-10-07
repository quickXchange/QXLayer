import { useState } from 'react';
import { Link } from 'wouter';
import { useListTenants, useReviewWhiteLabelRequest, type WhiteLabelStatus } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { WebsitePreviewAction } from '@/components/app/website-preview-action';
import { useToast } from '@/hooks/use-toast';
import { errMsg, statusText, type WlOrder } from '@/lib/wl';
import { ReviewDialog } from './kit';
import { savedPricingReady, validTargets } from './lifecycle';

interface Act { key: string; label: string; to: string; destructive?: boolean; blocked?: string }

export function orderActions(o: WlOrder): Act[] {
  const t = validTargets(o.status); const out: Act[] = []; const ready = savedPricingReady(o);
  if (o.status === 'new') out.push({ key: 'review', label: 'Review', to: 'reviewing' });
  if (t.includes('approved')) out.push({ key: 'approve', label: 'Approve', to: 'approved', blocked: ready ? undefined : 'Save plan, recurring and setup prices first (Review & pricing tab)' });
  if (t.includes('ready') && ['waiting_for_client', 'approved', 'in_setup', 'customization'].includes(o.status)) out.push({ key: 'ready', label: 'Mark Ready', to: 'ready', blocked: ready ? undefined : 'Save final pricing first' });
  if (t.includes('rejected')) out.push({ key: 'reject', label: 'Reject', to: 'rejected', destructive: true });
  if (t.includes('cancelled')) out.push({ key: 'cancel', label: 'Cancel', to: 'cancelled', destructive: true });
  return out;
}

/** Quick lifecycle actions. Same review mutation and payload as the Review form, built from saved order values. */
export function OrderActions({ o, onDone, onDeliver }: { o: WlOrder; onDone: () => void; onDeliver?: () => void }) {
  const m = useReviewWhiteLabelRequest(); const tq = useListTenants(); const { toast } = useToast();
  const tenant = o.tenantId ? (tq.data ?? []).find((t) => t.id === o.tenantId) : undefined;
  const previewOk = !!tenant && ['draft', 'active'].includes(tenant.status) && ['approved', 'in_setup', 'customization', 'ready'].includes(o.status);
  const setupOpen = !!o.tenantId && ['approved', 'in_setup', 'customization', 'ready'].includes(o.status);
  const [act, setAct] = useState<Act | null>(null); const [err, setErr] = useState<string | null>(null);
  const acts = orderActions(o);
  const canDeliver = ['approved', 'in_setup', 'customization', 'ready'].includes(o.status);
  const apply = () => {
    if (!act) return; setErr(null);
    m.mutate({ requestId: o.id, data: {
      status: act.to as WhiteLabelStatus, monthlyPrice: o.monthlyPrice ?? null, setupPrice: o.setupPrice ?? null, currency: (o.currency ?? 'USD').toUpperCase(), operatorNote: '',
      customizationPrice: o.customizationPrice ?? null, approvedPlanId: (o.approvedPlan?.id ?? o.requestedPlan?.id) || null,
      approvedAddonIds: (o.approvedAddons ?? o.requestedAddons ?? []).map((a) => a.id), customDesignDecision: o.customDesignDecision ?? 'pending',
    } }, { onSuccess: () => { setAct(null); toast({ title: `${act.label} applied` }); onDone(); }, onError: (e) => { setErr(errMsg(e)); toast({ title: `${act.label} failed`, description: errMsg(e), variant: 'destructive' }); } });
  };
  return (
    <div className="space-y-2" data-testid="order-actions">
      <div className="flex flex-wrap gap-2">
        {acts.map((a) => (
          <Button key={a.key} type="button" size="sm" variant={a.destructive ? 'outline' : a.key === 'approve' ? 'default' : 'secondary'} disabled={!!a.blocked} title={a.blocked} data-testid={`button-action-${a.key}`} onClick={() => { setErr(null); setAct(a); }}>{a.label}</Button>))}
        {setupOpen && <Button asChild size="sm" variant="secondary"><Link href={`/clients/${o.tenantId}?tab=config`} data-testid="link-action-configure">Configure project</Link></Button>}
        {setupOpen && <Button asChild size="sm" variant="secondary"><Link href={`/clients/${o.tenantId}`} data-testid="link-action-setup">Setup and activation</Link></Button>}
        {canDeliver && !o.tenantId && onDeliver && <Button type="button" size="sm" variant="secondary" onClick={onDeliver} data-testid="button-action-deliver">Deliver (legacy order)</Button>}
        {previewOk && import.meta.env.DEV && o.tenantId && <WebsitePreviewAction tenantId={o.tenantId} />}
        <Button asChild size="sm" variant="outline"><Link href="/provisioning" data-testid="link-action-provision">Provisioning status</Link></Button>
      </div>
      <p className="text-xs text-muted-foreground">Approving a native order prepares its draft project automatically. Configure opens that project; it does not change the order status. Pick any valid status in the Review and pricing tab.</p>
      {acts.some((a) => a.blocked) && <p className="text-xs text-muted-foreground">{acts.find((a) => a.blocked)?.blocked}.</p>}
      {acts.length === 0 && !canDeliver && <p className="text-xs text-muted-foreground">No lifecycle actions: this order is {statusText(o.status)}.</p>}
      <ReviewDialog open={!!act} onClose={() => setAct(null)} title={act?.label ?? ''} pending={m.isPending} error={err} destructive={act?.destructive} applyLabel="Confirm and apply" onApply={apply}
        rows={[['Order', o.projectName], ['Status', `${statusText(o.status)} to ${act ? statusText(act.to) : ''}`], ['Prices', 'Unchanged, as last saved']]} />
    </div>
  );
}

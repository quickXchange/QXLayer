import type { ReactNode } from 'react';
import type { Plan } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { AttachmentList } from '@/components/customer/attachments';
import { stamp } from '@/lib/format';
import { cash, orderRef, periodPrice, statusText, sumNum, unknownCount, type PricedAddon, type WlEvent, type WlOrder } from '@/lib/wl';

export const OrderStatus = ({ status }: { status: string }) => <Badge data-testid={`status-${status}`} className={`w-fit shrink-0 rounded-sm font-mono text-[10px] uppercase tracking-wider shadow-none ${['delivered', 'provisioned', 'ready', 'approved'].includes(status) ? 'bg-primary text-primary-foreground' : ['rejected', 'cancelled'].includes(status) ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}>{statusText(status)}</Badge>;

const Sec = ({ t, children }: { t: string; children: ReactNode }) => <section className="rounded-md border bg-card p-5"><h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-copper">{t}</h2>{children}</section>;
const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><dt className="min-w-0 flex-1 break-words text-muted-foreground">{k}</dt><dd className="min-w-0 flex-[1.4] whitespace-pre-wrap text-right [overflow-wrap:anywhere]">{v}</dd></div>;

function Selection({ plan, addons, period, cur }: { plan?: Plan | null; addons?: PricedAddon[]; period: string; cur?: string | null }) {
  if (!plan) return <p className="text-sm text-muted-foreground">No plan recorded</p>;
  const p = plan as Plan & { currency?: string }; const ad = addons ?? []; const c = p.currency ?? cur;
  return <dl className="divide-y"><Row k={`${p.name} (${period})`} v={cash(periodPrice(p, period), c)} />{ad.map((a) => <Row key={a.id} k={`Add-on: ${a.name}`} v={cash(periodPrice(a, period), a.currency ?? c)} />)}
    <Row k="Known recurring subtotal" v={<>{cash(sumNum([periodPrice(p, period), ...ad.map((a) => periodPrice(a, period))]), c)}{unknownCount([periodPrice(p, period), ...ad.map((a) => periodPrice(a, period))]) > 0 && <span className="block text-xs text-muted-foreground">+ items requiring review</span>}</>} /><Row k="Known setup subtotal" v={<>{cash(sumNum([p.setupFee, ...ad.map((a) => a.setupFee)]), c)}{unknownCount([p.setupFee, ...ad.map((a) => a.setupFee)]) > 0 && <span className="block text-xs text-muted-foreground">+ fees requiring review</span>}</>} /></dl>;
}

export function OrderSummary({ o }: { o: WlOrder }) {
  const d = o.design; const period = o.billingPeriod ?? 'monthly'; const att = o.attachments ?? [];
  const byId = (id: string | null | undefined) => att.filter((a) => a.id === id);
  const sameApproved = o.approvedPlan && o.requestedPlan && o.approvedPlan.id === o.requestedPlan.id && (o.approvedAddons ?? []).map((a) => a.id).sort().join() === (o.requestedAddons ?? []).map((a) => a.id).sort().join();
  return (
    <div className="space-y-4">
      <Sec t="Project"><dl className="divide-y"><Row k="Reference" v={orderRef(o)} /><Row k="Project" v={o.projectName} /><Row k="Brand" v={o.brandName} /><Row k="Company" v={o.companyName || '-'} /><Row k="Preferred domain" v={o.preferredDomain || '-'} /><Row k="Features" v={<span className="capitalize">{o.actions.join(', ')}</span>} /><Row k="Submitted" v={stamp(o.createdAt)} /></dl></Sec>
      <Sec t="Design">{d ? <>
        <dl className="divide-y"><Row k="Type" v={d.type === 'custom' ? 'Custom design (paid review)' : 'Standard (Exchange master)'} />
          <Row k="Colors" v={<span className="flex flex-wrap justify-end gap-2">{[d.primaryColor, d.accentColor].map((color, i) => <span key={i} className="inline-flex items-center gap-1.5"><i className="h-4 w-4 shrink-0 rounded border" style={{ background: color }} />{color}</span>)}</span>} /><Row k="Theme" v={<span className="capitalize">{d.themePreference}</span>} />
          {d.type === 'custom' && <><Row k="Style" v={d.styleName} /><Row k="Description" v={d.description || '-'} /><Row k="Reference site" v={d.referenceWebsiteUrl ? <a className="text-copper underline" href={d.referenceWebsiteUrl} target="_blank" rel="noreferrer noopener">{d.referenceWebsiteUrl}</a> : '-'} /><Row k="Notes" v={d.notes || '-'} /><Row k="Custom design decision" v={<span className="capitalize">{o.customDesignDecision ?? 'pending'}</span>} /></>}</dl>
        <div className="mt-3"><AttachmentList items={[...byId(d.logoAttachmentId), ...byId(d.faviconAttachmentId), ...d.referenceAttachmentIds.flatMap(byId)]} /></div></> : <p className="text-sm text-muted-foreground">No design details recorded</p>}</Sec>
      <Sec t="Requested plan and add-ons"><Selection plan={o.requestedPlan} addons={o.requestedAddons} period={period} cur={o.currency} /></Sec>
      {o.approvedPlan && !sameApproved && <Sec t="Operator-approved plan and add-ons"><Selection plan={o.approvedPlan} addons={o.approvedAddons} period={period} cur={o.currency} /></Sec>}
      <Sec t="Quotation"><dl className="divide-y"><Row k="Recurring" v={o.monthlyPrice == null ? 'Quote pending' : `${cash(o.monthlyPrice, o.currency)} / ${period === 'yearly' ? 'year' : 'month'}`} /><Row k="Setup" v={o.setupPrice == null ? 'Pending' : cash(o.setupPrice, o.currency)} /><Row k="Customization" v={o.customizationPrice != null ? cash(o.customizationPrice, o.currency) : d?.type === 'custom' ? 'Requires review' : 'No customization requested'} /></dl>
        <p className="mt-2 text-xs text-muted-foreground">Estimates until finalized by a Super Admin. No charge is made.</p></Sec>
      <Sec t="Requirements"><p className="mb-3 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{o.details || 'No details provided'}</p><AttachmentList items={att.filter((a) => a.category === 'requirement')} /></Sec>
    </div>
  );
}

export function Timeline({ history, empty, customerUserId }: { history: WlEvent[]; empty?: string; customerUserId?: string }) {
  if (!history.length) return <p className="text-sm text-muted-foreground">{empty ?? 'No activity yet'}</p>;
  return <ol className="space-y-3 border-l pl-4">{[...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((e) => (
    <li key={e.id} className="relative min-w-0 text-sm [overflow-wrap:anywhere]"><span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${e.kind === 'status' ? 'bg-primary' : 'bg-copper'}`} />
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stamp(e.createdAt)} · {e.author === customerUserId ? 'Customer' : 'QXLayer team'}{e.visibility === 'internal' ? ' · Internal only' : ''}</p>
      <p className="whitespace-pre-wrap">{e.kind === 'status' && e.status ? <b>{statusText(e.status)}{e.message ? ': ' : ''}</b> : null}{e.message}</p></li>))}</ol>;
}

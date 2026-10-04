import { useState } from 'react';
import { Link } from 'wouter';
import { useAddWhiteLabelNote, useProvisionWhiteLabelRequest, useListTenants } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { errMsg, type WlOrder } from '@/lib/wl';

export function NoteForm({ id, onDone }: { id: string; onDone: () => void }) {
  const add = useAddWhiteLabelNote(); const [msg, setMsg] = useState(''); const [vis, setVis] = useState<'internal' | 'customer'>('internal'); const [err, setErr] = useState<string | null>(null);
  const go = () => { setErr(null); add.mutate({ requestId: id, data: { message: msg.trim(), visibility: vis } }, { onSuccess: () => { setMsg(''); onDone(); }, onError: (e) => setErr(errMsg(e)) }); };
  return (
    <div className="space-y-2">
      <Textarea data-testid="input-note" aria-label="New note" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={3000} placeholder="Append a note. Existing notes are never overwritten." />
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Visibility" className="h-9 rounded-md border bg-background px-2 text-sm" value={vis} onChange={(e) => setVis(e.target.value as typeof vis)}><option value="internal">Internal only</option><option value="customer">Visible to customer</option></select>
        <Button type="button" size="sm" data-testid="button-add-note" disabled={!msg.trim() || add.isPending} onClick={go}>{add.isPending ? 'Adding' : 'Add note'}</Button>
      </div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    </div>
  );
}

export function Delivery({ o, onDone }: { o: WlOrder; onDone: () => void }) {
  const tenants = useListTenants(); const prov = useProvisionWhiteLabelRequest(); const [tid, setTid] = useState(''); const [err, setErr] = useState<string | null>(null);
  const ready = (tenants.data ?? []).filter((t) => t.status === 'active' && t.exchangeProvisioned === true);
  if (!['approved', 'in_setup', 'customization', 'ready'].includes(o.status)) return o.tenantId ? <Link href={`/clients/${o.tenantId}`} className="text-sm text-copper underline">Delivered tenant detail</Link> : null;
  return (
    <div className="space-y-3">
      <p className="text-sm">Prepare the tenant manually (plan and add-ons must match the reviewed order), then deliver it. Nothing is granted before delivery.</p>
      <div className="flex flex-wrap gap-3 text-sm text-copper"><Link href="/clients/new" className="underline" data-testid="link-prepare-new">Prepare new client</Link>{ready.map((t) => <Link key={t.id} href={`/clients/${t.id}`} className="underline">{t.brandName}</Link>)}</div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">Active prepared tenant<select data-testid="select-tenant" value={tid} onChange={(e) => setTid(e.target.value)} className="block h-10 min-w-56 rounded-md border bg-background px-2 text-sm"><option value="">Select tenant</option>{ready.map((t) => <option key={t.id} value={t.id}>{t.brandName} ({t.slug})</option>)}</select></label>
        <Button data-testid="button-deliver" disabled={!tid || prov.isPending} onClick={() => { setErr(null); prov.mutate({ requestId: o.id, data: { tenantId: tid } }, { onSuccess: onDone, onError: (e) => setErr(errMsg(e)) }); }}>{prov.isPending ? 'Delivering' : 'Deliver to customer'}</Button>
      </div>
      {err && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">{err}</p>}
    </div>
  );
}

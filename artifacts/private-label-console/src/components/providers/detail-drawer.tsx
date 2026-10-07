import { useState, type ReactNode } from 'react';
import type { ProviderActivity, ProviderAssignment, ProviderDefinition } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Field, Pill } from '@/components/super-admin/kit';
import { label } from '@/lib/format';
import { DefinitionForm } from './definition-form';
import { AssignmentsSection } from './assignments-section';
import { ACCESS_LABEL, Note, StatusPill } from './shared';

const TABS = ['Overview', 'Capabilities', 'Configuration', 'Credentials', 'Assignments', 'Health', 'Activity'] as const;
const when = (s: string) => new Date(s).toLocaleString();

function Schema({ rows, note }: { rows: ProviderDefinition['configurationSchema']; note: string }) {
  return (
    <div className="space-y-3"><Note>{note}</Note>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No fields defined.</p> : (
        <div className="max-w-full overflow-x-auto rounded-md border"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="border-b font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2 font-normal">Key</th><th className="px-3 py-2 font-normal">Label</th><th className="px-3 py-2 font-normal">Type</th><th className="px-3 py-2 font-normal">Required</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.key} className="border-b last:border-0"><td className="px-3 py-2 font-mono text-xs">{r.key}</td><td className="px-3 py-2">{r.label}</td><td className="px-3 py-2">{r.type}</td><td className="px-3 py-2">{r.required ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div>)}
    </div>
  );
}

export function DetailDrawer({ p, assignments, activity, categories, capabilities, canEdit, onClose, onSaved }: { p: ProviderDefinition | 'new' | null; assignments: ProviderAssignment[]; activity: ProviderActivity[]; categories: string[]; capabilities: string[]; canEdit: boolean; onClose: () => void; onSaved: (p: ProviderDefinition) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [edit, setEdit] = useState(false);
  const isNew = p === 'new';
  const def = p && p !== 'new' ? p : undefined;
  const close = () => { setEdit(false); setTab('Overview'); onClose(); };
  const mine = def ? assignments.filter((a) => a.providerId === def.id) : [];
  const acts = def ? activity.filter((a) => a.summary.includes(def.id) || a.summary.includes(def.name)) : [];
  let body: ReactNode = null;
  if (isNew || edit) body = <DefinitionForm key={def?.id ?? 'new'} provider={def} knownCategories={categories} knownCaps={capabilities} onDone={(x) => { setEdit(false); onSaved(x); if (isNew) setTab('Overview'); }} />;
  else if (def) {
    if (tab === 'Overview') body = <dl className="divide-y"><Field k="Provider ID" v={<span className="font-mono text-xs">{def.id}</span>} /><Field k="Status" v={<StatusPill p={def} />} /><Field k="Description" v={def.description || 'None'} /><Field k="Categories" v={def.categories.join(', ')} /><Field k="Services" v={def.services.join(', ') || 'None'} /><Field k="Environments" v={def.environments.join(', ')} /><Field k="Access" v={ACCESS_LABEL[def.access]} />{def.entitlementKey && <Field k="Entitlement" v={<span className="font-mono text-xs">{def.entitlementKey}</span>} />}<Field k="Tenant configurable" v={def.tenantConfigurable ? 'Yes' : 'No'} /><Field k="Assigned tenants" v={def.assignedTenants} /><Field k="Created" v={when(def.createdAt)} /><Field k="Updated" v={when(def.updatedAt)} /></dl>;
    else if (tab === 'Capabilities') body = <div className="flex flex-wrap gap-2">{def.capabilities.map((c) => <Pill key={c}>{label(c)}</Pill>)}</div>;
    else if (tab === 'Configuration') body = <Schema rows={def.configurationSchema} note="Non-secret fields a tenant can fill in. Scalar values only." />;
    else if (tab === 'Credentials') body = <Schema rows={def.credentialSchema} note="Definition only. Credential storage is unavailable, so no credential values are accepted or shown anywhere." />;
    else if (tab === 'Assignments') body = <AssignmentsSection p={def} list={mine} locked={!canEdit} />;
    else if (tab === 'Health') body = <div className="space-y-3"><dl className="divide-y"><Field k="Connection" v={<Pill>Not connected</Pill>} /><Field k="Implementation" v="Not implemented" /><Field k="Credential storage" v={def.credentialStorageAvailable ? 'Available' : 'Unavailable'} /></dl><Note>No live checks run. There is no adapter, so there is no health data to report. A provider can only become connected once a real adapter passes a connection verification.</Note></div>;
    else body = acts.length === 0 ? <Note>No recorded activity for this provider.</Note> : <ul className="divide-y text-sm">{acts.map((a) => <li key={a.id} className="py-2"><span className="block">{a.summary}</span><span className="font-mono text-xs text-muted-foreground">{a.action} / {when(a.createdAt)}</span></li>)}</ul>;
  }
  return (
    <Sheet open={p !== null} onOpenChange={(v) => { if (!v) close(); }}>
      <SheetContent className="w-full max-w-none overflow-y-auto sm:max-w-2xl" data-testid="drawer-provider">
        <SheetHeader><SheetTitle className="font-display text-2xl">{isNew ? 'New provider' : def?.name ?? 'Provider'}</SheetTitle><SheetDescription>{isNew ? 'Add a catalog entry. Catalog metadata only.' : 'Catalog metadata. Not connected, no credentials stored.'}</SheetDescription></SheetHeader>
        {def && !edit && (<>
          <div className="mt-4 flex flex-wrap items-center gap-1 border-b pb-2" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} type="button" data-testid={`tab-provider-${t.toLowerCase()}`} onClick={() => setTab(t)} className={`rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wider ${tab === t ? 'bg-secondary text-copper' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>)}
            {canEdit && <Button size="sm" variant="outline" className="ml-auto" data-testid="button-edit-provider" onClick={() => setEdit(true)}>Edit</Button>}</div></>)}
        {def && edit && <Button size="sm" variant="ghost" className="mt-3" onClick={() => setEdit(false)}>Cancel editing</Button>}
        <div className="mt-4">{body}</div>
      </SheetContent>
    </Sheet>
  );
}

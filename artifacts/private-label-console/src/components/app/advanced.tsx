import { useEffect, useState } from 'react';
import {
  useUpdateTenantWebsiteSettings, useListTenantResources, getListTenantResourcesQueryKey, useCreateTenantResource, useRemoveTenantResource,
  type Tenant, type WebsiteSettings, type SiteLink, type ResourceItem,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useInvalidateTenant } from '@/lib/invalidate';
import { ErrorState } from './bits';
import { Section } from './sections';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const FONTS = ['system', 'inter', 'manrope', 'dm-sans', 'space-grotesk'] as const;
const DEFAULT: WebsiteSettings = { secondaryColor: '#8a7f6c', faviconUrl: null, fontKey: 'system', heroTitle: '', heroSubtitle: '', supportEmail: null, supportUrl: null, supportDetails: '', socialLinks: [], footerText: '', privacyContent: '', termsContent: '' };

type NavItem = NonNullable<WebsiteSettings['navigation']>[number];
const NAV_DEFAULT: NavItem[] = [['exchange', 'Exchange'], ['payments', 'Payments'], ['telegram', 'Telegram'], ['how', 'How it works'], ['developers', 'Developers'], ['about', 'About'], ['faq', 'FAQ']].map(([key, label]) => ({ key, label, visible: true })) as NavItem[];
const fullNav = (n?: NavItem[]) => { const have = n ?? []; return [...have, ...NAV_DEFAULT.filter((d) => !have.some((h) => h.key === d.key))]; };

export function WebsiteSection({ tenant, readOnly, onSaved, saveLabel }: { tenant: Tenant; readOnly?: boolean; onSaved?: () => void; saveLabel?: string }) {
  const m = useUpdateTenantWebsiteSettings();
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  const base = tenant.websiteSettings ?? { ...DEFAULT, heroTitle: tenant.brandName };
  const [f, setF] = useState(base);
  const [nav, setNav] = useState<NavItem[]>(fullNav(base.navigation));
  const [navTouched, setNavTouched] = useState(false);
  useEffect(() => { setNav(fullNav(tenant.websiteSettings?.navigation)); setNavTouched(false); }, [tenant.websiteSettings]);
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= nav.length) return; const c = [...nav]; [c[i], c[j]] = [c[j], c[i]]; setNav(c); setNavTouched(true); };
  const editNav = (i: number, p: Partial<NavItem>) => { setNav(nav.map((x, j) => (j === i ? { ...x, ...p } : x))); setNavTouched(true); };
  useEffect(() => setF(tenant.websiteSettings ?? { ...DEFAULT, heroTitle: tenant.brandName }), [tenant.websiteSettings, tenant.brandName]);
  const set = <K extends keyof WebsiteSettings>(k: K, v: WebsiteSettings[K]) => setF((s) => ({ ...s, [k]: v }));
  const nul = (v: string) => (v.trim() === '' ? null : v.trim());
  const err = !HEX.test(f.secondaryColor) ? 'Secondary color must be #RRGGBB' : f.heroTitle.trim().length < 2 ? 'Hero title needs 2+ characters'
    : f.socialLinks.some((l) => !l.label.trim() || !/^https?:\/\//.test(l.url)) ? 'Social links need a label and an http(s) URL' : f.socialLinks.length > 12 ? 'At most 12 social links' : nav.some((x) => !x.label.trim() || x.label.length > 60) ? 'Navigation labels need 1 to 60 characters' : '';
  const links = f.socialLinks;
  const setLink = (i: number, p: Partial<SiteLink>) => set('socialLinks', links.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate({ tenantId: tenant.id, data: { ...f, heroTitle: f.heroTitle.trim(), ...(navTouched ? { navigation: nav.map((x) => ({ ...x, label: x.label.trim() })) } : {}) } }, { onSuccess: () => { inv(tenant.id); toast({ title: 'Website settings saved' }); onSaved?.(); }, onError: (er) => toast({ title: 'Save failed', description: (er as Error).message, variant: 'destructive' }) }); }}>
      <Section n="06" title="Website" note="Advanced settings for the shared branded site. Custom domains stay unverified and are never served."
        footer={<>{err && !readOnly && <span className="mr-auto text-sm text-destructive">{err}</span>}{readOnly ? <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Read only</span> : <Button data-testid="button-save-website" disabled={!!err || m.isPending}>{m.isPending ? 'Saving' : saveLabel ?? 'Save website'}</Button>}</>}>
        <fieldset disabled={readOnly} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2"><Label>Website name</Label><Input data-testid="input-websiteName" value={f.websiteName ?? tenant.brandName} onChange={(e) => set('websiteName', e.target.value)} minLength={2} maxLength={120} /></div>
          <div className="space-y-1.5"><Label>Secondary color</Label>
            <div className="flex gap-2"><input type="color" aria-label="Secondary color" value={HEX.test(f.secondaryColor) ? f.secondaryColor : '#000000'} onChange={(e) => set('secondaryColor', e.target.value)} className="h-9 w-11 rounded border bg-transparent p-0.5" />
              <Input data-testid="input-secondaryColor" className="font-mono" value={f.secondaryColor} onChange={(e) => set('secondaryColor', e.target.value)} /></div></div>
          <div className="space-y-1.5"><Label>Font</Label>
            <Select value={f.fontKey} onValueChange={(v) => set('fontKey', v as WebsiteSettings['fontKey'])}><SelectTrigger data-testid="select-fontKey"><SelectValue /></SelectTrigger>
              <SelectContent>{FONTS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Favicon URL</Label><Input data-testid="input-faviconUrl" placeholder="https://" value={f.faviconUrl ?? ''} onChange={(e) => set('faviconUrl', nul(e.target.value))} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Hero title</Label><Input data-testid="input-heroTitle" value={f.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Hero subtitle</Label><Textarea data-testid="input-heroSubtitle" value={f.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Support email</Label><Input data-testid="input-supportEmail" value={f.supportEmail ?? ''} onChange={(e) => set('supportEmail', nul(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Support URL</Label><Input data-testid="input-supportUrl" value={f.supportUrl ?? ''} onChange={(e) => set('supportUrl', nul(e.target.value))} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Support details</Label><Textarea value={f.supportDetails} onChange={(e) => set('supportDetails', e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Social links</Label>
            {links.map((l, i) => (
              <div key={i} className="flex gap-2"><Input placeholder="Label" className="w-40" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} /><Input placeholder="https://" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                <Button type="button" variant="ghost" onClick={() => set('socialLinks', links.filter((_, j) => j !== i))}>Remove</Button></div>))}
            {!readOnly && links.length < 12 && <Button type="button" variant="outline" size="sm" data-testid="button-add-link" onClick={() => set('socialLinks', [...links, { label: '', url: '' }])}>Add link</Button>}</div>
          <div className="space-y-2 md:col-span-2"><Label>Navigation</Label>
            <p className="text-xs text-muted-foreground">Order, rename or hide links. Only links the client is entitled to appear on the site; hiding never grants access.</p>
            {nav.map((x, i) => (
              <div key={x.key} className="flex items-center gap-2" data-testid={`row-nav-${x.key}`}>
                <span className="w-20 font-mono text-[11px] uppercase text-muted-foreground">{x.key}</span>
                <Input data-testid={`input-nav-label-${x.key}`} value={x.label} onChange={(e) => editNav(i, { label: e.target.value })} />
                <Switch data-testid={`switch-nav-${x.key}`} checked={x.visible} onCheckedChange={(v) => editNav(i, { visible: v })} aria-label={`Show ${x.key}`} />
                <Button type="button" variant="ghost" size="sm" data-testid={`button-nav-up-${x.key}`} disabled={i === 0} onClick={() => move(i, -1)}>Up</Button>
                <Button type="button" variant="ghost" size="sm" data-testid={`button-nav-down-${x.key}`} disabled={i === nav.length - 1} onClick={() => move(i, 1)}>Down</Button>
              </div>))}</div>
          <div className="space-y-1.5 md:col-span-2"><Label>Footer text</Label><Textarea value={f.footerText} onChange={(e) => set('footerText', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Privacy policy</Label><Textarea className="min-h-32" value={f.privacyContent} onChange={(e) => set('privacyContent', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Terms of service</Label><Textarea className="min-h-32" value={f.termsContent} onChange={(e) => set('termsContent', e.target.value)} /></div>
        </fieldset>
      </Section>
    </form>
  );
}

type RType = 'staff' | 'api_keys' | 'webhooks' | 'payment_methods';
const META: Record<RType, { title: string; note: string; ref?: string; refHint: string }> = {
  staff: { title: 'Staff', note: 'People who can sign in to this tenant.', ref: 'Clerk user ID', refHint: 'user_...' },
  api_keys: { title: 'API keys', note: 'Sandbox keys with empty scopes. A key is shown once at creation. No API key execution exists yet.', refHint: '' },
  webhooks: { title: 'Webhooks', note: 'Endpoints are stored only. Webhook delivery is unavailable.', ref: 'HTTPS endpoint URL', refHint: 'https://' },
  payment_methods: { title: 'Payment methods', note: 'Labels only. Payment execution is unavailable.', refHint: '' },
};

function ResourcePanel({ tenantId, type, readOnly, canCreate }: { tenantId: string; type: RType; readOnly?: boolean; canCreate: boolean }) {
  const meta = META[type];
  const q = useListTenantResources(tenantId, type);
  const create = useCreateTenantResource();
  const remove = useRemoveTenantResource();
  const qc = useQueryClient();
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [ref, setRef] = useState('');
  const [issued, setIssued] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: getListTenantResourcesQueryKey(tenantId, type) }); inv(tenantId); };
  const fail = (e: unknown) => toast({ title: 'Action failed', description: (e as Error).message, variant: 'destructive' });
  const r = ref.trim();
  const refBad = type === 'webhooks' ? !/^https:\/\/\S+$/.test(r) : false;
  const bad = label.trim().length < 2 || refBad || (type === 'staff' && r.length < 2);
  const items: ResourceItem[] = q.data ?? [];
  return (
    <div className="space-y-3" data-testid={`panel-${type}`}>
      <p className="text-sm text-muted-foreground">{meta.note}</p>
      {issued && (
        <div className="rounded-md border border-copper/50 bg-copper/10 p-3" data-testid="text-issued-key">
          <p className="text-sm font-medium">Copy this key now. It will not be shown again.</p>
          <code className="mt-1 block break-all font-mono text-xs">{issued}</code>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setIssued(null)}>I have stored it</Button>
        </div>)}
      {q.isLoading ? <Skeleton className="h-16" /> : q.isError ? <ErrorState what={meta.title.toLowerCase()} onRetry={() => q.refetch()} /> : items.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No {meta.title.toLowerCase()} yet.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3" data-testid={`row-${type}-${it.id}`}>
              <div className="min-w-0 flex-1"><p className="text-sm">{it.label}</p>{it.reference && <p className="truncate font-mono text-[11px] text-muted-foreground">{it.reference}</p>}</div>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{it.status}</span>
              {!readOnly && <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate({ tenantId, resourceType: type, resourceId: it.id }, { onSuccess: () => { refresh(); toast({ title: 'Removed' }); }, onError: fail })}>Remove</Button>}
            </div>))}
        </div>)}
      {!readOnly && !canCreate && <p className="text-sm text-muted-foreground" data-testid={`text-locked-${type}`}>Not permitted by effective rights or limit reached. Existing items can still be removed.</p>}
      {!readOnly && canCreate && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); create.mutate({ tenantId, resourceType: type, data: { label: label.trim(), reference: meta.ref ? r || null : null } }, { onSuccess: (res) => { setLabel(''); setRef(''); if (res.issuedKey) setIssued(res.issuedKey); refresh(); toast({ title: 'Added' }); }, onError: fail }); }}>
          <Input data-testid={`input-${type}-label`} className="w-52" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          {meta.ref && <Input data-testid={`input-${type}-ref`} className="w-72 font-mono" placeholder={`${meta.ref} (${meta.refHint})`} value={ref} onChange={(e) => setRef(e.target.value)} />}
          <Button data-testid={`button-add-${type}`} disabled={bad || create.isPending}>{create.isPending ? 'Adding' : type === 'api_keys' ? 'Issue key' : 'Add'}</Button>
        </form>)}
    </div>
  );
}

export function ResourcesSection({ tenantId, allowed, readOnly, showAll, staffReadOnly }: { tenantId: string; allowed: Record<RType, boolean>; readOnly?: boolean; showAll?: boolean; staffReadOnly?: boolean }) {
  const types = (Object.keys(META) as RType[]).filter((t) => showAll || allowed[t]);
  if (types.length === 0) return null;
  return (
    <div className="space-y-6">
      {types.map((t, i) => (
        <Section key={t} n={`R${i + 1}`} title={META[t].title} note="Available through your effective rights." footer={<span />}>
          <ResourcePanel tenantId={tenantId} type={t} readOnly={readOnly || (t === 'staff' && !!staffReadOnly)} canCreate={allowed[t]} />
        </Section>))}
    </div>
  );
}

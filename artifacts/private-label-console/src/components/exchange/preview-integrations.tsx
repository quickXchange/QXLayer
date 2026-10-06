import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetExchangePreviewIntegrations, useSaveExchangePreviewIntegrations, getGetExchangePreviewIntegrationsQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCan, usePrincipal } from '@/lib/principal';
import { ErrorState } from '@/components/app/bits';
import { Section } from '@/components/app/sections';

type Mod = 'api' | 'webhooks' | 'rpc';
type EventKey = 'order.created' | 'order.status_changed' | 'quote.created';
type Settings = { api: { enabled: boolean; label: string; baseUrl: string }; webhooks: { enabled: boolean; label: string; endpointUrl: string; events: EventKey[] }; rpc: { enabled: boolean; label: string; endpointUrl: string; networkName: string } };
const EMPTY: Settings = { api: { enabled: false, label: '', baseUrl: '' }, webhooks: { enabled: false, label: '', endpointUrl: '', events: [] }, rpc: { enabled: false, label: '', endpointUrl: '', networkName: '' } };
const EVENTS: EventKey[] = ['order.created', 'order.status_changed', 'quote.created'];
const TITLES: Record<Mod, string> = { api: 'API Preview', webhooks: 'Webhooks Preview', rpc: 'RPC Preview' };

function urlError(v: string): string {
  const s = v.trim();
  if (!s) return 'Required while active';
  let u: URL;
  try { u = new URL(s); } catch { return 'Enter a valid URL'; }
  if (u.protocol !== 'https:') return 'Must start with https://';
  if (u.username || u.password) return 'No username or password in the URL';
  if (u.search || u.hash || /[?#]/.test(s)) return 'No query string or fragment';
  return '';
}
function urlShapeError(v: string) { return v.trim() ? urlError(v) : ''; }

function errorsFor(s: Settings, m: Mod): Record<string, string> {
  const e: Record<string, string> = {};
  const chk = (k: string, v: string, on: boolean) => { const r = on ? urlError(v) : urlShapeError(v); if (r) e[k] = r; };
  if (m === 'api') chk('api', s.api.baseUrl, s.api.enabled);
  if (m === 'webhooks') { chk('webhooks', s.webhooks.endpointUrl, s.webhooks.enabled); if (s.webhooks.enabled && !s.webhooks.events.length) e.events = 'Pick at least one event'; }
  if (m === 'rpc') { chk('rpc', s.rpc.endpointUrl, s.rpc.enabled); if (s.rpc.enabled && !s.rpc.networkName.trim()) e.network = 'Required while active'; }
  return e;
}

export function PreviewIntegrations({ tenantId, sub, subLoading, suspended, module }: { tenantId: string; sub?: { status?: string; features?: Record<string, boolean | undefined> }; subLoading?: boolean; suspended?: boolean; module?: Mod }) {
  const can = useCan(tenantId);
  const principal = usePrincipal();
  const qc = useQueryClient();
  const { toast } = useToast();
  const available = sub?.features?.crypto_exchange === true;
  const q = useGetExchangePreviewIntegrations(tenantId, { query: { enabled: !!tenantId && available, queryKey: getGetExchangePreviewIntegrationsQueryKey(tenantId), staleTime: 30_000, refetchOnWindowFocus: true } });
  const save = useSaveExchangePreviewIntegrations();
  const [f, setF] = useState<Settings>(EMPTY);
  const lastServer = useRef<{ tenantId: string; settings: Settings } | null>(null);
  const serverSettings = q.data?.settings;
  const key = JSON.stringify(serverSettings ?? null);
  useEffect(() => {
    if (!serverSettings) return;
    const next = JSON.parse(key) as Settings;
    const previous = lastServer.current?.tenantId === tenantId ? lastServer.current.settings : null;
    lastServer.current = { tenantId, settings: next };
    // Refresh untouched modules, but never replace an in-progress customer edit.
    setF(draft => previous ? {
      api: JSON.stringify(draft.api) === JSON.stringify(previous.api) ? next.api : draft.api,
      webhooks: JSON.stringify(draft.webhooks) === JSON.stringify(previous.webhooks) ? next.webhooks : draft.webhooks,
      rpc: JSON.stringify(draft.rpc) === JSON.stringify(previous.rpc) ? next.rpc : draft.rpc,
    } : next);
  }, [key, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const mods: Mod[] = module ? [module] : ['api', 'webhooks', 'rpc'];
  const title = module ? TITLES[module] : 'Optional API, Webhooks and RPC previews';
  const note = 'Configuration only. Nothing is called or executed, and none of this is required for release.';
  const wrap = (body: React.ReactNode, footer: React.ReactNode = <span />) => <Section n="X" title={title} note={note} footer={footer}>{body}</Section>;

  if (subLoading || !sub) return wrap(<Skeleton className="h-24" />);
  if (!available) return wrap(<p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="text-preview-unavailable">The crypto exchange feature is not part of this plan, so these optional previews are unavailable.</p>);
  if (q.isLoading) return wrap(<Skeleton className="h-32" />);
  if (q.isError || !serverSettings) return wrap(<ErrorState what="preview settings" onRetry={() => q.refetch()} />);

  const ro = principal.demo || suspended || sub.status === 'suspended' || sub.status === 'unassigned' || !can.has('configuration.manage');
  const allErrs = mods.reduce((a, m) => ({ ...a, ...errorsFor(f, m) }), {} as Record<string, string>);
  const changed = mods.filter(m => JSON.stringify(f[m]) !== JSON.stringify(serverSettings[m]));
  const dirty = changed.length > 0;
  const bad = Object.keys(allErrs).length > 0;
  const upd = <M extends Mod>(m: M, p: Partial<Settings[M]>) => setF((s) => ({ ...s, [m]: { ...s[m], ...p } }));
  const submit = () => {
    const data = module ? { ...(JSON.parse(key) as Settings), [module]: f[module] } : f;
    save.mutate({ tenantId, data: { settings: data, modules: changed } }, {
      onSuccess: (res) => {
        const before = lastServer.current?.settings;
        setF(draft => before ? {
          api: changed.includes('api') || JSON.stringify(draft.api) === JSON.stringify(before.api) ? res.settings.api : draft.api,
          webhooks: changed.includes('webhooks') || JSON.stringify(draft.webhooks) === JSON.stringify(before.webhooks) ? res.settings.webhooks : draft.webhooks,
          rpc: changed.includes('rpc') || JSON.stringify(draft.rpc) === JSON.stringify(before.rpc) ? res.settings.rpc : draft.rpc,
        } : res.settings);
        lastServer.current = { tenantId, settings: res.settings };
        qc.setQueryData(getGetExchangePreviewIntegrationsQueryKey(tenantId), res);
        toast({ title: 'Preview settings saved' });
      },
      onError: (e) => toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' }),
    });
  };
  const field = (id: string, label: string, value: string, onChange: (v: string) => void, ph: string, err?: string) => (
    <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>
      <Input id={id} data-testid={`input-${id}`} value={value} placeholder={ph} maxLength={id.endsWith('-url') ? 2048 : 120} disabled={ro || save.isPending} autoComplete="off" aria-invalid={!!err} onChange={(e) => onChange(e.target.value)} />
      {err && !ro && <p className="text-xs text-destructive">{err}</p>}</div>);
  const head = (m: Mod, on: boolean) => (
    <div className="flex items-center justify-between gap-3">
      <div><p className="font-display text-xl">{TITLES[m]}</p><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground" data-testid={`text-state-${m}`}>{on ? 'Preview active, not executing' : 'Off'}</p></div>
      <Switch aria-label={`${TITLES[m]} active`} data-testid={`switch-${m}`} checked={on} disabled={ro || save.isPending} onCheckedChange={(v) => upd(m, { enabled: v } as Partial<Settings[typeof m]>)} /></div>);

  return wrap(
    <div className="space-y-6" data-testid="panel-preview-integrations">
      <p className="text-sm text-muted-foreground">Sandbox only. Store non-secret metadata only: never enter keys, tokens or passwords. HTTPS URLs without credentials, query or fragment.</p>
      {mods.map((m) => (
        <fieldset key={m} className="space-y-3 rounded-md border p-4" disabled={ro || save.isPending}>
          {head(m, f[m].enabled)}
          {field(`${m}-label`, 'Label', f[m].label, (v) => upd(m, { label: v } as Partial<Settings[typeof m]>), 'Internal name')}
          {m === 'api' && field('api-url', 'Base URL', f.api.baseUrl, (v) => upd('api', { baseUrl: v }), 'https://api.example.com/v1', allErrs.api)}
          {m === 'webhooks' && <>
            {field('webhooks-url', 'Endpoint URL', f.webhooks.endpointUrl, (v) => upd('webhooks', { endpointUrl: v }), 'https://example.com/hooks', allErrs.webhooks)}
            <div className="space-y-1.5"><Label>Events</Label>
              {EVENTS.map((ev) => <label key={ev} className="flex items-center gap-2 text-sm"><Checkbox disabled={ro} data-testid={`check-${ev}`} checked={f.webhooks.events.includes(ev)} onCheckedChange={(c) => upd('webhooks', { events: c ? [...f.webhooks.events.filter((x) => x !== ev), ev] : f.webhooks.events.filter((x) => x !== ev) })} /><span className="font-mono text-xs">{ev}</span></label>)}
              {allErrs.events && !ro && <p className="text-xs text-destructive">{allErrs.events}</p>}</div></>}
          {m === 'rpc' && <>
            {field('rpc-url', 'Endpoint URL', f.rpc.endpointUrl, (v) => upd('rpc', { endpointUrl: v }), 'https://rpc.example.com', allErrs.rpc)}
            {field('rpc-network', 'Network name', f.rpc.networkName, (v) => upd('rpc', { networkName: v }), 'e.g. Sepolia', allErrs.network)}</>}
        </fieldset>))}
      {ro && <p className="text-sm text-muted-foreground" data-testid="text-preview-readonly">Read only. Changing these needs configuration access on an active, assigned tenant.</p>}
      {!ro && <div className="flex items-center gap-3"><Button data-testid="button-save-preview" disabled={bad || !dirty || save.isPending} onClick={submit}>{save.isPending ? 'Saving' : 'Save preview settings'}</Button>
        <span className="text-sm text-muted-foreground">{dirty ? 'Unsaved changes' : 'Saved'}</span></div>}
    </div>);
}

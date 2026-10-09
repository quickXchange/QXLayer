import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import {
  useGetTenantIntegrationRuntime, getGetTenantIntegrationRuntimeQueryKey, getGetIntegrationRuntimeQueryKey,
  useSaveTenantIntegration, useTestTenantIntegration, useRegisterTenantTelegramWebhook,
  type IntegrationRuntimeBundle, type TenantIntegrationRuntime,
} from '@workspace/api-client-react';
import { ErrorState, ListSkeleton } from '@/components/app/bits';
import { Panel, Pill } from '@/components/super-admin/kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { usePrincipal } from '@/lib/principal';

type Def = IntegrationRuntimeBundle['definitions'][number];
const MENU = ['swap', 'buy', 'sell', 'convert', 'tracking'] as const;
const KINDS = ['evm', 'tron', 'solana', 'bitcoin'] as const;
const MGMT: [string, string][] = [['super_admin', 'Super Admin only'], ['customer', 'Customer only'], ['both', 'Super Admin and customer']];
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const errMsg = (e: unknown) => { const x = e as { data?: { error?: string; message?: string }; message?: string } | null; return x?.data?.error ?? x?.data?.message ?? x?.message ?? 'The request failed.'; };
const when = (v: unknown) => { const d = typeof v === 'string' ? new Date(v) : null; return d && !isNaN(+d) ? d.toLocaleString() : 'Never checked'; };

interface Form {
  enabled: boolean; mgmt: string; manualFallback: boolean; healthMonitoring: boolean; assignments: string[];
  customerActivation: boolean; quoteActions: string[];
  adapterKind: string; networkCode: string; chainId: string; confirmationsRequired: string;
  botUsername: string; webhookUrl: string; miniAppUrl: string; logoUrl: string; primaryColor: string; backgroundColor: string; menu: string[];
}
function fromConn(c?: TenantIntegrationRuntime): Form {
  const s = (c?.settings ?? {}) as Record<string, unknown>;
  const a = Array.isArray(s.assignments) ? (s.assignments as { assetId?: string; networkId?: string }[]).map((x) => `${x.assetId}|${x.networkId}`) : [];
  return {
    enabled: c?.enabled ?? false, mgmt: c?.credentialManagement ?? 'super_admin', manualFallback: s.manualFallback === true, healthMonitoring: s.healthMonitoring === true, assignments: a,
    customerActivation: s.customerActivation === true, quoteActions: Array.isArray(s.quoteActions) ? s.quoteActions as string[] : [],
    adapterKind: str(s.adapterKind), networkCode: str(s.networkCode), chainId: str(s.chainId), confirmationsRequired: str(s.confirmationsRequired),
    botUsername: str(s.botUsername), webhookUrl: str(s.webhookUrl), miniAppUrl: str(s.miniAppUrl), logoUrl: str(s.logoUrl),
    primaryColor: str(s.primaryColor), backgroundColor: str(s.backgroundColor), menu: Array.isArray(s.menu) ? (s.menu as string[]) : [],
  };
}

function TextField({ id, label, value, onChange, disabled, type = 'text', placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Input id={id} data-testid={`input-${id}`} type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ProviderCard({ tenantId, def, conn, bundle, isSuper, readOnly, canConfigure, onDirty }: {
  tenantId: string; def: Def; conn?: TenantIntegrationRuntime; bundle: IntegrationRuntimeBundle; isSuper: boolean; readOnly: boolean; canConfigure: boolean; onDirty: (k: string, d: boolean) => void;
}) {
  const qc = useQueryClient();
  const save = useSaveTenantIntegration();
  const test = useTestTenantIntegration();
  const webhook = useRegisterTenantTelegramWebhook();
  const [f, setF] = useState<Form>(() => fromConn(conn));
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [clear, setClear] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = useRef(false);
  const k = def.key;
  const upd = (p: Partial<Form>) => { dirty.current = true; onDirty(k, true); setF((x) => ({ ...x, ...p })); };
  // Adopt server revisions only while the form is clean, so polling never clobbers edits.
  useEffect(() => { if (!dirty.current) setF(fromConn(conn)); }, [conn]);

  const vault = bundle.vaultAvailable;
  // Effective mode: Super Admin acts on the selected (unsaved) mode, customers on the saved one.
  const mode = isSuper ? f.mgmt : conn?.credentialManagement ?? 'super_admin';
  const modeAllows = isSuper ? mode === 'super_admin' || mode === 'both' : (mode === 'customer' || mode === 'both') && !!conn?.canManageCredentials;
  const canCreds = !readOnly && !!conn && modeAllows && vault;
  const canWrite = !readOnly && !!canConfigure && (isSuper || !!conn);
  const telegram = k.toLowerCase().includes('telegram');
  const mine = useMemo(() => bundle.assetNetworks, [bundle.assetNetworks]);
  const health = (conn?.health ?? {}) as Record<string, unknown>;
  const hState = str(health.state) || (conn ? 'unknown' : 'unconfigured');
  const hMessage = str(health.message);
  const hCode = str(health.errorCode);
  const hLabel = hState === 'connected' ? 'Connected' : hState === 'ready' ? 'Configuration ready' : hState.replace(/_/g, ' ');
  const hTone = hState === 'connected' || hState === 'ready' ? 'ok' : hState === 'unknown' || hState === 'unconfigured' || hState === 'disabled' || hState === 'not_configured' ? undefined : 'bad';
  const secretsFilled = Object.entries(secrets).filter(([, v]) => v.length > 0);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: getGetIntegrationRuntimeQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetTenantIntegrationRuntimeQueryKey(tenantId) });
  };
  const settings = () => {
    const s: Record<string, unknown> = {};
    if (def.manualFallback) s.manualFallback = f.manualFallback;
    s.healthMonitoring = f.healthMonitoring;
    s.customerActivation = f.customerActivation;
    if (['1forge', 'whitebit', 'quickex'].includes(k)) s.quoteActions = f.quoteActions;
    s.assignments = f.assignments.map((a) => { const [assetId, networkId] = a.split('|'); return { assetId, networkId }; });
    if (!telegram) {
      if (f.adapterKind) s.adapterKind = f.adapterKind;
      if (f.networkCode.trim()) s.networkCode = f.networkCode.trim();
      if (f.chainId.trim()) s.chainId = f.chainId.trim();
      if (f.confirmationsRequired.trim() && !isNaN(Number(f.confirmationsRequired))) s.confirmationsRequired = Number(f.confirmationsRequired);
    } else {
      for (const key of ['botUsername', 'webhookUrl', 'miniAppUrl', 'logoUrl', 'primaryColor', 'backgroundColor'] as const) if (f[key].trim()) s[key] = f[key].trim();
      s.menu = f.menu;
    }
    return s;
  };
  const reasonOk = reason.trim().length >= 3;
  const onSave = () => {
    setMsg(null);
    const data: Parameters<typeof save.mutate>[0]['data'] = {
      enabled: isSuper ? f.enabled : conn?.enabled ?? false, settings: settings(), reason: reason.trim(),
      ...(isSuper ? { credentialManagement: f.mgmt as 'super_admin' | 'customer' | 'both' } : {}),
      ...(canCreds && secretsFilled.length ? { secrets: Object.fromEntries(secretsFilled) } : {}),
      ...(canCreds && clear ? { clearCredentials: true } : {}),
    };
    save.mutate({ tenantId, providerKey: k, data }, {
      onSuccess: () => {
        setSecrets({}); setClear(false); setReason(''); dirty.current = false; onDirty(k, false);
        setMsg({ ok: true, text: 'Saved. Saving does not establish a connection; run a connection test.' });
        invalidate();
      },
      onError: (e) => setMsg({ ok: false, text: errMsg(e) }),
    });
  };
  const onTest = () => {
    setMsg(null);
    test.mutate({ tenantId, providerKey: k, data: { reason: reason.trim() } }, {
      onSuccess: () => { setMsg({ ok: true, text: 'Test finished. See connection health.' }); invalidate(); },
      onError: (e) => setMsg({ ok: false, text: errMsg(e) }),
    });
  };
  const isBot = k === 'telegram_bot';
  const canWebhook = isBot && !!conn && conn.enabled && conn.canManageCredentials && canWrite && !dirty.current && vault && reasonOk && !webhook.isPending;
  const onWebhook = () => {
    setMsg(null);
    webhook.mutate({ tenantId, data: { reason: reason.trim() } }, {
      onSuccess: (r) => { setMsg({ ok: !!r.registered, text: r.registered ? 'Webhook applied to Telegram (sandbox only). This is a configuration action; no financial execution happens.' : 'Telegram did not confirm the webhook. Check the bot token and webhook URL.' }); invalidate(); },
      onError: (e) => setMsg({ ok: false, text: errMsg(e) }),
    });
  };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const dis = !canWrite || save.isPending;

  return (
    <section className="rounded-md border bg-card p-4 md:p-5" aria-labelledby={`h-${k}`} data-testid={`card-integration-${k}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`h-${k}`} className="font-display text-2xl">{def.name}</h3>
          <p className="font-mono text-xs text-muted-foreground">{k} / {def.capability}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={conn?.enabled ? 'warn' : undefined}>{conn ? (conn.enabled ? 'Enabled (not a connection)' : 'Disabled') : 'Unconfigured'}</Pill>
          <Pill tone={hTone}>{hState === 'connected' ? 'Connected' : `Health: ${hLabel}`}</Pill>
        </div>
      </header>

      <dl className="mt-3 grid gap-2 rounded border bg-muted/30 p-3 text-sm sm:grid-cols-3" data-testid={`health-${k}`}>
        <div><dt className="font-mono text-[11px] uppercase text-muted-foreground">Last checked</dt><dd>{when(health.checkedAt)}</dd></div>
        <div><dt className="font-mono text-[11px] uppercase text-muted-foreground">Latency</dt><dd>{typeof health.latencyMs === 'number' ? `${health.latencyMs} ms` : 'Not measured'}</dd></div>
        {['alchemy', 'rpc'].includes(k) && <div><dt className="font-mono text-[11px] uppercase text-muted-foreground">Observed network head</dt><dd>{str(health.head) || 'Not observed'}{health.chainId != null && <span className="block text-xs">Chain {str(health.chainId)}</span>}</dd></div>}
        <div><dt className="font-mono text-[11px] uppercase text-muted-foreground">Message</dt><dd className="[overflow-wrap:anywhere]" data-testid={`text-health-message-${k}`}>{hMessage || 'None recorded'}{hCode && <span className="block font-mono text-xs text-muted-foreground" data-testid={`text-health-code-${k}`}>{hCode}</span>}</dd></div>
        {hState === 'ready' && <p className="text-xs text-muted-foreground sm:col-span-3" data-testid={`note-ready-${k}`}>Configuration ready means the settings are complete. It is not an external connection.</p>}
      </dl>

      <fieldset className="mt-4 space-y-4" disabled={dis}>
        <legend className="sr-only">{def.name} settings</legend>
        {isSuper ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
              <span><span className="block font-medium">Enable integration</span><span className="text-xs text-muted-foreground">Authorizes configuration only. It does not connect or execute anything.</span></span>
              <Switch checked={f.enabled} onCheckedChange={(v) => upd({ enabled: v })} data-testid={`switch-enabled-${k}`} aria-label={`Enable ${def.name}`} />
            </label>
            <label className="block text-sm"><span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Credential management</span>
              <select className="h-9 w-full rounded-md border bg-background px-2" value={f.mgmt} onChange={(e) => upd({ mgmt: e.target.value })} data-testid={`select-management-${k}`}>
                {MGMT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
          </div>
        ) : <p className="text-sm text-muted-foreground" data-testid={`text-policy-${k}`}>{conn ? `Enablement and credential policy are set by QXLayer (${conn.credentialManagement.replace('_', ' ')}).` : 'Not authorized yet. QXLayer must authorize this integration first.'}</p>}

        {isSuper && <label className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
          <span>Allow customer to activate this authorized integration</span>
          <Switch checked={f.customerActivation} onCheckedChange={v => upd({ customerActivation: v })} data-testid={`switch-customer-activation-${k}`} />
        </label>}
        {!isSuper && conn && f.customerActivation && <label className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
          <span>Activate authorized integration</span>
          <Switch checked={f.enabled} onCheckedChange={v => upd({ enabled: v })} data-testid={`switch-customer-enabled-${k}`} />
        </label>}
        {['1forge', 'whitebit', 'quickex'].includes(k) && <div className="rounded border p-3 text-sm">
          <p className="font-medium">Sandbox pricing assignment</p>
          <p className="text-xs text-muted-foreground">Read-only rates; no trades, deposits or withdrawals. Select only one provider per action and assign both route asset/networks below.</p>
          <div className="mt-2 flex gap-4">{(k === 'quickex' ? ['convert'] : ['swap', 'convert']).map(action => <label key={action} className="flex items-center gap-2">
            <input type="checkbox" disabled={!isSuper} checked={f.quoteActions.includes(action)}
              onChange={e => upd({ quoteActions: e.target.checked ? [...f.quoteActions, action] : f.quoteActions.filter(a => a !== action) })}
              data-testid={`pricing-${k}-${action}`} />{action}
          </label>)}</div>
        </div>}
        {def.manualFallback && (
          <label className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
            <span><span className="block font-medium">Manual fallback</span><span className="text-xs text-muted-foreground">Use the configured manual Sandbox rate when read-only provider pricing fails. Quotes explicitly disclose the fallback.</span></span>
            <Switch checked={f.manualFallback} onCheckedChange={(v) => upd({ manualFallback: v })} data-testid={`switch-fallback-${k}`} aria-label="Manual fallback" />
          </label>
        )}

        <label className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
          <span><span className="block font-medium">Health monitoring (opt-in)</span><span className="text-xs text-muted-foreground">Runs read-only checks every five minutes. Off by default. Checks never move funds or execute financial operations.</span></span>
          <Switch checked={f.healthMonitoring} onCheckedChange={(v) => upd({ healthMonitoring: v })} data-testid={`switch-monitoring-${k}`} aria-label="Health monitoring" />
        </label>

        {!telegram && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm"><span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Adapter kind</span>
              <select className="h-9 w-full rounded-md border bg-background px-2" value={f.adapterKind} onChange={(e) => upd({ adapterKind: e.target.value })} data-testid={`select-adapter-${k}`}>
                <option value="">Not set</option>{KINDS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select></label>
            <TextField id={`network-${k}`} label="Network code" value={f.networkCode} onChange={(v) => upd({ networkCode: v })} />
            <TextField id={`chain-${k}`} label="Chain ID" type="number" value={f.chainId} onChange={(v) => upd({ chainId: v })} />
            <TextField id={`confirm-${k}`} label="Confirmations required" type="number" value={f.confirmationsRequired} onChange={(v) => upd({ confirmationsRequired: v })} />
          </div>
        )}

        {telegram && (
          <div className="space-y-3 rounded border p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-copper">Telegram branding and features</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField id={`bot-${k}`} label="Bot username" value={f.botUsername} onChange={(v) => upd({ botUsername: v })} placeholder="my_exchange_bot" />
              <TextField id={`webhook-${k}`} label="Webhook URL" type="url" value={f.webhookUrl} onChange={(v) => upd({ webhookUrl: v })} />
              <TextField id={`mini-${k}`} label="Mini app URL" type="url" value={f.miniAppUrl} onChange={(v) => upd({ miniAppUrl: v })} />
              <TextField id={`logo-${k}`} label="Logo URL" type="url" value={f.logoUrl} onChange={(v) => upd({ logoUrl: v })} />
              <TextField id={`primary-${k}`} label="Primary color" value={f.primaryColor} onChange={(v) => upd({ primaryColor: v })} placeholder="#12423f" />
              <TextField id={`bg-${k}`} label="Background color" value={f.backgroundColor} onChange={(v) => upd({ backgroundColor: v })} placeholder="#fbf8f2" />
            </div>
            <div role="group" aria-label="Menu modules" className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {MENU.map((m) => (
                <label key={m} className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm capitalize">{m}
                  <Switch checked={f.menu.includes(m)} onCheckedChange={() => upd({ menu: toggle(f.menu, m) })} data-testid={`switch-menu-${k}-${m}`} aria-label={`${m} module`} /></label>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Asset and network assignments</p>
          {mine.length === 0 ? <p className="text-sm text-muted-foreground" data-testid={`text-no-assets-${k}`}>This tenant has no enabled asset networks to assign.</p> : (
            <div role="group" aria-label="Assignments" className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((a) => { const v = `${a.assetId}|${a.networkId}`; return (
                <label key={v} className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
                  <input type="checkbox" disabled={!isSuper} checked={f.assignments.includes(v)} onChange={() => upd({ assignments: toggle(f.assignments, v) })} data-testid={`check-assign-${k}-${a.assetId}-${a.networkId}`} />
                  <span>{a.symbol} on {a.networkName}</span></label>); })}
            </div>)}
        </div>

        <div className="rounded border border-dashed p-3">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><KeyRound className="h-3.5 w-3.5" aria-hidden />Credentials (write-only)</p>
          {!vault && <p className="mt-2 flex gap-2 rounded bg-amber-500/10 p-2 text-sm" role="status" data-testid={`notice-vault-${k}`}><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />The credential vault is not available on this server, so credentials cannot be saved. Configuration above can still be saved.</p>}
          {vault && !conn && <p className="mt-2 text-sm text-muted-foreground">Save an authorized configuration before adding credentials.</p>}
          {vault && conn && !modeAllows && <p className="mt-2 text-sm text-muted-foreground" data-testid={`notice-nocreds-${k}`}>Credentials are not managed by you under the selected management mode, or you lack permission.</p>}
          <p className="mt-2 text-sm" data-testid={`text-creds-${k}`}>{conn?.credentialsConfigured ? 'Credentials are stored. Values are never shown.' : 'No credentials stored.'}</p>
          {def.secretFields.length > 0 && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {def.secretFields.map((sf) => (
                <label key={sf} className="block text-sm" htmlFor={`secret-${k}-${sf}`}><span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{sf}</span>
                  <Input id={`secret-${k}-${sf}`} data-testid={`input-secret-${k}-${sf}`} type="password" autoComplete="new-password" value={secrets[sf] ?? ''} disabled={!canCreds || dis}
                    placeholder={conn?.credentialsConfigured ? 'Leave blank to keep' : ''} onChange={(e) => { dirty.current = true; onDirty(k, true); setSecrets((x) => ({ ...x, [sf]: e.target.value })); }} /></label>
              ))}
            </div>)}
          {canCreds && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={clear} onChange={(e) => { dirty.current = true; onDirty(k, true); setClear(e.target.checked); }} data-testid={`check-clear-${k}`} />Clear stored credentials on save</label>}
        </div>
      </fieldset>

      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1 text-sm" htmlFor={`reason-${k}`}><span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Reason (audited, 3+ characters)</span>
            <Input id={`reason-${k}`} data-testid={`input-reason-${k}`} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} /></label>
          <Button onClick={onSave} disabled={!canWrite || !reasonOk || save.isPending} data-testid={`button-save-${k}`}>{save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}Save</Button>
          <Button variant="outline" onClick={onTest} disabled={!canWrite || !conn || !reasonOk || test.isPending || save.isPending} data-testid={`button-test-${k}`}>{test.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}Test connection</Button>
          {isBot && <Button variant="outline" onClick={onWebhook} disabled={!canWebhook} title={canWebhook ? undefined : 'Requires a saved, enabled bot, no unsaved edits, a reason, and permission to manage credentials.'} data-testid="button-apply-webhook">{webhook.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}Apply webhook</Button>}
        </div>)}
      {!readOnly && !canConfigure && <p className="mt-3 text-sm text-muted-foreground" data-testid={`notice-noperm-${k}`}>Saving and testing require the configuration.manage permission for this tenant.</p>}
      {readOnly && <p className="mt-3 text-sm text-muted-foreground">Read-only demo. Changes are disabled.</p>}
      {msg && <p role={msg.ok ? 'status' : 'alert'} data-testid={`message-${k}`} className={`mt-3 text-sm ${msg.ok ? 'text-emerald-700' : 'text-destructive'}`}>{msg.text}</p>}
    </section>
  );
}

export function IntegrationsWorkspace({ tenantId }: { tenantId: string }) {
  const p = usePrincipal();
  const isSuper = p.role === 'super_admin';
  const q = useGetTenantIntegrationRuntime(tenantId, { query: { queryKey: getGetTenantIntegrationRuntimeQueryKey(tenantId), refetchInterval: 20000 } });
  const dirtyKeys = useRef(new Set<string>());
  const [, force] = useState(0);
  const onDirty = (k: string, d: boolean) => { const had = dirtyKeys.current.size; if (d) dirtyKeys.current.add(k); else dirtyKeys.current.delete(k); if (had !== dirtyKeys.current.size) force((n) => n + 1); };
  // Tenant-specific grant only: no role-wide shortcut.
  const m = p.memberships?.find((x) => x.tenantId === tenantId);
  const canConfigure = isSuper || (!!m && (m.role === 'client_admin' || m.permissions.includes('configuration.manage')) && (m.role !== 'staff' || m.permissions.includes('configuration.manage')));
  const b = q.data;
  if (q.isLoading) return <ListSkeleton />;
  if (!b) return <ErrorState what="integrations" onRetry={() => q.refetch()} />;
  return (
    <div className="space-y-4" data-testid="workspace-integrations">
      {q.isError && <p role="alert" className="flex items-center gap-2 rounded border border-destructive/40 p-2 text-sm text-destructive" data-testid="error-refresh"><AlertTriangle className="h-4 w-4" aria-hidden />Could not refresh. Showing the last loaded data. <Button size="sm" variant="outline" onClick={() => q.refetch()}>Retry</Button></p>}
      <Panel title="Runtime" note="Sandbox configuration only. Enabled never means connected, and no financial execution happens here.">
        <div className="flex flex-wrap gap-1.5" data-testid="runtime-flags">
          <Pill>{b.sandboxOnly ? 'Sandbox only' : 'Not sandbox only'}</Pill>
          <Pill>{b.executionEnabled ? 'Execution flag on' : 'Financial execution disabled'}</Pill>
          <Pill tone={b.vaultAvailable ? 'ok' : 'warn'}>{b.vaultAvailable ? 'Vault available' : 'Vault unavailable'}</Pill>
          <span className="font-mono text-xs text-muted-foreground" data-testid="text-source-commit">build {b.sourceCommit.slice(0, 8)}</span>
          {dirtyKeys.current.size > 0 && <span className="text-xs text-muted-foreground" data-testid="text-unsaved">Unsaved edits are kept during refresh.</span>}
        </div>
      </Panel>
      {isSuper && b.databaseRuntime && <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3 text-sm" data-testid="notice-database-runtime">
        Actual API database role: <strong>{b.databaseRuntime.role}</strong>. {b.databaseRuntime.bypassesRls
          ? 'This role bypasses RLS. Application tenant checks remain active, but database-level isolation is not enforced.'
          : 'This role does not bypass RLS. Policy and cross-tenant isolation tests are still required before claiming database enforcement.'}
      </div>}
      {b.definitions.length === 0 && <p className="text-sm text-muted-foreground">No integration definitions are available.</p>}
      {b.definitions.map((d) => (
        <ProviderCard key={`${tenantId}:${d.key}`} tenantId={tenantId} def={d} bundle={b} isSuper={isSuper} readOnly={!!p.demo} canConfigure={canConfigure}
          conn={b.connections.find((c) => c.providerKey === d.key && c.tenantId === tenantId)} onDirty={onDirty} />
      ))}
    </div>
  );
}

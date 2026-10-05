import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetExchangeConfiguration, getGetExchangeConfigurationQueryKey, useSaveExchangeConfiguration,
  getGetExchangeDashboardQueryKey, getListExchangeOrdersQueryKey, getListExchangeAuditQueryKey,
  type ExchangeSettings, type ExchangeCatalogAsset, type ExchangeProvider,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useInvalidateTenant } from '@/lib/invalidate';
import { isAllowedLogo } from './visual-catalog';
import { gtDec, isDec, isInt, isPos } from './ui-validate';

export interface ExchangeDraft {
  loading: boolean; error: boolean; refetch: () => void;
  draft: ExchangeSettings | null; catalog: ExchangeCatalogAsset[]; providerCatalog: ExchangeProvider[]; effectiveEnabled: boolean;
  patch: (p: Partial<ExchangeSettings>) => void;
  dirty: boolean; errors: string[]; saveError: string | null; saving: boolean;
  save: () => void; discard: () => void;
}

export function fiatId(s: ExchangeSettings) { return `fiat:${s.fiatCurrency}`; }

export function validate(s: ExchangeSettings, catalog: ExchangeCatalogAsset[]): string[] {
  const e: string[] = [];
  const cat = new Map(catalog.map((c) => [c.assetNetworkId, c]));
  const fiat = fiatId(s);
  if (!isDec(s.fiatPlanRate)) e.push('Fiat plan reference rate must be a decimal string');
  s.assets.forEach((a) => {
    if (!a.symbol.trim()) e.push('Every asset needs a symbol');
    if (!isInt(a.decimals, 18)) e.push(`${a.symbol}: precision must be an integer 0 to 18`);
    if (!isInt(a.displayOrder, 1000)) e.push(`${a.symbol}: display order must be a whole number 0 to 1000`);
    if (!isDec(a.sandboxPlanRate)) e.push(`${a.symbol}: plan-currency reference rate must be a decimal string`);
    if (a.logoUrl && !isAllowedLogo(a.logoUrl)) e.push(`${a.symbol}: logo must be an HTTPS URL or a supplied catalog logo`);
  });
  s.networks.forEach((n) => {
    const c = cat.get(n.assetNetworkId); const nm = c ? `${c.symbol} on ${c.networkName}` : n.assetNetworkId;
    if (!isDec(n.minimum) || !isDec(n.maximum) || !isDec(n.fee)) e.push(`${nm}: minimum, maximum and fee must be decimal strings`);
    else if (gtDec(n.minimum, n.maximum)) e.push(`${nm}: minimum exceeds maximum`);
  });
  s.paymentMethods.forEach((p) => {
    if (!p.label.trim()) e.push('Every payment method needs a label');
    if (p.logoUrl && !isAllowedLogo(p.logoUrl)) e.push(`${p.label || 'Payment method'}: logo must be an HTTPS URL or a supplied catalog logo`);
    if (p.minimum !== undefined && !isDec(p.minimum)) e.push(`${p.label || 'Payment method'}: minimum must be a decimal string`);
    if (p.maximum != null && (!isDec(p.maximum) || (isDec(p.minimum ?? '0') && gtDec(p.minimum ?? '0', p.maximum)))) e.push(`${p.label || 'Payment method'}: maximum must be a decimal not below the minimum`);
    if (p.feeBps !== undefined && !isInt(p.feeBps, 5000)) e.push(`${p.label || 'Payment method'}: fee is integer basis points 0 to 5000`);
    if (p.fixedFee !== undefined && !isDec(p.fixedFee)) e.push(`${p.label || 'Payment method'}: fixed fee must be a decimal string`);
    if (p.reserve !== undefined && !isDec(p.reserve)) e.push(`${p.label || 'Payment method'}: sandbox reserve must be a non-negative decimal string`);
    if (p.currency !== s.fiatCurrency) e.push(`${p.label || 'Payment method'}: currency must match ${s.fiatCurrency}`);
    if (p.enabled && !p.buy && !p.sell) e.push(`${p.label || 'Payment method'}: enable Buy or Sell`);
  });
  s.routes.forEach((r, i) => {
    const nm = `Route ${i + 1}`;
    const sc = cat.get(r.source), dc = cat.get(r.destination);
    const ok = r.action === 'buy' ? r.source === fiat && !!dc : r.action === 'sell' ? !!sc && r.destination === fiat : !!sc && !!dc && r.source !== r.destination;
    if (!ok) e.push(`${nm}: endpoints do not fit the ${r.action} action`);
    if (!isPos(r.rate)) e.push(`${nm}: a positive manual rate is required`);
    if (!isDec(r.minimum) || !isDec(r.maximum) || !isDec(r.fixedFee)) e.push(`${nm}: minimum, maximum and fixed fee must be decimal strings`);
    else if (gtDec(r.minimum, r.maximum)) e.push(`${nm}: minimum exceeds maximum`);
    if (!isInt(r.feeBps, 5000) || !isInt(r.spreadBps, 5000)) e.push(`${nm}: fee and spread are integer basis points 0 to 5000`);
    if (r.enabled && (r.action === 'buy' || r.action === 'sell')) {
      const ids = r.paymentMethodIds.filter((id) => s.paymentMethods.some((p) => p.id === id && p.enabled && p.currency === s.fiatCurrency && p[r.action as 'buy' | 'sell']));
      if (ids.length === 0) e.push(`${nm}: associate at least one enabled ${r.action} payment method`);
    }
    if (r.enabled && sc) {
      const a = s.assets.find((x) => x.assetId === sc.assetId);
      if (!a || !isPos(a.sandboxPlanRate)) e.push(`${nm}: ${sc.symbol} needs a positive plan-currency reference rate to quote`);
    }
  });
  (s.providers ?? []).forEach((p) => {
    if (p.endpoint) { let ok = false; try { const u = new URL(p.endpoint); ok = u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash; } catch { ok = false; } if (!ok) e.push(`${p.label || p.providerId}: endpoint must be a public HTTPS URL without credentials, query or fragment`); }
  });
  if (s.enabled && !s.actions[s.defaultAction]) e.push('Default action must be an enabled action when the exchange is enabled');
  if (s.publicNote.length > 1000) e.push('Public note is limited to 1000 characters');
  if (new Blob([JSON.stringify(s)]).size > 32768) e.push('Configuration exceeds the 32 KiB limit');
  return [...new Set(e.filter(Boolean))];
}

export function useExchangeDraft(tenantId: string): ExchangeDraft {
  const qc = useQueryClient();
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  const key = getGetExchangeConfigurationQueryKey(tenantId);
  const q = useGetExchangeConfiguration(tenantId, { query: { queryKey: key } });
  const m = useSaveExchangeConfiguration();
  const [draft, setDraft] = useState<ExchangeSettings | null>(null);
  const [saved, setSaved] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const initFor = useRef('');
  const serverRef = useRef<ExchangeSettings | null>(null);
  const catalog = useMemo(() => q.data?.catalog ?? [], [q.data]);
  useEffect(() => {
    if (q.data && initFor.current !== tenantId) { initFor.current = tenantId; setDraft(q.data.configuration); setSaved(JSON.stringify(q.data.configuration)); serverRef.current = q.data.configuration; }
  }, [q.data, tenantId]);
  const catKey = catalog.map((c) => c.assetNetworkId).join(',');
  const ready = draft !== null;
  useEffect(() => {
    if (!ready) return;
    setDraft((d) => {
      if (!d) return d;
      const assetIds = new Set(catalog.map((c) => c.assetId)); const netIds = new Set(catalog.map((c) => c.assetNetworkId));
      const assets = d.assets.filter((a) => assetIds.has(a.assetId));
      catalog.forEach((c) => { if (!assets.some((a) => a.assetId === c.assetId)) assets.push({ assetId: c.assetId, enabled: false, displayOrder: assets.length, symbol: c.symbol, decimals: 8, logoUrl: null, sandboxPlanRate: '0' }); });
      const networks = d.networks.filter((n) => netIds.has(n.assetNetworkId));
      catalog.forEach((c) => { if (!networks.some((n) => n.assetNetworkId === c.assetNetworkId)) networks.push({ assetNetworkId: c.assetNetworkId, enabled: false, available: false, minimum: '0', maximum: '0', fee: '0', information: '' }); });
      if (assets.length === d.assets.length && networks.length === d.networks.length && assets.every((a, i) => a === d.assets[i]) && networks.every((n, i) => n === d.networks[i])) return d;
      return { ...d, assets, networks, routes: d.routes.filter(r => (r.source.startsWith('fiat:') || netIds.has(r.source)) && (r.destination.startsWith('fiat:') || netIds.has(r.destination))) };
    });
  }, [catKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = useCallback((p: Partial<ExchangeSettings>) => { setSaveError(null); setDraft((d) => (d ? { ...d, ...p } : d)); }, []);
  const errors = useMemo(() => (draft ? validate(draft, catalog) : []), [draft, catalog]);
  const dirty = draft !== null && JSON.stringify(draft) !== saved;
  const save = () => {
    if (!draft || m.isPending || errors.length > 0 || !dirty) return;
    setSaveError(null);
    m.mutate({ tenantId, data: draft }, {
      onSuccess: (r) => {
        qc.setQueryData(key, r); setDraft(r.configuration); setSaved(JSON.stringify(r.configuration)); serverRef.current = r.configuration;
        qc.invalidateQueries({ queryKey: getGetExchangeDashboardQueryKey(tenantId) });
        qc.invalidateQueries({ queryKey: getListExchangeOrdersQueryKey(tenantId) });
        qc.invalidateQueries({ queryKey: getListExchangeAuditQueryKey(tenantId) });
        inv(tenantId); toast({ title: 'Exchange settings saved' });
      },
      onError: (e) => { const msg = (e as Error)?.message ?? 'Request rejected'; setSaveError(msg); toast({ title: 'Save failed', description: msg, variant: 'destructive' }); },
    });
  };
  const discard = () => { if (serverRef.current) { setDraft(serverRef.current); setSaveError(null); } };
  return { loading: q.isLoading, error: q.isError, refetch: () => { q.refetch(); }, draft, catalog, providerCatalog: q.data?.providerCatalog ?? [], effectiveEnabled: q.data?.effectiveEnabled ?? false, patch, dirty, errors, saveError, saving: m.isPending, save, discard };
}

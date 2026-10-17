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
import { useGlobalCatalog } from '@/hooks/use-global-catalog';
import { reconcileExchangeScope } from './draft-scope';
import { routeEndpointsCompatible } from './route-endpoint-validation';

export interface ExchangeDraft {
  loading: boolean; error: boolean; refetch: () => void;
  draft: ExchangeSettings | null; catalog: ExchangeCatalogAsset[]; providerCatalog: ExchangeProvider[]; effectiveEnabled: boolean;
  patch: (p: Partial<ExchangeSettings>) => void;
  dirty: boolean; errors: string[]; saveError: string | null; saving: boolean;
  save: () => void; discard: () => void; baseline: ExchangeSettings | null;
}

export function fiatId(s: ExchangeSettings) { return `fiat:${s.fiatCurrency}`; }
/** Fiat codes selected for this tenant; falls back to the single legacy currency. */
export function fiatCodes(s: ExchangeSettings): string[] { const l = s.fiatCurrencies && s.fiatCurrencies.length ? s.fiatCurrencies : [s.fiatCurrency]; return [...new Set([s.fiatCurrency, ...l])]; }
export const isFiatEp = (id: string) => id.startsWith('fiat:');
/** A payment method can serve a fiat code when its primary currency or currencies list includes it. */
export function methodServes(p: { currency: string; currencies?: string[] }, code: string) { return p.currency === code || (p.currencies ?? []).includes(code); }

export type PMX = ExchangeSettings['paymentMethods'][number];
export const planRates = (s: ExchangeSettings): Record<string, string> => s.fiatPlanRates ?? {};
export function validate(s: ExchangeSettings, catalog: ExchangeCatalogAsset[], requiredFor: (catalogId?: string) => string[] = () => []): string[] {
  const e: string[] = [];
  const cat = new Map(catalog.map((c) => [c.assetNetworkId, c]));
  const networkEndpoints = new Set(cat.keys());
  const fiat = fiatId(s);
  if (!isDec(s.fiatPlanRate)) e.push('Fiat plan reference rate must be a decimal string');
  const rates = planRates(s);
  fiatCodes(s).filter((c) => c !== s.fiatCurrency).forEach((c) => {
    const used = s.routes.some((r) => r.enabled && (r.source === `fiat:${c}` || r.destination === `fiat:${c}`));
    if (rates[c] !== undefined && rates[c] !== '' && !isPos(rates[c])) e.push(`${c}: plan reference rate must be a positive decimal`);
    if (used && !isPos(rates[c] ?? '')) e.push(`${c}: an enabled route uses it, so a positive plan-currency reference rate is required (no 1:1 assumption)`);
  });
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
    if ((p.instructions?.length ?? 0) > 2000) e.push(`${p.label || 'Payment method'}: instructions are limited to 2000 characters`);
    if (p.logoUrl && !isAllowedLogo(p.logoUrl)) e.push(`${p.label || 'Payment method'}: logo must be an HTTPS URL or a supplied catalog logo`);
    if (p.minimum !== undefined && !isDec(p.minimum)) e.push(`${p.label || 'Payment method'}: minimum must be a decimal string`);
    if (p.maximum != null && (!isDec(p.maximum) || (isDec(p.minimum ?? '0') && gtDec(p.minimum ?? '0', p.maximum)))) e.push(`${p.label || 'Payment method'}: maximum must be a decimal not below the minimum`);
    if (p.feeBps !== undefined && !isInt(p.feeBps, 5000)) e.push(`${p.label || 'Payment method'}: fee is integer basis points 0 to 5000`);
    if (p.fixedFee !== undefined && !isDec(p.fixedFee)) e.push(`${p.label || 'Payment method'}: fixed fee must be a decimal string`);
    if (p.reserve !== undefined && !isDec(p.reserve)) e.push(`${p.label || 'Payment method'}: sandbox reserve must be a non-negative decimal string`);
    if (p.enabled) {
      if (!(p.instructions ?? '').trim()) e.push(`${p.label || 'Payment method'}: payment instructions are required when enabled`);
      const af = p.accountFields ?? {};
      requiredFor(p.catalogId).forEach((f) => { if (!(af[f] ?? '').trim()) e.push(`${p.label || 'Payment method'}: account field "${f}" is required when enabled`); });
    }
    if (p.enabled && !fiatCodes(s).some((c) => methodServes(p, c))) e.push(`${p.label || 'Payment method'}: no currency is among the tenant's selected fiat currencies`);
  });
  s.routes.forEach((r, i) => {
    const nm = `Route ${i + 1}`;
    const sc = cat.get(r.source);
    const ok = routeEndpointsCompatible(r, fiatCodes(s), networkEndpoints);
    if (!ok) e.push(`${nm}: endpoints do not fit the ${r.action} action`);
    if (!isPos(r.rate)) e.push(`${nm}: a positive manual rate is required`);
    if (!isDec(r.minimum) || !isDec(r.maximum) || !isDec(r.fixedFee)) e.push(`${nm}: minimum, maximum and fixed fee must be decimal strings`);
    else if (gtDec(r.minimum, r.maximum)) e.push(`${nm}: minimum exceeds maximum`);
    if (!isInt(r.feeBps, 5000) || !isInt(r.spreadBps, 5000)) e.push(`${nm}: fee and spread are integer basis points 0 to 5000`);
    if (r.enabled && (r.action === 'buy' || r.action === 'sell' || r.action === 'swap')) {
      const code = isFiatEp(r.source) ? r.source.slice(5) : isFiatEp(r.destination) ? r.destination.slice(5) : s.fiatCurrency;
      const ids = r.paymentMethodIds.filter((id) => s.paymentMethods.some((p) => p.id === id && p.enabled && methodServes(p, code)));
      if (ids.length === 0) e.push(`${nm}: associate at least one enabled ${code} payment method`);
    }
    if (r.enabled && sc) {
      const a = s.assets.find((x) => x.assetId === sc.assetId);
      if (!a || !isPos(a.sandboxPlanRate)) e.push(`${nm}: ${sc.symbol} needs a positive plan-currency reference rate to quote`);
    }
  });
  (s.providers ?? []).forEach((p) => {
    if (p.endpoint) { let ok = false; try { const u = new URL(p.endpoint); ok = u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash; } catch { ok = false; } if (!ok) e.push(`${p.label || p.providerId}: endpoint must be a public HTTPS URL without credentials, query or fragment`); }
  });
  const rules = s.pricingRules ?? [];
  if (new Set(rules.map(r => r.id)).size !== rules.length) e.push('Pricing rule identifiers must be unique');
  const ruleEndpoint = (id: string) => id === '*' || id === 'crypto:*' || id === 'fiat:*' || id === fiat || (isFiatEp(id) && fiatCodes(s).includes(id.slice(5))) || s.networks.some(n => n.assetNetworkId === id);
  const specificity = (r: typeof rules[number]) => Number(r.source !== '*') + Number(r.destination !== '*') + Number(Boolean(r.paymentMethodId));
  rules.forEach((r, i) => {
    if (!r.enabled) return;
    const nm = `Pricing rule ${i + 1}`;
    if (!ruleEndpoint(r.source) || !ruleEndpoint(r.destination)) e.push(`${nm}: select tenant endpoints or Any`);
    if (r.source === r.destination && r.source !== '*' && !(r.action === 'convert' && r.source === 'crypto:*')) e.push(`${nm}: select distinct endpoints or Any`);
    if (r.rate !== undefined && !isPos(r.rate)) e.push(`${nm}: manual rate must be positive or left blank`);
    if (!isDec(r.fixedFee) || !isInt(r.feeBps, 5000) || !isInt(r.spreadBps, 5000) || !isInt(r.priority, 1000)) e.push(`${nm}: check fees, spread and priority`);
    if (r.paymentMethodId && (r.action === 'convert' || !s.paymentMethods.some(p => p.id === r.paymentMethodId && p.enabled))) e.push(`${nm}: select a payment method supporting this action`);
    if ((r.action === 'swap' && r.source !== '*' && r.destination !== '*' && isFiatEp(r.source) === isFiatEp(r.destination)) ||
        (r.action === 'convert' && (r.source === 'fiat:*' || r.destination === 'fiat:*')) ||
        (r.action === 'swap' && (r.source === 'crypto:*' ? r.destination === 'crypto:*' || (r.destination !== '*' && !isFiatEp(r.destination)) : false)) ||
        (r.action === 'convert' && (isFiatEp(r.source) || isFiatEp(r.destination))) ||
        (r.action === 'buy' && ((r.source !== '*' && r.source !== fiat) || r.destination === fiat)) ||
        (r.action === 'sell' && ((r.destination !== '*' && r.destination !== fiat) || r.source === fiat)) ||
        false) e.push(`${nm}: endpoints do not fit its action`);
    rules.slice(i + 1).forEach(other => {
      const compatible = (a: string, b: string) => a === '*' || b === '*' || a === b || (a === 'crypto:*' && !isFiatEp(b)) || (b === 'crypto:*' && !isFiatEp(a)) || (a === 'fiat:*' && isFiatEp(b)) || (b === 'fiat:*' && isFiatEp(a));
      if (r.enabled && other.enabled && r.action === other.action && r.priority === other.priority &&
          specificity(r) === specificity(other) && compatible(r.source, other.source) && compatible(r.destination, other.destination) &&
          (!r.paymentMethodId || !other.paymentMethodId || r.paymentMethodId === other.paymentMethodId))
        e.push(`${nm}: overlapping enabled rules need different priorities`);
    });
  });
  const sp = s.defaultPairs?.swap;
  if (sp) {
    const code = [sp.source, sp.destination].find(isFiatEp)?.slice(5) ?? '';
    if (!sp.paymentMethodId) e.push('Default Swap pair requires a payment method');
    else if (!s.paymentMethods.some((p) => p.id === sp.paymentMethodId && p.enabled && methodServes(p, code))) e.push('Default Swap payment method must be enabled and serve the pair fiat currency');
  }
  const wallets = s.wallets ?? [];
  if (new Set(wallets.map(w => w.id)).size !== wallets.length) e.push('Wallet identifiers must be unique');
  wallets.forEach((w, i) => {
    const nm = `Wallet ${i + 1}`;
    if (!w.label.trim() || !w.address.trim() || w.label.length > 80 || w.address.length > 160) e.push(`${nm}: enter a label and a public address within the supported limits`);
    if (!s.networks.some(n => n.assetNetworkId === w.assetNetworkId) || !cat.has(w.assetNetworkId)) e.push(`${nm}: select a tenant asset/network`);
    if (w.kind === 'token' && (w.adapterKind === 'bitcoin' || !w.contractOrMint?.trim())) e.push(`${nm}: token wallets require a supported adapter and explicit contract or mint`);
    if (w.kind === 'native' && w.contractOrMint) e.push(`${nm}: native wallets must not contain a token contract or mint`);
  });
  if (s.enabled && !s.actions[s.defaultAction]) e.push('Default action must be an enabled action when the exchange is enabled');
  if (s.publicNote.length > 1000) e.push('Public note is limited to 1000 characters');
  if (new Blob([JSON.stringify(s)]).size > 32768) e.push('Configuration exceeds the 32 KiB limit');
  return [...new Set(e.filter(Boolean))];
}

export function useExchangeDraft(tenantId: string, enabled = true): ExchangeDraft {
  const qc = useQueryClient();
  const inv = useInvalidateTenant();
  const { toast } = useToast();
  const key = getGetExchangeConfigurationQueryKey(tenantId);
  const q = useGetExchangeConfiguration(tenantId, { query: { queryKey: key, enabled: enabled && !!tenantId } });
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
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!q.data || initFor.current !== tenantId || dirtyRef.current) return;
    const j = JSON.stringify(q.data.configuration);
    if (j !== saved) { setDraft(q.data.configuration); setSaved(j); serverRef.current = q.data.configuration; }
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const catKey = catalog.map((c) => c.assetNetworkId).join(',');
  const ready = draft !== null;
  useEffect(() => {
    if (!ready) return;
    setDraft(d => d ? reconcileExchangeScope(d, catalog) : d);
  }, [catKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = useCallback((p: Partial<ExchangeSettings>) => { setSaveError(null); setDraft((d) => (d ? { ...d, ...p } : d)); }, []);
  const gc = useGlobalCatalog().data;
  const requiredFor = useCallback((id?: string) => { const m = gc?.entries.find((x) => x.id === id)?.metadata.requiredFields; return Array.isArray(m) ? m.map(String) : []; }, [gc]);
  const errors = useMemo(() => (draft ? validate(draft, catalog, requiredFor) : []), [draft, catalog, requiredFor]);
  const dirty = draft !== null && JSON.stringify(draft) !== saved;
  dirtyRef.current = dirty;
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
  const discard = () => { if (serverRef.current) { setDraft(reconcileExchangeScope(serverRef.current, catalog)); setSaveError(null); } };
  return { loading: q.isLoading, error: q.isError, refetch: () => { q.refetch(); }, draft, catalog, providerCatalog: q.data?.providerCatalog ?? [], effectiveEnabled: q.data?.effectiveEnabled ?? false, patch, baseline: serverRef.current, dirty, errors, saveError, saving: m.isPending, save, discard };
}

import type { ExchangeVisualAsset } from '@workspace/api-client-react';
export type LogoKind = 'crypto' | 'network' | 'payment-method' | 'currency' | 'flag' | 'provider';
export const normalizeIdentity = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Exact catalog identity and explicit transfer-scheme aliases; never infer a bank from currency or artwork. */
export function findVisual(visuals: ExchangeVisualAsset[], kind: LogoKind, identifier: string) {
  const key = normalizeIdentity(identifier);
  if (!key) return undefined;
  const schemeKey = (v: string) => normalizeIdentity(v).replace(/banktransfer$|transfer$/, '');
  const candidates = visuals.filter(v => v.kind === kind &&
    [v.code, v.name, v.recordId ?? ''].some(s => normalizeIdentity(s) === key ||
      (kind === 'payment-method' && schemeKey(s) !== '' && schemeKey(s) === schemeKey(identifier))));
  const identities = new Set(candidates.map(v => v.recordId || `${v.kind}:${v.code}`));
  return identities.size <= 1 ? candidates[0] : undefined;
}

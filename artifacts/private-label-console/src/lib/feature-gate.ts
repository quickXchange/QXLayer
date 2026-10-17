export const SECTION_FEATURE: Record<string, string> = { swap: 'swap', convert: 'convert', buy: 'buy', sell: 'sell' };
const PROVIDER_FEATURES = ['quickex', 'whitebit', 'telegram_bot', 'telegram_mini_app'];
export const hasIntegrationGrant = (f: Record<string, unknown>) => PROVIDER_FEATURES.some((k) => f[k] === true);
export type GateResult = { allowed: boolean; reason: string };
/** Customer-side section gate. Super Admin always passes except nothing is hidden from them. */
export function sectionGate(section: string, features: Record<string, unknown>, isSuper: boolean): GateResult {
  if (isSuper) return { allowed: true, reason: '' };
  if (section === 'wallets') return features.crypto_exchange === true ? { allowed: true, reason: '' } : { allowed: false, reason: 'Exchange public address configuration requires an active Exchange plan.' };
  if (section === 'rpc-preview') return { allowed: false, reason: 'RPC and node infrastructure is managed by VYNOX LAYER only.' };
  const need = SECTION_FEATURE[section];
  if (need) return features[need] === true ? { allowed: true, reason: '' } : { allowed: false, reason: `The ${need} feature is not included in your current plan.` };
  if (section === 'integrations') return hasIntegrationGrant(features) ? { allowed: true, reason: '' } : { allowed: false, reason: 'No integration is included in your current plan.' };
  if (['providers', 'api-keys', 'api-preview', 'webhooks-preview'].includes(section)) return { allowed: false, reason: 'This section is managed by VYNOX LAYER only.' };
  return { allowed: true, reason: '' };
}
export const hiddenForCustomer = (section: string, features: Record<string, unknown>) => !sectionGate(section, features, false).allowed;

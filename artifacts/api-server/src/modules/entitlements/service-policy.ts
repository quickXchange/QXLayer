import { HttpError } from "../../lib/errors";

export const customerProviderKeys = ["quickex", "whitebit"] as const;
export const channelKeys = ["telegram_bot", "telegram_mini_app"] as const;
export const serviceFeatures = [
  ["quickex", "Quickex"], ["whitebit", "WhiteBIT"],
  ["quickex_customer_credentials", "Customer-owned Quickex credentials"],
  ["whitebit_customer_credentials", "Customer-owned WhiteBIT credentials"],
] as const;
type Grants = { status: string; features: Record<string, boolean> };
export function integrationIncluded(e: Grants, key: string) {
  return e.status === "active" && e.features.crypto_exchange === true &&
    [...customerProviderKeys, ...channelKeys].includes(key as any) && e.features[key] === true &&
    (key !== "telegram_mini_app" || e.features.telegram_bot === true);
}
export function customerCredentialsAllowed(e: Grants, key: string, role: string, mode: string) {
  return integrationIncluded(e, key) && customerProviderKeys.includes(key as any) &&
    e.features[`${key}_customer_credentials`] === true && role === "client_admin" && mode === "customer";
}
export function requireIntegrationGrant(e: Grants, key: string) {
  if (!integrationIncluded(e, key)) throw new HttpError(403, "This service is not included in the tenant's active plan, or is Super Admin infrastructure.");
}
export function applyServiceDependencies(features: Record<string, boolean>, sources: Record<string, string>) {
  const dependencies: Record<string, string[]> = {
    quickex: ["crypto_exchange"], whitebit: ["crypto_exchange"],
    quickex_customer_credentials: ["quickex"], whitebit_customer_credentials: ["whitebit"],
    telegram_bot: ["crypto_exchange"], telegram_mini_app: ["telegram_bot", "crypto_exchange"],
  };
  for (const [key, parents] of Object.entries(dependencies)) if (features[key] && parents.some(p => !features[p])) {
    features[key] = false; sources[key] = `dependency denied: ${parents.filter(p => !features[p]).join(", ")}`;
  }
}
export function customerSettings(key: string, settings: Record<string, any>) {
  const allowed = channelKeys.includes(key as any) ? ["logoUrl", "primaryColor", "backgroundColor", "menu"] : ["customerActivation"];
  return Object.fromEntries(Object.entries(settings).filter(([k]) => allowed.includes(k)));
}
export function mergeCustomerSettings(key: string, old: Record<string, any>, proposed: Record<string, any>) {
  const editable = channelKeys.includes(key as any) ? ["logoUrl", "primaryColor", "backgroundColor", "menu"] : [];
  for (const [k, v] of Object.entries(proposed)) {
    if (!editable.includes(k) && JSON.stringify(v) !== JSON.stringify(old[k]))
      throw new HttpError(403, "Only Super Admin can change provider authorization, infrastructure or global settings.");
  }
  return { ...old, ...Object.fromEntries(Object.entries(proposed).filter(([k]) => editable.includes(k))) };
}

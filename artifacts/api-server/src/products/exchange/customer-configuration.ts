import type { ExchangeSettings } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
type Grants = { features: Record<string, boolean> };
export function customerExchangeConfiguration(settings: ExchangeSettings, grants: Grants): ExchangeSettings {
  return {
    ...settings, wallets: settings.wallets?.filter(w => w.purpose === "customer"), providers: [],
    actions: Object.fromEntries(Object.entries(settings.actions).map(([key,value])=>[key,value && grants.features[key]===true])) as ExchangeSettings["actions"],
    routes: settings.routes.filter(r=>grants.features[r.action]===true),
    pricingRules: settings.pricingRules?.filter(r=>grants.features[r.action]===true),
  };
}
export function mergeCustomerExchangeConfiguration(input: ExchangeSettings, stored: ExchangeSettings, grants: Grants): ExchangeSettings {
  const monitoring = (stored.wallets ?? []).filter(w => w.purpose !== "customer");
  if (input.wallets?.some(w => w.purpose !== "customer" || w.providerKey !== "rpc" || monitoring.some(m => m.id === w.id)))
    throw new HttpError(403, "Customers may configure their own public addresses, not RPC monitoring or infrastructure.");
  if(input.providers?.length) throw new HttpError(403,"Provider catalog assignments are Super Admin only. Use the plan-authorized Integrations service instead.");
  if(Object.entries(input.actions).some(([key,value])=>value && grants.features[key]!==true) ||
    input.routes.some(r=>grants.features[r.action]!==true) ||
    input.pricingRules?.some(r=>grants.features[r.action]!==true))
    throw new HttpError(403,"This exchange action is not included in the tenant's active plan.");
  // A downgrade hides configuration, never deletes it. Only Super Admin may edit
  // an excluded action; customer saves preserve that action for later upgrades.
  return {...input, wallets: [...(input.wallets ?? []), ...monitoring], providers:stored.providers,
    actions:{...input.actions,...Object.fromEntries(Object.entries(stored.actions).filter(([key])=>grants.features[key]!==true))},
    routes:[...input.routes,...stored.routes.filter(r=>grants.features[r.action]!==true)],
    pricingRules:[...(input.pricingRules??[]),...(stored.pricingRules??[]).filter(r=>grants.features[r.action]!==true)],
  };
}

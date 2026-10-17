import type { ExchangePricingRule, ExchangeQuoteInput, ExchangeSettings } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { decimal } from "../../modules/entitlements/decimal";
import { selectedFiats, isFiat, validActionPair } from "./global-catalog";

/**
 * Adapted from the package's manual-desk-pricing selector contract: immutable
 * endpoint identities, Any-side wildcards, specificity before explicit priority.
 * Rules only price existing tenant routes; they never enable routes or execution.
 */
export function pricingSpecificity(rule: ExchangePricingRule) {
  const weight = (id:string) => id==="*"?0:["crypto:*","fiat:*"].includes(id)?1:4;
  return weight(rule.source)+weight(rule.destination)+Number(Boolean(rule.paymentMethodId));
}
const selectorMatches = (selector:string,id:string) => selector==="*" || selector===id ||
  (selector==="crypto:*" && !isFiat(id)) || (selector==="fiat:*" && isFiat(id));
export function matchesPricingRule(rule: ExchangePricingRule, input: ExchangeQuoteInput) {
  return rule.enabled && rule.action === input.action &&
    selectorMatches(rule.source,input.source) &&
    selectorMatches(rule.destination,input.destination) &&
    (!rule.paymentMethodId || rule.paymentMethodId === input.paymentMethodId);
}
export function selectPricingRule(settings: ExchangeSettings, input: ExchangeQuoteInput) {
  const matches = (settings.pricingRules ?? []).filter(rule => matchesPricingRule(rule, input))
    .sort((a, b) => pricingSpecificity(b) - pricingSpecificity(a) || b.priority - a.priority);
  if (matches.length > 1 && pricingSpecificity(matches[0]) === pricingSpecificity(matches[1]) &&
      matches[0].priority === matches[1].priority)
    throw new HttpError(409, "Ambiguous pricing rules. Resolve overlapping selectors and priority before quoting.");
  return matches[0];
}
export function validatePricingRules(settings: ExchangeSettings) {
  const rules = settings.pricingRules ?? [];
  if (new Set(rules.map(rule => rule.id)).size !== rules.length) throw new HttpError(400, "Duplicate pricing rule identifiers.");
  const valid = (id: string) => ["*","crypto:*","fiat:*"].includes(id) || (isFiat(id) && selectedFiats(settings).includes(id.slice(5))) || settings.networks.some(n => n.assetNetworkId === id);
  for (const rule of rules) {
    if (!rule.enabled) continue; // Retain retired and historical rule definitions without reactivating them.
    if (!valid(rule.source) || !valid(rule.destination)) throw new HttpError(400, "Pricing rule endpoint does not belong to this Exchange.");
    if (rule.source === rule.destination && !["*","crypto:*"].includes(rule.source)) throw new HttpError(400, "Pricing rule requires distinct endpoints or Any.");
    const categoryEndpoint=(id:string,side:string)=>id==="crypto:*"?`sample:${side}`:id==="fiat:*"?"fiat:USD":id;
    if (!["swap","convert"].includes(rule.action) ||
        (rule.source !== "*" && rule.destination !== "*" && !validActionPair(rule.action,categoryEndpoint(rule.source,"source"),categoryEndpoint(rule.destination,"destination"))) ||
        (rule.action === "convert" && (isFiat(rule.source) || isFiat(rule.destination))))
      throw new HttpError(400, "Pricing rule endpoints do not match its action.");
    if (rule.rate !== undefined && decimal(rule.rate) <= 0n) throw new HttpError(400, "Pricing rule manual rate must be positive.");
    if (rule.paymentMethodId && (rule.action !== "swap" ||
        !settings.paymentMethods.some(m => m.id === rule.paymentMethodId && m.enabled)))
      throw new HttpError(400, "Pricing rule payment method is not available for this Exchange action.");
  }
  const compatible = (a: string, b: string) => selectorMatches(a,b) || selectorMatches(b,a);
  for (let i = 0; i < rules.length; i++) for (let j = i + 1; j < rules.length; j++) {
    const a = rules[i], b = rules[j];
    if (a.enabled && b.enabled && a.action === b.action && a.priority === b.priority &&
        pricingSpecificity(a) === pricingSpecificity(b) && compatible(a.source, b.source) &&
        compatible(a.destination, b.destination) && (!a.paymentMethodId || !b.paymentMethodId || a.paymentMethodId === b.paymentMethodId))
      throw new HttpError(400, "Enabled pricing rules overlap at the same specificity and priority.");
  }
}

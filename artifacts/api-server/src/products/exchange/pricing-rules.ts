import type { ExchangePricingRule, ExchangeQuoteInput, ExchangeSettings } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { decimal } from "../../modules/entitlements/decimal";

/**
 * Adapted from the package's manual-desk-pricing selector contract: immutable
 * endpoint identities, Any-side wildcards, specificity before explicit priority.
 * Rules only price existing tenant routes; they never enable routes or execution.
 */
export function pricingSpecificity(rule: ExchangePricingRule) {
  return Number(rule.source !== "*") + Number(rule.destination !== "*") + Number(Boolean(rule.paymentMethodId));
}
export function matchesPricingRule(rule: ExchangePricingRule, input: ExchangeQuoteInput) {
  return rule.enabled && rule.action === input.action &&
    (rule.source === "*" || rule.source === input.source) &&
    (rule.destination === "*" || rule.destination === input.destination) &&
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
  const fiat = `fiat:${settings.fiatCurrency}`;
  const valid = (id: string) => id === "*" || id === fiat || settings.networks.some(n => n.assetNetworkId === id);
  for (const rule of rules) {
    if (!valid(rule.source) || !valid(rule.destination)) throw new HttpError(400, "Pricing rule endpoint does not belong to this Exchange.");
    if (rule.source === rule.destination && rule.source !== "*") throw new HttpError(400, "Pricing rule requires distinct endpoints or Any.");
    if ((rule.action === "buy" && (rule.source !== "*" && rule.source !== fiat || rule.destination === fiat)) ||
        (rule.action === "sell" && (rule.destination !== "*" && rule.destination !== fiat || rule.source === fiat)) ||
        (["swap", "convert"].includes(rule.action) && (rule.source === fiat || rule.destination === fiat)))
      throw new HttpError(400, "Pricing rule endpoints do not match its action.");
    if (rule.rate !== undefined && decimal(rule.rate) <= 0n) throw new HttpError(400, "Pricing rule manual rate must be positive.");
    if (rule.paymentMethodId && (!["buy", "sell"].includes(rule.action) ||
        !settings.paymentMethods.some(m => m.id === rule.paymentMethodId && m[rule.action as "buy" | "sell"])))
      throw new HttpError(400, "Pricing rule payment method is not available for this Exchange action.");
  }
  const compatible = (a: string, b: string) => a === "*" || b === "*" || a === b;
  for (let i = 0; i < rules.length; i++) for (let j = i + 1; j < rules.length; j++) {
    const a = rules[i], b = rules[j];
    if (a.enabled && b.enabled && a.action === b.action && a.priority === b.priority &&
        pricingSpecificity(a) === pricingSpecificity(b) && compatible(a.source, b.source) &&
        compatible(a.destination, b.destination) && (!a.paymentMethodId || !b.paymentMethodId || a.paymentMethodId === b.paymentMethodId))
      throw new HttpError(400, "Enabled pricing rules overlap at the same specificity and priority.");
  }
}

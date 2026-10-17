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
  const weight = (id:string) => id==="*"?0:["crypto:*","fiat:*"].includes(id)?1:id.startsWith("asset:")?2:4;
  return weight(rule.source)+weight(rule.destination)+Number(Boolean(rule.paymentMethodId));
}
const selectorMatches = (selector:string,id:string, catalog: {assetNetworkId:string;assetId:string}[] = []) => selector==="*" || selector===id ||
  (selector==="crypto:*" && !isFiat(id)) || (selector==="fiat:*" && isFiat(id)) ||
  (selector.startsWith("asset:") && catalog.some(a=>a.assetId===selector.slice(6)&&a.assetNetworkId===id));
export function matchesPricingRule(rule: ExchangePricingRule, input: ExchangeQuoteInput, catalog: {assetNetworkId:string;assetId:string}[] = []) {
  return (rule.state==="blocked" || (rule.enabled && rule.state!=="disabled")) && rule.action === input.action &&
    selectorMatches(rule.source,input.source,catalog) &&
    selectorMatches(rule.destination,input.destination,catalog) &&
    (!rule.paymentMethodId || rule.paymentMethodId === input.paymentMethodId);
}
export function selectPricingRule(settings: ExchangeSettings, input: ExchangeQuoteInput, catalog: {assetNetworkId:string;assetId:string}[] = []) {
  const route=settings.routes.find(r=>r.action===input.action&&r.source===input.source&&r.destination===input.destination);
  const matches = (settings.pricingRules ?? []).filter(rule => matchesPricingRule(rule, input,catalog)&&
    (!rule.routeIds?.length||Boolean(route&&rule.routeIds.includes(route.id))))
    .sort((a, b) => pricingSpecificity(b) - pricingSpecificity(a) || b.priority - a.priority);
  if (matches.length > 1 && pricingSpecificity(matches[0]) === pricingSpecificity(matches[1]) &&
      matches[0].priority === matches[1].priority)
    throw new HttpError(409, "Ambiguous pricing rules. Resolve overlapping selectors and priority before quoting.");
  const selected=matches[0];
  if(selected?.state==="blocked")throw new HttpError(409,"This direction is blocked by its matched pricing rule.");
  return selected;
}
export function validatePricingRules(settings: ExchangeSettings,catalog:{assetNetworkId:string;assetId:string}[] = []) {
  const rules = settings.pricingRules ?? [];
  if (new Set(rules.map(rule => rule.id)).size !== rules.length) throw new HttpError(400, "Duplicate pricing rule identifiers.");
  const valid = (id: string) => ["*","crypto:*","fiat:*"].includes(id) || (isFiat(id) && selectedFiats(settings).includes(id.slice(5))) || settings.networks.some(n => n.assetNetworkId === id);
  for (const rule of rules) {
    if (( !rule.enabled || rule.state==="disabled") && rule.state!=="blocked") continue; // Historical records remain intact.
    const endpointValid=(id:string)=>valid(id)||(id.startsWith("asset:")&&settings.assets.some(a=>a.assetId===id.slice(6)));
    if (!endpointValid(rule.source) || !endpointValid(rule.destination)) throw new HttpError(400, "Pricing rule endpoint does not belong to this Exchange.");
    if (rule.source === rule.destination && !["*","crypto:*"].includes(rule.source)&&!rule.source.startsWith("asset:")) throw new HttpError(400, "Pricing rule requires distinct endpoints or Any.");
    const categoryEndpoint=(id:string,side:string)=>id==="crypto:*"||id.startsWith("asset:")?`sample:${side}`:id==="fiat:*"?"fiat:USD":id;
    if (!["swap","convert"].includes(rule.action) ||
        (rule.source !== "*" && rule.destination !== "*" && !validActionPair(rule.action,categoryEndpoint(rule.source,"source"),categoryEndpoint(rule.destination,"destination"))) ||
        (rule.action === "convert" && (isFiat(rule.source) || isFiat(rule.destination))))
      throw new HttpError(400, "Pricing rule endpoints do not match its action.");
    if (rule.rate !== undefined && decimal(rule.rate) <= 0n) throw new HttpError(400, "Pricing rule manual rate must be positive.");
    if(rule.pricingMode==="market" && rule.rate!==undefined)throw new HttpError(400,"A market rule cannot also set a manual rate.");
    if(rule.pricingMode==="manual" && !rule.rate)throw new HttpError(400,"An explicit manual rule requires a positive manual rate.");
    if(rule.minimum!==undefined&&rule.maximum!==undefined&&decimal(rule.minimum)>decimal(rule.maximum))throw new HttpError(400,"Rule minimum exceeds maximum.");
    if(rule.routeIds?.some(id=>!settings.routes.some(r=>r.id===id&&r.action===rule.action&&selectorMatches(rule.source,r.source,catalog)&&
      selectorMatches(rule.destination,r.destination,catalog)&&(!rule.paymentMethodId||r.paymentMethodIds.includes(rule.paymentMethodId)))))
      throw new HttpError(400,"Rule restriction references an unknown or incompatible route.");
    if (rule.paymentMethodId && (rule.action !== "swap" ||
        !settings.paymentMethods.some(m => m.id === rule.paymentMethodId && m.enabled)))
      throw new HttpError(400, "Pricing rule payment method is not available for this Exchange action.");
  }
  const compatible = (a: string, b: string) => selectorMatches(a,b,catalog) || selectorMatches(b,a,catalog);
  for (let i = 0; i < rules.length; i++) for (let j = i + 1; j < rules.length; j++) {
    const a = rules[i], b = rules[j];
    if ((a.state==="blocked"||(a.enabled&&a.state!=="disabled")) && (b.state==="blocked"||(b.enabled&&b.state!=="disabled")) &&
        (!a.routeIds?.length||!b.routeIds?.length||a.routeIds.some(id=>b.routeIds!.includes(id))) && a.action === b.action && a.priority === b.priority &&
        pricingSpecificity(a) === pricingSpecificity(b) && compatible(a.source, b.source) &&
        compatible(a.destination, b.destination) && (!a.paymentMethodId || !b.paymentMethodId || a.paymentMethodId === b.paymentMethodId))
      throw new HttpError(400, "Enabled pricing rules overlap at the same specificity and priority.");
  }
}

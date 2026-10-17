type Route = { enabled: boolean; action: string; source: string; destination: string };

/** Must match the server: exact endpoints outrank typed groups, then Any. */
export function pricingRuleSpecificity(rule: { source: string; destination: string; paymentMethodId?: string | null }) {
  const weight = (id: string) => id === '*' ? 0 : id === 'crypto:*' || id === 'fiat:*' ? 1 : id.startsWith('asset:') ? 2 : 4;
  return weight(rule.source) + weight(rule.destination) + Number(Boolean(rule.paymentMethodId));
}
type PriceRule={enabled:boolean;state?:string;action:string;source:string;destination:string;priority:number;paymentMethodId?:string;routeIds?:string[]};
export const activePricingRule=(r:PriceRule)=>r.state==="blocked"||(r.enabled&&r.state!=="disabled");
/** One conflict predicate for both the rule drawer and whole-draft validation. */
export function pricingRulesConflict(a:PriceRule,b:PriceRule,catalog:readonly{assetId:string;assetNetworkId:string}[]){
  const crypto=(id:string)=>id!=="fiat:*"&&!id.startsWith("fiat:");
  const asset=(id:string)=>id.startsWith("asset:")?id.slice(6):catalog.find(c=>c.assetNetworkId===id)?.assetId;
  const overlap=(x:string,y:string)=>x==="*"||y==="*"||x===y||
    (x==="crypto:*"&&crypto(y))||(y==="crypto:*"&&crypto(x))||
    (x==="fiat:*"&&y.startsWith("fiat:"))||(y==="fiat:*"&&x.startsWith("fiat:"))||
    (x.startsWith("asset:")&&asset(x)===asset(y))||(y.startsWith("asset:")&&asset(x)===asset(y));
  return activePricingRule(a)&&activePricingRule(b)&&a.action===b.action&&a.priority===b.priority&&
    pricingRuleSpecificity(a)===pricingRuleSpecificity(b)&&overlap(a.source,b.source)&&overlap(a.destination,b.destination)&&
    (!a.paymentMethodId||!b.paymentMethodId||a.paymentMethodId===b.paymentMethodId)&&
    (!a.routeIds?.length||!b.routeIds?.length||a.routeIds.some(id=>b.routeIds!.includes(id)));
}

/** Disabled historical selections must not block unrelated settings saves. */
export function routeEndpointsCompatible(route: Route, fiatCodes: readonly string[], networks: ReadonlySet<string>) {
  if (!route.enabled) return true;
  const fiat = (id: string) => id.startsWith('fiat:') && fiatCodes.includes(id.slice(5));
  const crypto = (id: string) => networks.has(id);
  if (route.action === 'swap')
    return (fiat(route.source) && crypto(route.destination)) || (crypto(route.source) && fiat(route.destination));
  if (route.action === 'convert')
    return crypto(route.source) && crypto(route.destination) && route.source !== route.destination;
  return false; // Retired Buy/Sell offerings cannot become active again.
}

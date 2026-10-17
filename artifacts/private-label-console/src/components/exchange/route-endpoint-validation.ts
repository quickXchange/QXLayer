type Route = { enabled: boolean; action: string; source: string; destination: string };

/** Must match the server: exact endpoints outrank typed groups, then Any. */
export function pricingRuleSpecificity(rule: { source: string; destination: string; paymentMethodId?: string | null }) {
  const weight = (id: string) => id === '*' ? 0 : id === 'crypto:*' || id === 'fiat:*' ? 1 : 4;
  return weight(rule.source) + weight(rule.destination) + Number(Boolean(rule.paymentMethodId));
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

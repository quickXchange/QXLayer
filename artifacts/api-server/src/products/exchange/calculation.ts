import type { ExchangeSettings, ExchangeCatalogAsset, ExchangeQuoteInput, ExchangeQuote } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { decimal, decimalString } from "../../modules/entitlements/decimal";

const SCALE = 10n ** 18n;
const BPS = 10000n;
/** Integer-only fixed-point math. Output always rounds down to asset precision. */
export function calculateQuote(s: ExchangeSettings, catalog: ExchangeCatalogAsset[], input: ExchangeQuoteInput) {
  if (!s.enabled || !s.actions[input.action]) throw new HttpError(409, "This exchange action is paused.");
  const route = s.routes.find(r => r.enabled && r.action === input.action && r.source === input.source && r.destination === input.destination);
  if (!route) throw new HttpError(400, "No enabled route exists for this action and asset/network pair.");
  const amount = decimal(input.amount);
  if (amount <= 0n || amount < decimal(route.minimum) || amount > decimal(route.maximum)) throw new HttpError(400, `Amount must be between ${route.minimum} and ${route.maximum}.`);
  const endpoint = (id: string) => {
    if (id === `fiat:${s.fiatCurrency}`) return { symbol: s.fiatCurrency, decimals: 2, networkFee: 0n, planRate: s.fiatPlanRate, network: null };
    const c = catalog.find(a => a.assetNetworkId === id);
    const a = c && s.assets.find(a => a.assetId === c.assetId && a.enabled);
    const n = s.networks.find(n => n.assetNetworkId === id && n.enabled && n.available);
    if (!c || !a || !n) throw new HttpError(409, "An asset or network on this route is disabled or unavailable.");
    return { symbol: a.symbol, decimals: a.decimals, networkFee: decimal(n.fee), planRate: a.sandboxPlanRate, network: n };
  };
  const source = endpoint(input.source), destination = endpoint(input.destination);
  if (amount % (10n ** BigInt(18 - source.decimals)) !== 0n) throw new HttpError(400, `Source amount supports at most ${source.decimals} decimal places.`);
  let paymentMethod: string | null = null;
  if (input.action === "buy" || input.action === "sell") {
    const method = s.paymentMethods.find(m => m.id === input.paymentMethodId && m.enabled && m[input.action as "buy" | "sell"] && route.paymentMethodIds.includes(m.id));
    if (!method) throw new HttpError(400, "Select an enabled sandbox payment method for this route.");
    paymentMethod = method.label;
  } else if (input.paymentMethodId) throw new HttpError(400, "Payment methods apply only to Buy or Sell.");
  const effectiveRate = decimal(route.rate) * (BPS - BigInt(route.spreadBps)) / BPS;
  // All service fees are in SOURCE units. Destination network fees are OUTPUT units.
  const fee = amount * BigInt(route.feeBps) / BPS + decimal(route.fixedFee) + source.networkFee;
  if (fee >= amount) throw new HttpError(400, "The amount does not cover the configured sandbox fees.");
  let output = (amount - fee) * effectiveRate / SCALE - destination.networkFee;
  const quantum = 10n ** BigInt(18 - destination.decimals);
  output = output > 0n ? output / quantum * quantum : 0n;
  if (output <= 0n) throw new HttpError(400, "The calculated output is below the destination precision or fees.");
  for (const [e, v] of [[source, amount], [destination, output]] as const) {
    if (e.network && (v < decimal(e.network.minimum) || v > decimal(e.network.maximum))) throw new HttpError(400, `Amount on ${e.symbol} is outside this network's minimum/maximum.`);
  }
  if (decimal(source.planRate) <= 0n) throw new HttpError(409, "Configure a positive sandbox reference rate in the plan currency before quoting this source.");
  const volume = amount * decimal(source.planRate) / SCALE;
  if (volume <= 0n) throw new HttpError(400, "The sandbox plan-currency volume is below supported precision.");
  const quote: Omit<ExchangeQuote, "token" | "expiresAt"> = {
    routeId: route.id, action: input.action, source: input.source, destination: input.destination,
    sourceSymbol: source.symbol, destinationSymbol: destination.symbol,
    inputAmount: decimalString(amount), outputAmount: decimalString(output),
    rate: decimalString(effectiveRate), fee: decimalString(fee),
    destinationFee: decimalString(destination.networkFee),
    minimum: route.minimum, maximum: route.maximum, spreadBps: route.spreadBps, sandboxOnly: true,
  };
  return { quote, volume: decimalString(volume), paymentMethod };
}
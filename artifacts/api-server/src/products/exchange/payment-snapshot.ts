import type { ExchangeSettings, ExchangeQuoteInput } from "@workspace/api-zod";
import { isFiat, methodCurrencies } from "./global-catalog";

/** Freeze operator-owned instructions, never arbitrary client-supplied fields. */
export function paymentInstructionsSnapshot(settings: ExchangeSettings, input: ExchangeQuoteInput): string | null {
  const fiatSwap = input.action === "swap" && (isFiat(input.source) || isFiat(input.destination));
  if (!fiatSwap && input.action !== "buy" && input.action !== "sell") return null;
  const route = settings.routes.find(r => r.enabled && r.action === input.action && r.source === input.source && r.destination === input.destination);
  const currency = (isFiat(input.source) ? input.source : input.destination).slice(5);
  const method = settings.paymentMethods.find(m => m.enabled && (fiatSwap ? methodCurrencies(m).includes(currency) : m[input.action as "buy" | "sell"]) &&
    m.id === input.paymentMethodId && route?.paymentMethodIds.includes(m.id));
  if (!method) return null;
  const account = Object.entries(method.accountFields ?? {}).map(([k,v])=>`${k}: ${v}`).join("\n");
  return [method.instructions?.trim(),account].filter(Boolean).join("\n") || null;
}

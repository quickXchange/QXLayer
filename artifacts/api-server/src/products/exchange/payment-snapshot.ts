import type { ExchangeSettings, ExchangeQuoteInput } from "@workspace/api-zod";

/** Freeze operator-owned instructions, never arbitrary client-supplied fields. */
export function paymentInstructionsSnapshot(settings: ExchangeSettings, input: ExchangeQuoteInput): string | null {
  if (input.action !== "buy" && input.action !== "sell") return null;
  const route = settings.routes.find(r => r.enabled && r.action === input.action && r.source === input.source && r.destination === input.destination);
  const method = settings.paymentMethods.find(m => m.enabled && m[input.action as "buy" | "sell"] &&
    m.id === input.paymentMethodId && route?.paymentMethodIds.includes(m.id));
  return method?.instructions?.trim() || null;
}

import type { ExchangeSettings, ExchangeQuoteInput } from "@workspace/api-zod";
import { isFiat, methodCurrencies } from "./global-catalog";

export function fundingWalletSnapshot(s:ExchangeSettings,input:ExchangeQuoteInput){
 if(isFiat(input.source)||!s.routes.some(r=>r.enabled&&r.action===input.action&&r.source===input.source&&r.destination===input.destination))return undefined;
 const w=s.wallets?.find(w=>w.purpose==="customer"&&w.enabled&&w.assetNetworkId===input.source);
 return w?{paymentAddress:w.address,paymentMemo:w.memo}:undefined;
}

/** Freeze operator-owned instructions, never arbitrary client-supplied fields. */
export function paymentInstructionsSnapshot(settings: ExchangeSettings, input: ExchangeQuoteInput): string | null {
  if(["swap","convert"].includes(input.action)&&!isFiat(input.source)){
    const wallet=fundingWalletSnapshot(settings,input);
    return wallet?`Sandbox only — never send funds.\nAddress: ${wallet.paymentAddress}${wallet.paymentMemo?`\nMemo/tag: ${wallet.paymentMemo}`:""}`:null;
  }
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

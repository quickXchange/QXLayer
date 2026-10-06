import { randomUUID } from "node:crypto";
import type { ExchangeCatalogAsset, ExchangeSettings } from "@workspace/api-zod";
import { websiteSettings } from "../../modules/website/settings";

// A descriptor of the ONE existing renderer, not copied customer source code.
export const EXCHANGE_MASTER = Object.freeze({
  key: "standard-exchange",
  version: 1,
  renderer: "shared-tenant-exchange",
  execution: "sandbox_only",
});

export function masterWebsiteDefaults(websiteName: string) {
  return websiteSettings(websiteName, {
    templateKey: EXCHANGE_MASTER.key,
    websiteName, heroTitle: "Your next exchange starts here.",
    heroSubtitle: `Swap, convert, buy and sell with ${websiteName}. Explore your configured exchange without moving real funds.`,
    secondaryColor: "#18263c",
    faq: [
      { question: "Is this a live exchange?", answer: "No. This is a sandbox. Quotes and orders are simulations; no funds, deposits, wallets, blockchain transactions or real payments are involved." },
      { question: "Which assets and networks are supported?", answer: "The asset and network lists show the configuration selected for this Exchange. Availability, limits and fees follow the tenant's saved settings." },
      { question: "How do I check an order?", answer: "After creating a simulated order, keep its private tracking link. The link shows sandbox status updates without exposing other visitors' orders." },
      { question: "How do buy and sell work?", answer: "If enabled, buy and sell use the configured sandbox payment methods and illustrative rates. No payment is requested or processed." },
    ],
    footerText: `${websiteName} · Sandbox only. No funds, wallets, blockchain transactions or real payments.`,
    termsContent: "Sandbox only. All rates, orders and payment methods are simulations. No funds are accepted or transferred.",
    privacyContent: "Do not enter personal information or real financial credentials in this sandbox.",
  });
}

/** Fresh IDs/objects every time. Never reads or copies a reference tenant. */
export function masterExchangeDefaults(catalog: ExchangeCatalogAsset[], actions: string[], currency: string): ExchangeSettings {
  if (!["USD", "EUR", "GBP"].includes(currency)) throw new Error("Choose a supported Exchange fiat currency.");
  const fiatCurrency = currency as ExchangeSettings["fiatCurrency"];
  const requested = new Set(actions);
  const enabledActions = Object.fromEntries(["swap", "convert", "buy", "sell"].map(a => [a, requested.has(a)])) as ExchangeSettings["actions"];
  const pairs = catalog.slice(0, 2);
  const methods = requested.has("buy") || requested.has("sell") ? [{
    id: randomUUID(), label: "Sandbox bank transfer", enabled: true,
    currency: fiatCurrency, buy: requested.has("buy"), sell: requested.has("sell"),
  }] : [];
  const routes: ExchangeSettings["routes"] = [];
  if (pairs.length >= 2) for (const action of ["swap", "convert", "buy", "sell"] as const) {
    if (!requested.has(action)) continue;
    routes.push({
      id: randomUUID(), action,
      source: action === "buy" ? `fiat:${currency}` : pairs[0].assetNetworkId,
      destination: action === "sell" ? `fiat:${currency}` : pairs[1].assetNetworkId,
      enabled: true, rate: "1", minimum: "0.01", maximum: "100",
      feeBps: 0, spreadBps: 0, fixedFee: "0",
      paymentMethodIds: ["buy", "sell"].includes(action) ? methods.map(m => m.id) : [],
    });
  }
  return {
    enabled: false, defaultAction: (actions[0] ?? "swap") as ExchangeSettings["defaultAction"],
    publicNote: "Sandbox configuration. Illustrative 1:1 reference rates require review; no live pricing or execution.",
    fiatCurrency, fiatPlanRate: "1", actions: enabledActions,
    assets: [...new Map(pairs.map(p => [p.assetId, p])).values()].map((p, i) => ({
      assetId: p.assetId, symbol: p.symbol, decimals: 8, enabled: true, displayOrder: i, logoUrl: null, sandboxPlanRate: "1",
    })),
    networks: pairs.map(p => ({ assetNetworkId: p.assetNetworkId, enabled: true, available: true,
      minimum: "0.01", maximum: "100", fee: "0", information: "Sandbox only. No deposits or blockchain execution." })),
    paymentMethods: methods, routes, providers: [],
  };
}

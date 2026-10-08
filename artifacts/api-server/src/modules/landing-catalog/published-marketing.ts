// Public marketing content verified against CURRENT Development, not tenant
// data or an old seed. No prices, accounts, execution configuration or writes.
const definitions = [
  ["crypto_exchange", "White Label Exchange — Swap / Convert / Buy & Sell", "Your brand at the center of the exchange experience. Configure swap, convert, buy and sell journeys on the shared White Label Core. Currently a non-executing sandbox.", "exchange"],
  ["crypto_payments", "Crypto Payment Gateway", "Bring branded crypto payment experiences into your ecosystem. Merchant checkout and payment infrastructure are planned; payment processing is not implemented.", "payments"],
  ["crypto_engine", "Crypto Engine", "A planned orchestration layer connecting your crypto products through one modular platform. Financial execution and provider integrations are not implemented.", "engine"],
  ["ios_app", "iOS App", "Extend your brand to a native iOS experience connected to the same White Label platform. Mobile application development is planned, not available today.", "ios"],
  ["android_app", "Android App", "Bring your ecosystem to Android with a branded mobile experience and shared platform configuration. Mobile application development is planned.", "android"],
  ["crypto_card", "Crypto Card", "A planned branded card offering within your wider crypto ecosystem. Card issuance, spending and provider integrations are not implemented.", "card"],
  ["staking", "Staking API", "A planned staking interface for future integration into your branded products. No staking engine, rewards or blockchain execution is connected.", "staking"],
  ["earn", "Earn API", "A planned API layer for future earning products in your ecosystem. Yield generation, balances and financial execution are not implemented.", "earn"],
  ["dex", "DEX", "A planned decentralized exchange experience under your brand. Smart contracts, liquidity routing and trade execution are not implemented.", "dex"],
  ["articles", "Articles / Content", "A planned publishing product for branded articles, education and ecosystem updates. The editorial CMS is not implemented yet.", "content"],
  ["telegram_bot", "Telegram Bot", "A planned conversational entry point for your branded ecosystem on Telegram. Bot delivery and financial actions are not implemented.", "telegram"],
  ["telegram_mini_app", "Telegram Mini App", "A planned compact branded experience inside Telegram, connected to the shared platform. Mini App development and integration are deferred.", "miniapp"],
  ["whatsapp_bot", "WhatsApp Bot", "A planned messaging channel for your branded customer experience. WhatsApp delivery and provider integrations are not implemented.", "whatsapp"],
  ["rpc_nodes", "RPC / Nodes", "A planned infrastructure offering for blockchain connectivity. No node hosting, RPC endpoints or live blockchain services are provided today.", "nodes"],
  ["cloud_mining", "Cloud Mining", "A planned mining product in the modular ecosystem. Mining execution, contracts and returns are not implemented or offered.", "mining"],
] as const;

export const publishedMarketingProducts = definitions.map(([key, name, description, icon], index) => ({
  key, visible: true, name, description, icon,
  startingPrice: null, setupFee: null, currency: "USD", billingPeriod: "on_request",
  status: key === "crypto_exchange" ? "available" : "coming_soon",
  ctaLabel: "Learn More", displayOrder: (index + 1) * 10,
  readiness: key === "crypto_exchange" ? "sandbox_only" : "planned",
}));

export function selectPublicCatalog(databaseProducts: unknown[], hasStoredProducts: boolean, production: boolean) {
  // Do not replace an intentional hide-all configuration, a partially populated
  // catalog, or any Development state. Database errors are never caught here.
  if (production && !hasStoredProducts && databaseProducts.length === 0) {
    return { source: "published-marketing" as const, products: publishedMarketingProducts };
  }
  return { source: "database" as const, products: databaseProducts };
}

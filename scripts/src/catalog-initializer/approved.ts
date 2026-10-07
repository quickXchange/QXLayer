// Reviewed platform-global marketing definitions only. Kolo is deliberately excluded.
const rows = [
  ["crypto_exchange", "White Label Exchange — Swap / Convert / Buy & Sell", "Your brand at the center of the exchange experience. Configure swap, convert, buy and sell journeys on the shared White Label Core. Currently a non-executing sandbox.", "exchange", "available", 10],
  ["crypto_payments", "Crypto Payment Gateway", "Bring branded crypto payment experiences into your ecosystem. Merchant checkout and payment infrastructure are planned; payment processing is not implemented.", "payments", "coming_soon", 20],
  ["crypto_engine", "Crypto Engine", "A planned orchestration layer connecting your crypto products through one modular platform. Financial execution and provider integrations are not implemented.", "engine", "coming_soon", 30],
  ["ios_app", "iOS App", "Extend your brand to a native iOS experience connected to the same White Label platform. Mobile application development is planned, not available today.", "ios", "coming_soon", 40],
  ["android_app", "Android App", "Bring your ecosystem to Android with a branded mobile experience and shared platform configuration. Mobile application development is planned.", "android", "coming_soon", 50],
  ["crypto_card", "Crypto Card", "A planned branded card offering within your wider crypto ecosystem. Card issuance, spending and provider integrations are not implemented.", "card", "coming_soon", 60],
  ["staking", "Staking API", "A planned staking interface for future integration into your branded products. No staking engine, rewards or blockchain execution is connected.", "staking", "coming_soon", 70],
  ["earn", "Earn API", "A planned API layer for future earning products in your ecosystem. Yield generation, balances and financial execution are not implemented.", "earn", "coming_soon", 80],
  ["dex", "DEX", "A planned decentralized exchange experience under your brand. Smart contracts, liquidity routing and trade execution are not implemented.", "dex", "coming_soon", 90],
  ["articles", "Articles / Content", "A planned publishing product for branded articles, education and ecosystem updates. The editorial CMS is not implemented yet.", "content", "coming_soon", 100],
  ["telegram_bot", "Telegram Bot", "A planned conversational entry point for your branded ecosystem on Telegram. Bot delivery and financial actions are not implemented.", "telegram", "coming_soon", 110],
  ["telegram_mini_app", "Telegram Mini App", "A planned compact branded experience inside Telegram, connected to the shared platform. Mini App development and integration are deferred.", "miniapp", "coming_soon", 120],
  ["whatsapp_bot", "WhatsApp Bot", "A planned messaging channel for your branded customer experience. WhatsApp delivery and provider integrations are not implemented.", "whatsapp", "coming_soon", 130],
  ["rpc_nodes", "RPC / Nodes", "A planned infrastructure offering for blockchain connectivity. No node hosting, RPC endpoints or live blockchain services are provided today.", "nodes", "coming_soon", 140],
  ["cloud_mining", "Cloud Mining", "A planned mining product in the modular ecosystem. Mining execution, contracts and returns are not implemented or offered.", "mining", "coming_soon", 150],
] as const;

export const approvedProducts = rows.map(([key, name, description, icon, status, displayOrder]) =>
  Object.freeze({ key, name, description, icon, status, displayOrder,
    visible: true, startingPrice: null, setupFee: null, currency: "USD",
    billingPeriod: "on_request", ctaLabel: "Learn More" }));
export const approvedKeys = approvedProducts.map(p => p.key);

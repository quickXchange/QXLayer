/** Declarative built-in manifests. Extending the catalog never changes tenant architecture. */
export const coreRegistry = [
  { key: "crypto_exchange", name: "Exchange", category: "Financial", lifecycle: "sandbox_only", sandboxAvailable: true, requiresAssetNetworks: true,
    features: ["swap", "convert", "buy", "sell"].map((key) => ({ key, label: key === "buy" ? "Buy (Buy/Sell)" : key === "sell" ? "Sell (Buy/Sell)" : key, dependsOn: ["crypto_exchange"] })) },
  { key: "website", name: "Tenant Website", category: "Core", lifecycle: "core_ready", sandboxAvailable: true, requiresAssetNetworks: false, features: [] },
  { key: "merchant_api", name: "API Credentials & Webhooks", category: "Core", lifecycle: "sandbox_only", sandboxAvailable: false, requiresAssetNetworks: false,
    features: ["api_keys", "webhooks"].map((key) => ({ key, label: key, dependsOn: ["merchant_api"] })) },
  ...[
    ["crypto_payments", "Crypto Payments", "Financial"], ["crypto_card", "Crypto Card", "Financial"],
    ["staking", "Staking", "Financial"], ["earn", "Earn", "Financial"], ["dex", "DEX", "Financial"],
    ["telegram_bot", "Telegram Bot", "Channels"], ["telegram_mini_app", "Telegram Mini App", "Channels"],
    ["whatsapp_bot", "WhatsApp Bot", "Channels"], ["ios_app", "iOS App", "Channels"], ["android_app", "Android App", "Channels"],
    ["crypto_engine", "Crypto Engine", "Infrastructure"], ["rpc_nodes", "RPC / Nodes", "Infrastructure"],
    ["cloud_mining", "Cloud Mining", "Infrastructure"], ["kolo", "Kolo", "Products"], ["articles", "Articles / Content", "Content"],
  ].map(([key, name, category]) => ({ key, name, category, lifecycle: "deferred", sandboxAvailable: false, requiresAssetNetworks: key === "crypto_payments", features: [] })),
].map((m) => ({ ...m, description: m.lifecycle === "deferred" ? "Registered for future independent implementation. No execution is implemented." : "Shared platform configuration; financial execution remains disabled.", limits: [] }));
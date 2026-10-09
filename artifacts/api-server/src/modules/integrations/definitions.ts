export const SOURCE_COMMIT = "aef093f1ed73357d741e497a2928624944ff7140";
export const definitions = [
  { key: "1forge", name: "1Forge", capability: "rates", secretFields: ["apiKey"], manualFallback: true },
  { key: "whitebit", name: "WhiteBIT", capability: "deposits", secretFields: ["apiKey", "secretKey", "webhookSecret"], manualFallback: true },
  { key: "quickex", name: "Quickex Convert", capability: "convert", secretFields: ["apiKey", "secretKey"], manualFallback: false },
  { key: "alchemy", name: "Alchemy RPC", capability: "rpc", secretFields: ["rpcUrl", "apiKey"], manualFallback: true },
  { key: "rpc", name: "Blockchain RPC", capability: "rpc", secretFields: ["rpcUrl", "apiKey"], manualFallback: true },
  { key: "telegram_bot", name: "Telegram Bot", capability: "telegram_bot", secretFields: ["botToken", "webhookSecret"], manualFallback: false },
  { key: "telegram_mini_app", name: "Telegram Mini App", capability: "telegram_mini_app", secretFields: [], manualFallback: false },
] as const;
export type IntegrationKey = typeof definitions[number]["key"];

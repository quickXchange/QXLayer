import { pool } from "@workspace/db";
import { coreRegistry } from "./core-registry";

if (process.env.NODE_ENV === "production") throw new Error("Development catalog setup refused in production.");
const assets = [["btc", "BTC", "Bitcoin"], ["eth", "ETH", "Ethereum"], ["usdt", "USDT", "Tether"], ["sol", "SOL", "Solana"], ["bnb", "BNB", "BNB"]];
const networks = [
  ["bitcoin-testnet", "Bitcoin Testnet"], ["ethereum-sepolia", "Ethereum Sepolia"],
  ["solana-devnet", "Solana Devnet"], ["bsc-testnet", "BSC Testnet"], ["tron-nile", "TRON Nile"],
];
const pairs = [
  ["btc", "bitcoin-testnet"], ["eth", "ethereum-sepolia"], ["usdt", "ethereum-sepolia"],
  ["sol", "solana-devnet"], ["bnb", "bsc-testnet"], ["usdt", "bsc-testnet"], ["usdt", "tron-nile"],
];
const features = [
  ["website", "Private-label website"], ["crypto_exchange", "Crypto Exchange"],
  ["crypto_payments", "Crypto Payments"], ["swap", "Swap"], ["convert", "Convert"],
  ["buy", "Buy"], ["sell", "Sell"], ["merchant_api", "Merchant API"],
  ["api_keys", "Sandbox API key configuration"], ["webhooks", "Webhook configuration"],
  ["telegram_bot", "Telegram Bot (deferred)"], ["telegram_mini_app", "Telegram Mini App (deferred)"],
];
const limits = [
  ["max_supported_assets", "Supported assets", "integer"],
  ["max_supported_networks", "Supported networks", "integer"],
  ["max_payment_methods", "Payment method configurations", "integer"],
  ["max_staff", "Staff members", "integer"],
  ["max_api_keys", "Active API keys", "integer"],
  ["max_webhooks", "Webhook configurations", "integer"],
  ["max_monthly_transactions", "Monthly sandbox transaction units", "integer"],
  ["max_monthly_volume", "Monthly volume in plan currency", "decimal"],
];
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const m of coreRegistry) await client.query(
    "INSERT INTO module_catalog (key,name,description,category,sandbox_available,definition) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
    [m.key, m.name, m.description, m.category, m.sandboxAvailable, JSON.stringify(m)],
  );
  for (const m of coreRegistry) for (const f of [{ key: m.key, label: m.name }, ...m.features]) await client.query("INSERT INTO entitlement_definitions (key,label,kind,value_type) VALUES ($1,$2,'feature','boolean') ON CONFLICT DO NOTHING", [f.key, f.label]);
  for (const asset of assets) await client.query("INSERT INTO asset_catalog (id,symbol,name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", asset);
  for (const network of networks) await client.query("INSERT INTO network_catalog (id,name,testnet) VALUES ($1,$2,true) ON CONFLICT DO NOTHING", network);
  for (const [asset, network] of pairs) await client.query("INSERT INTO asset_network_catalog (id,asset_id,network_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [`${asset}:${network}`, asset, network]);
  for (const [key, label] of features) await client.query(
    "INSERT INTO entitlement_definitions (key,label,kind,value_type) VALUES ($1,$2,'feature','boolean') ON CONFLICT DO NOTHING", [key, label],
  );
  for (const [key, label, valueType] of limits) await client.query(
    "INSERT INTO entitlement_definitions (key,label,kind,value_type) VALUES ($1,$2,'limit',$3) ON CONFLICT DO NOTHING", [key, label, valueType],
  );
  await client.query("COMMIT");
  process.stdout.write("Sandbox catalogs seeded; no wallets, secrets, customers, or financial transactions created.\n");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
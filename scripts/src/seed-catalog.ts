import { pool } from "@workspace/db";

if (process.env.NODE_ENV === "production") throw new Error("Development catalog setup refused in production.");
const modules = [
  ["crypto_exchange", "Crypto Exchange", "Exchange, swap, and convert product entitlement. Engine implementation is deferred.", "Financial"],
  ["crypto_payments", "Crypto Payments", "Crypto payment gateway entitlement. Invoice execution is deferred.", "Financial"],
  ["telegram_bot", "Telegram Bot", "Branded bot entitlement using the shared backend. Bot connection is deferred.", "Channels"],
  ["telegram_mini_app", "Telegram Mini App", "Telegram web app entitlement using the same tenant configuration.", "Channels"],
  ["website", "Website", "Branded website entitlement. Website rendering and builder are deferred.", "Channels"],
  ["merchant_api", "Merchant API", "Scoped developer API entitlement. Public merchant endpoints are deferred.", "Developer"],
];
const assets = [["btc", "BTC", "Bitcoin"], ["eth", "ETH", "Ethereum"], ["usdt", "USDT", "Tether"], ["sol", "SOL", "Solana"], ["bnb", "BNB", "BNB"]];
const networks = [
  ["bitcoin-testnet", "Bitcoin Testnet"], ["ethereum-sepolia", "Ethereum Sepolia"],
  ["solana-devnet", "Solana Devnet"], ["bsc-testnet", "BSC Testnet"], ["tron-nile", "TRON Nile"],
];
const pairs = [
  ["btc", "bitcoin-testnet"], ["eth", "ethereum-sepolia"], ["usdt", "ethereum-sepolia"],
  ["sol", "solana-devnet"], ["bnb", "bsc-testnet"], ["usdt", "bsc-testnet"], ["usdt", "tron-nile"],
];
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const [key, name, description, category] of modules) await client.query(
    "INSERT INTO module_catalog (key,name,description,category) VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description",
    [key, name, description, category],
  );
  for (const asset of assets) await client.query("INSERT INTO asset_catalog (id,symbol,name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", asset);
  for (const network of networks) await client.query("INSERT INTO network_catalog (id,name,testnet) VALUES ($1,$2,true) ON CONFLICT DO NOTHING", network);
  for (const [asset, network] of pairs) await client.query("INSERT INTO asset_network_catalog (id,asset_id,network_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [`${asset}:${network}`, asset, network]);
  await client.query("COMMIT");
  process.stdout.write("Sandbox catalogs seeded; no wallets, secrets, customers, or financial transactions created.\n");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
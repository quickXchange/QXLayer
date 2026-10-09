import { createHmac } from "node:crypto";
import { createBlockchainMonitorAdapter } from "./vendor/blockchain-monitoring";
import { safeProviderEndpoint } from "./input";
import { HttpError } from "../../lib/errors";
import { testQuickexCredentials } from "./vendor/quickex/quickex";

// Read-only bridge extracted from the verified QuickXchange transport implementations.
// Credential lookup, nonce allocation and diagnostic persistence are injected tenant boundaries.
export async function testProvider(key: string, settings: Record<string, any>, secrets: Record<string, string>, nonce?: number) {
  const read = async (url: string, init: RequestInit = {}) => {
    const r = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new HttpError(502, r.status === 401 || r.status === 403 ? "Provider rejected authentication or account permissions." : "Provider request failed.");
    return r.json();
  };
  if (key === "1forge") {
    if (!secrets.apiKey) throw new HttpError(409, "API key is not configured.");
    const url = new URL("https://api.1forge.com/quotes");
    url.searchParams.set("pairs", "EUR/USD,USD/EUR"); url.searchParams.set("api_key", secrets.apiKey);
    const quotes = await read(url.toString());
    if (!Array.isArray(quotes) || !quotes.some(q => Number(q.price ?? q.p) > 0 && /EUR|USD/.test(String(q.symbol ?? q.s)))) throw new HttpError(502, "1Forge returned no valid reference rates.");
    return { state: "connected", message: "Reference-rate API verified. Authorized Sandbox pricing may use read-only rates; financial execution remains disabled." };
  }
  if (key === "whitebit") {
    if (!secrets.apiKey || !secrets.secretKey || !nonce) throw new HttpError(409, "WhiteBIT key and secret are required.");
    // Same signed read-only test as QuickXchange; scoped durable nonce replaces its global nonce row.
    const path = "/api/v4/main-account/balance";
    const body = JSON.stringify({ request: path, nonce });
    const payload = Buffer.from(body).toString("base64");
    const signature = createHmac("sha512", secrets.secretKey).update(payload).digest("hex");
    const value = await read("https://whitebit.com" + path, { method: "POST", body, headers: {
      "Content-Type": "application/json", "X-TXC-APIKEY": secrets.apiKey, "X-TXC-PAYLOAD": payload, "X-TXC-SIGNATURE": signature,
    } });
    if (!value || typeof value !== "object" || Array.isArray(value) ||
      ["error", "message", "code", "errors"].some(k => k in value))
      throw new HttpError(502, "WhiteBIT returned an invalid diagnostic response.");
    return { state: "connected", message: "Signed balance API verified. No address, deposit, trade or withdrawal created." };
  }
  if (key === "quickex") {
    if (!secrets.apiKey || !secrets.secretKey) throw new HttpError(409, "Quickex public key and secret are required.");
    await testQuickexCredentials({ publicKey: secrets.apiKey, secretKey: secrets.secretKey });
    return { state: "connected", message: "Source signed Order API and negative authentication control verified. No Convert exchange created." };
  }
  if (key === "rpc" || key === "alchemy") {
    if (!secrets.rpcUrl || !settings.adapterKind || !settings.networkCode) throw new HttpError(409, "RPC URL, network code and adapter kind are required.");
    if (settings.adapterKind === "evm" && !settings.chainId) throw new HttpError(409, "Configure the expected EVM chain ID before verifying this network.");
    safeProviderEndpoint(secrets.rpcUrl);
    const adapter = createBlockchainMonitorAdapter({
      endpoint: secrets.rpcUrl, apiKey: secrets.apiKey, networkCode: settings.networkCode,
      adapterKind: settings.adapterKind, provider: settings.adapterKind === "tron" ? "indexer" : "rpc",
      chainId: settings.chainId, confirmationsRequired: settings.confirmationsRequired ?? 12, requestTimeoutMs: 10000,
    });
    const result = await adapter.testConnection();
    if (!result.connected) throw new HttpError(502, "Blockchain connection was not verified.");
    return { state: "connected", message: "Network adapter verified.", head: result.head, chainId: result.chainId ?? null };
  }
  if (key === "telegram_bot") {
    if (!secrets.botToken || !/^\d+:[A-Za-z0-9_-]+$/.test(secrets.botToken)) throw new HttpError(409, "A valid independent bot token is required.");
    const value = await read(`https://api.telegram.org/bot${secrets.botToken}/getMe`) as { ok?: boolean; result?: { id: number; is_bot?: boolean; username?: string } };
    const identity = value.result;
    if (!value.ok || identity?.is_bot !== true || !Number.isSafeInteger(identity.id) || !/^[A-Za-z0-9_]{5,32}$/.test(identity.username ?? "")) throw new HttpError(502, "Telegram bot identity could not be verified.");
    if (settings.botUsername && identity.username!.toLowerCase() !== settings.botUsername.toLowerCase()) throw new HttpError(409, "The token does not match the configured bot username.");
    return { state: "connected", message: "Telegram bot identity verified. Webhook delivery is not implied.", botUsername: identity.username };
  }
  throw new HttpError(409, "Mini App readiness requires the tenant Bot connection and public URL configuration.");
}

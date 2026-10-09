import { z } from "zod/v4";
import { definitions } from "./definitions";
import { HttpError } from "../../lib/errors";

export const settingsSchema = z.object({
  manualFallback: z.boolean().optional(),
  healthMonitoring: z.boolean().optional(),
  customerActivation: z.boolean().optional(),
  quoteActions: z.array(z.enum(["swap", "convert"])).max(2).optional(),
  adapterKind: z.enum(["evm", "tron", "solana", "bitcoin"]).optional(),
  chainId: z.string().max(100).optional(),
  confirmationsRequired: z.number().int().min(1).max(10000).optional(),
  networkCode: z.string().min(1).max(100).optional(),
  assignments: z.array(z.object({ assetId: z.string().max(100), networkId: z.string().max(100) }).strict()).max(200).optional(),
  botUsername: z.string().regex(/^[A-Za-z0-9_]{5,32}$/).optional(),
  webhookUrl: z.string().url().max(1000).optional(),
  miniAppUrl: z.string().url().max(1000).optional(),
  logoUrl: z.string().max(1000).optional(),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  menu: z.array(z.enum(["swap", "buy", "sell", "convert", "tracking"])).max(5).optional(),
}).strict();
export const saveIntegrationInput = z.object({
  enabled: z.boolean(),
  credentialManagement: z.enum(["super_admin", "customer", "both"]).optional(),
  settings: settingsSchema,
  secrets: z.record(z.string(), z.string().min(1).max(4000)).optional(),
  clearCredentials: z.boolean().optional(),
  reason: z.string().trim().min(2).max(500),
}).strict();
export function definition(key: string) {
  const d = definitions.find(d => d.key === key);
  if (!d) throw new HttpError(404, "Integration is not supported.");
  return d;
}
export function mayManageSecrets(role: string, mode: string) {
  return mode === "both" ? ["super_admin", "client_admin"].includes(role)
    : mode === "super_admin" ? role === "super_admin" : role === "client_admin";
}
export function validateSecrets(providerKey: string, values: Record<string, string>) {
  const d = definition(providerKey);
  if (Object.keys(values).some(k => !(d.secretFields as readonly string[]).includes(k))) throw new HttpError(400, "Unknown credential field.");
}
export function safeProviderEndpoint(value: string) {
  const u = new URL(value);
  const hosts = ["alchemy.com", "g.alchemy.com", "infura.io", "ankr.com", "quicknode.pro", "quiknode.pro", "trongrid.io", "solana.com", "helius-rpc.com", "helius.xyz", "blockstream.info", "mempool.space"];
  if (u.protocol !== "https:" || u.username || u.password || u.hash || u.port && u.port !== "443" ||
      !hosts.some(h => u.hostname === h || u.hostname.endsWith("." + h))) {
    throw new HttpError(400, "Use a supported provider HTTPS endpoint. Custom node hosts require a separately reviewed allowlist.");
  }
  return u;
}

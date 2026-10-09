import type { ExchangeProvider } from "@workspace/api-zod";

/** Catalog describes verified capability, not connectivity inferred from a toggle.
 * Independent credential storage and read-only adapters are managed through Integrations.
 * Adding a future adapter must not make sandbox orders execute real transactions.
 */
export const PROVIDER_CATALOG: ExchangeProvider[] = [
  { id: "manual", name: "Manual / Sandbox", category: "Sandbox pricing", status: "sandbox", functional: true, credentialSupport: false, capabilities: ["swap", "convert", "buy", "sell", "infrastructure"] },
  { id: "whitebit", name: "WhiteBIT", category: "Read-only Sandbox pricing", status: "sandbox", functional: true, credentialSupport: true, capabilities: ["swap", "convert"] },
  { id: "1forge", name: "1Forge", category: "Read-only reference rates", status: "sandbox", functional: true, credentialSupport: true, capabilities: ["swap", "convert"] },
  { id: "quickex", name: "Quickex", category: "Read-only Sandbox Convert quotes", status: "sandbox", functional: true, credentialSupport: true, capabilities: ["convert"] },
  { id: "changenow", name: "ChangeNOW", category: "Exchange", status: "configuration_only", functional: false, credentialSupport: false, capabilities: ["swap", "convert"] },
  { id: "quickx", name: "QuickX", category: "Exchange", status: "configuration_only", functional: false, credentialSupport: false, capabilities: ["swap", "convert"] },
  { id: "crypto-api", name: "Crypto API providers", category: "Infrastructure", status: "coming_soon", functional: false, credentialSupport: false, capabilities: ["infrastructure", "swap"] },
  { id: "node-rpc", name: "Node / RPC providers", category: "Read-only network health", status: "sandbox", functional: true, credentialSupport: true, capabilities: ["infrastructure", "swap"] },
];

export function containsCredential(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, item]) =>
    /^(api[-_]?key|api[-_]?secret|secret|password|token|credentials|authorization|private[-_]?key)$/i.test(key) ||
    containsCredential(item));
}

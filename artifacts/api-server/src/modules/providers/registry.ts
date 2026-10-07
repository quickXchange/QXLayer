import type { ProviderAdapter, ProviderEnvironment, CapabilityResult } from "./contracts";

/** Registration is server-code-only, never a catalog switch or HTTP request. */
export class ProviderRegistry {
  private readonly adapters = new Map<string, ProviderAdapter>();
  register(adapter: ProviderAdapter) {
    if (this.adapters.has(adapter.providerId)) throw new Error("Adapter already registered.");
    this.adapters.set(adapter.providerId, adapter);
  }
  resolve(providerId: string, capability: string, environment: ProviderEnvironment): CapabilityResult<ProviderAdapter> {
    const adapter = this.adapters.get(providerId);
    if (!adapter) return { ok: false, code: "not_implemented", message: "No implemented adapter is registered." };
    if (!adapter.capabilities.has(capability) || !adapter.environments.has(environment)) {
      return { ok: false, code: "unsupported", message: "The adapter does not support this capability/environment." };
    }
    return { ok: true, value: adapter };
  }
}
// Deliberately empty: existing manual Exchange arithmetic is not an external adapter.
export const providerRegistry = new ProviderRegistry();

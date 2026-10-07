import { HttpError } from "../../lib/errors";
import { providerRegistry, type ProviderRegistry } from "./registry";
import type { ProviderEnvironment, VerifiedWebhook } from "./contracts";

export interface VerifiedEventStore {
  /** Must atomically reserve UNIQUE(providerId, environment, tenantId, eventId),
   * process domain event and commit the receipt together. A failed transaction retries.
   */
  processOnce(scope: { providerId: string; environment: ProviderEnvironment; tenantId: string; eventId: string }, event: VerifiedWebhook): Promise<"processed" | "duplicate">;
}
export interface AccountBindingResolver {
  resolveVerifiedBinding(providerId: string, environment: ProviderEnvironment, accountBinding: string): Promise<string | null>;
}
/** No HTTP endpoint is mounted. An unknown provider, failed signature or unbound
 * account cannot supply trusted events. No fake verification/receipt implementation.
 */
export async function receiveProviderWebhook(input: {
  providerId: string; environment: ProviderEnvironment; rawBody: Uint8Array;
  headers: Record<string, string>; credentialReference: string;
}, bindings: AccountBindingResolver, events: VerifiedEventStore, registry: ProviderRegistry = providerRegistry) {
  const resolved = registry.resolve(input.providerId, "webhooks", input.environment);
  if (!resolved.ok || !resolved.value.webhooks) throw new HttpError(501, "Provider webhook verification is not implemented.");
  const adapter = resolved.value.webhooks;
  if (!await adapter.verifyWebhook(input.rawBody, input.headers, input.credentialReference)) throw new HttpError(401, "Webhook signature verification failed.");
  const event = await adapter.normalizeWebhookEvent(input.rawBody);
  if (!event.eventId || !event.accountBinding || !event.eventType) throw new HttpError(400, "Verified webhook lacks required event identity.");
  const tenantId = await bindings.resolveVerifiedBinding(input.providerId, input.environment, event.accountBinding);
  if (!tenantId) throw new HttpError(403, "Verified account is not assigned to a tenant.");
  return events.processOnce({ providerId: input.providerId, environment: input.environment, tenantId, eventId: event.eventId }, event);
}

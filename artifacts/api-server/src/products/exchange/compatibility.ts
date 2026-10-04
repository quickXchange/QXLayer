import type { DatabaseClient } from "@workspace/db";
import { requireFeature, type EffectiveEntitlements } from "../../modules/entitlements/resolver";

/** Legacy API bridge. Exchange action flags do not belong to generic tenant logic. */
export function exchangeProjection(row: { exchange_enabled: boolean }, effective: EffectiveEntitlements) {
  return { exchangeEnabled: Boolean(row.exchange_enabled && effective.features.crypto_exchange) };
}
export async function writeExchangeCompatibility(client: DatabaseClient, tenantId: string, enabled: boolean, effective: EffectiveEntitlements) {
  if (enabled) requireFeature(effective, "crypto_exchange");
  await client.query("UPDATE tenant_configuration SET exchange_enabled=$2 WHERE tenant_id=$1", [tenantId, enabled]);
}
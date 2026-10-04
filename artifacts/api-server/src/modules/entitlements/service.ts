import { withDatabase } from "@workspace/db";
import { contextFor, type Principal } from "../authentication/service";
import { requireFeature, resolveEntitlements } from "./resolver";

export const moduleKeys = ["crypto_exchange", "crypto_payments", "telegram_bot", "telegram_mini_app", "website", "merchant_api"] as const;
export type ModuleKey = typeof moduleKeys[number];

export async function requireEntitlement(principal: Principal, tenantId: string, moduleKey: ModuleKey) {
  return withDatabase(contextFor(principal, tenantId), async (client) => {
    requireFeature(await resolveEntitlements(client, tenantId), moduleKey);
  });
}
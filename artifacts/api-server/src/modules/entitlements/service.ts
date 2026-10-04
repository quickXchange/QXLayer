import { withDatabase } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { contextFor, type Principal } from "../authentication/service";

export const moduleKeys = ["crypto_exchange", "crypto_payments", "telegram_bot", "telegram_mini_app", "website", "merchant_api"] as const;
export type ModuleKey = typeof moduleKeys[number];

export async function requireEntitlement(principal: Principal, tenantId: string, moduleKey: ModuleKey) {
  return withDatabase(contextFor(principal, tenantId), async (client) => {
    const result = await client.query("SELECT module_key FROM tenant_modules WHERE tenant_id=$1 AND module_key=$2 AND enabled=true", [tenantId, moduleKey]);
    if (!result.rowCount) throw new HttpError(403, `${moduleKey} entitlement is disabled for this tenant.`);
  });
}
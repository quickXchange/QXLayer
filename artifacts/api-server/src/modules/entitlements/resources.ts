import { createHash, randomBytes } from "node:crypto";
import { withDatabase, type DatabaseClient } from "@workspace/db";
import { CreateTenantResourceBody, CreateTenantResourceParams } from "@workspace/api-zod";
import type { z } from "zod";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { contextFor, type Principal } from "../authentication/service";
import { decimal, decimalString } from "./decimal";
import { assertOperational, enforceLimit, lockTenant, requireFeature, resolveEntitlements, type EffectiveEntitlements } from "./resolver";
import { safeHttps } from "../website/settings";

export type ResourceType = z.infer<typeof CreateTenantResourceParams>["resourceType"];
type Input = z.infer<typeof CreateTenantResourceBody>;
const limits: Record<ResourceType, string> = { staff: "max_staff", api_keys: "max_api_keys", webhooks: "max_webhooks", payment_methods: "max_payment_methods" };
function access(e: EffectiveEntitlements, type: ResourceType) {
  assertOperational(e);
  if (type === "api_keys") requireFeature(e, "api_keys");
  if (type === "webhooks") requireFeature(e, "webhooks");
  if (type === "payment_methods") requireFeature(e, "crypto_payments");
}
async function readResources(client: DatabaseClient, tenantId: string, type: ResourceType) {
  switch (type) {
    case "staff": return (await client.query("SELECT clerk_user_id AS id,COALESCE(NULLIF(label,''),clerk_user_id) AS label,clerk_user_id AS reference,'active' AS status FROM tenant_memberships WHERE tenant_id=$1 AND role='staff' AND active=true ORDER BY created_at", [tenantId])).rows;
    case "api_keys": return (await client.query("SELECT id,label,NULL::text AS reference,CASE WHEN revoked_at IS NULL THEN 'sandbox · no execution scopes' ELSE 'revoked' END AS status FROM api_keys WHERE tenant_id=$1 ORDER BY label,id", [tenantId])).rows;
    case "webhooks": return (await client.query("SELECT id,label,url AS reference,'configured · delivery deferred' AS status FROM webhook_endpoints WHERE tenant_id=$1 ORDER BY label,id", [tenantId])).rows;
    case "payment_methods": return (await client.query("SELECT id,label,NULL::text AS reference,'sandbox configuration only' AS status FROM tenant_payment_methods WHERE tenant_id=$1 ORDER BY label,id", [tenantId])).rows;
  }
}
export function listResources(principal: Principal, tenantId: string, type: ResourceType) {
  return withDatabase(contextFor(principal, tenantId), async (client) => {
    const e = await resolveEntitlements(client, tenantId);
    if (principal.role !== "super_admin") access(e, type);
    return readResources(client, tenantId, type);
  });
}
export function createResource(principal: Principal, tenantId: string, type: ResourceType, input: Input) {
  if (input.label.trim().length < 2) throw new HttpError(400, "Resource label must contain at least two non-whitespace characters.");
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    const e = await resolveEntitlements(client, tenantId);
    access(e, type);
    const key = limits[type];
    const used = e.usage.find((u) => u.key === key)?.used ?? "0";
    enforceLimit(e, key, decimalString(decimal(used) + decimal("1")));
    let issuedKey: string | null = null;
    let id: string;
    switch (type) {
      case "staff": {
        if (!input.reference || !/^user_[a-zA-Z0-9]+$/.test(input.reference)) throw new HttpError(400, "Provide the existing user's explicit Clerk user ID. This assigns only the read-only staff role.");
        const existing = await client.query("SELECT role,active FROM tenant_memberships WHERE tenant_id=$1 AND clerk_user_id=$2", [tenantId, input.reference]);
        if (existing.rowCount && (existing.rows[0].active || existing.rows[0].role !== "staff")) throw new HttpError(409, "This user already has a tenant role; this endpoint cannot change administrator roles.");
        await client.query(
          "INSERT INTO tenant_memberships (tenant_id,clerk_user_id,role,label) VALUES ($1,$2,'staff',$3) ON CONFLICT (tenant_id,clerk_user_id) DO UPDATE SET active=true,label=EXCLUDED.label",
          [tenantId, input.reference, input.label.trim()],
        );
        id = input.reference;
        break;
      }
      case "api_keys": {
        if (input.reference) throw new HttpError(400, "API keys do not accept a reference value.");
        issuedKey = `pl_sandbox_${randomBytes(32).toString("hex")}`;
        const r = await client.query("INSERT INTO api_keys (tenant_id,label,key_hash) VALUES ($1,$2,$3) RETURNING id", [tenantId, input.label.trim(), createHash("sha256").update(issuedKey).digest("hex")]);
        id = r.rows[0].id;
        break;
      }
      case "webhooks": {
        if (!input.reference) throw new HttpError(400, "Provide a webhook HTTPS URL.");
        safeHttps(input.reference);
        const r = await client.query("INSERT INTO webhook_endpoints (tenant_id,label,url,enabled) VALUES ($1,$2,$3,false) RETURNING id", [tenantId, input.label.trim(), input.reference]);
        id = r.rows[0].id;
        break;
      }
      case "payment_methods": {
        if (input.reference) throw new HttpError(400, "Payment method records are sandbox labels only; provider or wallet references are not accepted.");
        const r = await client.query("INSERT INTO tenant_payment_methods (tenant_id,label) VALUES ($1,$2) RETURNING id", [tenantId, input.label.trim()]);
        id = r.rows[0].id;
        break;
      }
    }
    const item = (await readResources(client, tenantId, type)).find((r) => r.id === id);
    await audit(client, principal, tenantId, `resource.${type}.created`, `Added ${type.replaceAll("_", " ")} configuration`, { resourceId: id, label: input.label, quotaKey: key });
    // The raw key is returned ONCE and is deliberately omitted from logs/audit.
    return { item, issuedKey };
  });
}
export function removeResource(principal: Principal, tenantId: string, type: ResourceType, id: string) {
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    const effective = await resolveEntitlements(client, tenantId);
    assertOperational(effective);
    if (principal.role !== "super_admin") access(effective, type);
    if (type !== "staff" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, "Invalid resource ID.");
    let result;
    switch (type) {
      case "staff": result = await client.query("UPDATE tenant_memberships SET active=false WHERE tenant_id=$1 AND clerk_user_id=$2 AND role='staff' AND active=true RETURNING clerk_user_id", [tenantId, id]); break;
      case "api_keys": result = await client.query("UPDATE api_keys SET revoked_at=now() WHERE tenant_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id", [tenantId, id]); break;
      case "webhooks": result = await client.query("DELETE FROM webhook_endpoints WHERE tenant_id=$1 AND id=$2 RETURNING id", [tenantId, id]); break;
      case "payment_methods": result = await client.query("DELETE FROM tenant_payment_methods WHERE tenant_id=$1 AND id=$2 RETURNING id", [tenantId, id]); break;
    }
    if (!result.rowCount) throw new HttpError(404, "Active resource not found in this tenant.");
    await audit(client, principal, tenantId, `resource.${type}.removed`, `Removed/revoked ${type.replaceAll("_", " ")} configuration`, { resourceId: id });
    return { ok: true };
  });
}
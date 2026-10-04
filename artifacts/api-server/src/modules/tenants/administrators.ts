import { withDatabase } from "@workspace/db";
import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { contextFor, requireSuperAdmin, type Principal } from "../authentication/service";
import { assertOperational, lockTenant, resolveEntitlements } from "../entitlements/resolver";

export function listTenantAdministrators(principal: Principal, tenantId: string) {
  if (principal.role !== "super_admin" && !principal.memberships.some((m) => m.tenantId === tenantId && m.role === "client_admin")) throw new HttpError(403, "Administrator access required.");
  return withDatabase(contextFor(principal, tenantId), async (client) => (await client.query("SELECT clerk_user_id AS id,label,clerk_user_id AS reference,CASE WHEN active THEN 'active' ELSE 'inactive' END AS status FROM tenant_memberships WHERE tenant_id=$1 AND role='client_admin' ORDER BY created_at", [tenantId])).rows);
}
export function assignTenantAdministrator(principal: Principal, tenantId: string, userId: string, label: string) {
  requireSuperAdmin(principal);
  if (!/^user_[a-zA-Z0-9]+$/.test(userId) || label.trim().length < 2) throw new HttpError(400, "Provide an existing Clerk user ID and a label.");
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    assertOperational(await resolveEntitlements(client, tenantId));
    await client.query("INSERT INTO tenant_memberships (tenant_id,clerk_user_id,role,label) VALUES ($1,$2,'client_admin',$3) ON CONFLICT (tenant_id,clerk_user_id) DO UPDATE SET role='client_admin',active=true,label=EXCLUDED.label,permissions='{}'", [tenantId, userId, label.trim()]);
    await audit(client, principal, tenantId, "client_admin.assigned", "Super Admin assigned Client Admin access", { userId });
    return { ok: true };
  });
}
export function setTenantAdministratorStatus(principal: Principal, tenantId: string, userId: string, active: boolean) {
  requireSuperAdmin(principal);
  return withDatabase(contextFor(principal, tenantId, true), async (client) => {
    await lockTenant(client, tenantId);
    if (active) assertOperational(await resolveEntitlements(client, tenantId));
    const result = await client.query("UPDATE tenant_memberships SET active=$3 WHERE tenant_id=$1 AND clerk_user_id=$2 AND role='client_admin' RETURNING clerk_user_id", [tenantId, userId, active]);
    if (!result.rowCount) throw new HttpError(404, "Client Admin not found.");
    await audit(client, principal, tenantId, active ? "client_admin.activated" : "client_admin.revoked", "Super Admin changed Client Admin access", { userId });
    return { ok: true };
  });
}
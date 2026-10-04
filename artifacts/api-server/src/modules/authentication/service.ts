import { withDatabase, type DatabaseContext } from "@workspace/db";
import { HttpError } from "../../lib/errors";

export interface Membership {
  tenantId: string;
  role: "client_admin" | "staff";
  permissions?: string[];
}
export interface Principal {
  userId: string;
  role: "super_admin" | "client_admin" | "staff" | "unassigned";
  memberships: Membership[];
}

export async function resolvePrincipal(userId: string): Promise<Principal> {
  return withDatabase({ actorId: userId }, async (client) => {
    const admins = await client.query("SELECT clerk_user_id FROM platform_admins WHERE clerk_user_id = $1 AND active = true", [userId]);
    const memberships = await client.query<{ tenant_id: string; role: "client_admin" | "staff"; permissions: string[] }>(
      "SELECT tenant_id, role, permissions FROM tenant_memberships WHERE clerk_user_id = $1 AND active = true ORDER BY created_at", [userId],
    );
    const mapped = memberships.rows.map((m) => ({ tenantId: m.tenant_id, role: m.role, permissions: m.permissions }));
    return {
      userId,
      role: admins.rowCount ? "super_admin" : mapped.some((m) => m.role === "client_admin") ? "client_admin" : mapped.length ? "staff" : "unassigned",
      memberships: mapped,
    };
  });
}

export function contextFor(principal: Principal, tenantId?: string, write = false, permission = "configuration.manage"): DatabaseContext {
  const isSuperAdmin = principal.role === "super_admin";
  if (principal.role === "unassigned") throw new HttpError(403, "An operator must explicitly assign administrator access.");
  const membership = principal.memberships.find((m) => m.tenantId === tenantId);
  if (!isSuperAdmin && (!tenantId || !membership)) throw new HttpError(403, "Tenant access denied.");
  if (write && !isSuperAdmin && membership?.role !== "client_admin" && !membership?.permissions?.includes(permission)) throw new HttpError(403, "This role lacks the required permission.");
  return { actorId: principal.userId, tenantId, isSuperAdmin, canWrite: write, canManageStaff: isSuperAdmin || membership?.role === "client_admin" };
}

export function requireSuperAdmin(principal: Principal) {
  if (principal.role !== "super_admin") throw new HttpError(403, "Super administrator access required.");
}
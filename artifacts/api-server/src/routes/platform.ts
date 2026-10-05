import { Router } from "express";
import { withDatabase } from "@workspace/db";
import { GetCurrentPrincipalResponse, GetPlatformOverviewResponse, ListPlatformActivityResponse } from "@workspace/api-zod";
import { requireAuthentication, principalFrom } from "../middlewares/authentication";
import { contextFor, type Principal } from "../modules/authentication/service";
import { listTenants } from "../modules/tenants/service";

const router = Router();
router.use(requireAuthentication);

export async function activity(principal: Principal) {
  const query = async (tenantId?: string) => withDatabase(contextFor(principal, tenantId), async (client) => {
    const result = await client.query(
      `SELECT id,tenant_id,event_type,description,created_at FROM audit_events
       ${principal.role === "super_admin" ? "" : "WHERE tenant_id=$1"}
       ORDER BY created_at DESC LIMIT 30`,
      principal.role === "super_admin" ? [] : [tenantId],
    );
    return result.rows.map((e) => ({ id: e.id, tenantId: e.tenant_id, eventType: e.event_type, description: e.description, createdAt: e.created_at as Date }));
  });
  const rows = principal.role === "super_admin" ? await query() : (await Promise.all(principal.memberships.map((m) => query(m.tenantId)))).flat();
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 30);
}

router.get("/me", (_req, res) => {
  const p = principalFrom(res);
  res.json(GetCurrentPrincipalResponse.parse({ userId: p.userId, email: null, role: p.role, tenantId: p.memberships[0]?.tenantId ?? null, sandboxOnly: true, memberships: p.memberships }));
});
router.get("/overview", async (_req, res): Promise<void> => {
  const p = principalFrom(res);
  const tenants = await listTenants(p);
  res.json(GetPlatformOverviewResponse.parse({
    totalTenants: tenants.length, activeTenants: tenants.filter((t) => t.status === "active").length,
    draftTenants: tenants.filter((t) => t.status === "draft").length,
    enabledModules: tenants.reduce((sum, t) => sum + t.enabledModules.length, 0),
    sandboxOnly: true, recentActivity: await activity(p),
  }));
});
router.get("/activity", async (_req, res): Promise<void> => {
  const p = principalFrom(res);
  // Explicit denial rather than returning a misleading empty feed to unassigned users.
  if (p.role === "unassigned") { res.status(403).json({ error: "Administrator access has not been assigned." }); return; }
  res.json(ListPlatformActivityResponse.parse(await activity(p)));
});
export default router;
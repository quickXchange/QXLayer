import { pool } from "@workspace/db";

if (process.env.NODE_ENV === "production") throw new Error("Development-only access assignment refused in production.");
const [role, userId, tenantId] = process.argv.slice(2);
if (!userId || !/^user_[a-zA-Z0-9]+$/.test(userId)) throw new Error("Provide an explicit Clerk user ID. No default administrator is created.");
if (!["super_admin", "client_admin", "staff"].includes(role ?? "")) throw new Error("Role must be super_admin, client_admin, or staff.");
if (role !== "super_admin" && (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId))) throw new Error("Provide an explicit tenant UUID for client access.");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  if (role === "super_admin") {
    await client.query("INSERT INTO platform_admins (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO UPDATE SET active = true", [userId]);
  } else {
    if (role === "staff") {
      // Development-only source loading keeps artifact files outside this
      // utility package's TypeScript compilation root; enforcement stays shared.
      const [{ enforceLimit, resolveEntitlements }, { decimal, decimalString }] = await Promise.all([
        import(new URL("../../artifacts/api-server/src/modules/entitlements/resolver.ts", import.meta.url).href),
        import(new URL("../../artifacts/api-server/src/modules/entitlements/decimal.ts", import.meta.url).href),
      ]);
      const locked = await client.query("SELECT id FROM tenants WHERE id=$1 FOR UPDATE", [tenantId]);
      if (!locked.rowCount) throw new Error("Tenant not found.");
      const existing = await client.query("SELECT role,active FROM tenant_memberships WHERE tenant_id=$1 AND clerk_user_id=$2", [tenantId, userId]);
      const effective = await resolveEntitlements(client, tenantId!);
      const used = effective.usage.find((u: { key: string; used: string }) => u.key === "max_staff")?.used ?? "0";
      const increment = existing.rows[0]?.active && existing.rows[0]?.role === "staff" ? "0" : "1";
      enforceLimit(effective, "max_staff", decimalString(decimal(used) + decimal(increment)));
    }
    await client.query(
      "INSERT INTO tenant_memberships (tenant_id, clerk_user_id, role) VALUES ($1,$2,$3) ON CONFLICT (tenant_id, clerk_user_id) DO UPDATE SET role = EXCLUDED.role, active = true",
      [tenantId, userId, role],
    );
  }
  await client.query("INSERT INTO audit_events (tenant_id, actor_id, event_type, description) VALUES ($1, 'development-operator', 'access.assigned', $2)", [tenantId ?? null, `Explicit ${role} role assignment`]);
  await client.query("COMMIT");
  process.stdout.write("Access explicitly assigned. Refresh the signed-in console.\n");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
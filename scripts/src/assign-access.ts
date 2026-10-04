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
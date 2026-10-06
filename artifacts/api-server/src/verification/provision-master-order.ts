import { pool } from "@workspace/db";
import { resolvePrincipal } from "../modules/authentication/service";
import { provisionDevelopmentOrder } from "../modules/customer/development-provisioning";

if (process.env.NODE_ENV !== "development") throw new Error("Development-only trigger refused outside Development.");
const [orderId, operatorId] = process.argv.slice(2).filter(arg => arg !== "--");
if (!orderId || !operatorId) throw new Error("Usage: provision:master:dev <test-order-id> <existing-super-admin-user-id>");
try {
  const tenant = await provisionDevelopmentOrder(await resolvePrincipal(operatorId), orderId);
  process.stdout.write(JSON.stringify({ tenantId: tenant.id, slug: tenant.slug, status: tenant.status, sandboxOnly: true }) + "\n");
} finally { await pool.end(); }

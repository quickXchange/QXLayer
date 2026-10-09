import { withDatabase } from "@workspace/db";
import { testIntegration } from "./service";
import { vaultAvailable } from "./vault";
const system = { userId: "qxlayer-provider-health", role: "super_admin" as const, memberships: [] };
/** Opt-in, read-only health checks. Never poll suspended tenants or execute financial operations. */
export function startIntegrationHealthMonitor() {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy || !vaultAvailable()) return;
    busy = true;
    try {
      const rows = await withDatabase({ actorId: system.userId, isSuperAdmin: true }, c => c.query(
        `SELECT i.tenant_id,i.provider_key FROM tenant_integrations i
         JOIN tenants t ON t.id=i.tenant_id JOIN tenant_subscriptions s ON s.tenant_id=t.id
         WHERE i.enabled AND i.encrypted_credentials IS NOT NULL AND i.settings->>'healthMonitoring'='true'
           AND t.status='active' AND s.status='active'
         ORDER BY i.updated_at LIMIT 8`));
      for (const r of rows.rows) await testIntegration(system, r.tenant_id, r.provider_key, { reason: "Opt-in read-only health monitoring" });
    } catch {
      // No raw provider errors, endpoints or secrets in logs. Normal request/startup remains independent.
      console.warn("Opt-in provider health cycle could not complete.");
    } finally { busy = false; }
  }, 5 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}

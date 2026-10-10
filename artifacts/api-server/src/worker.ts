import { pool } from "@workspace/db";
import { startIntegrationHealthMonitor } from "./modules/integrations/monitor";
import { assertExternalEnvironment } from "./lib/external-environment";

assertExternalEnvironment();
// Disabled by default: preparing hosting must not start provider calls/writes.
const enabled = process.env.QXLAYER_HEALTH_MONITOR_ENABLED === "true";
const lease = enabled ? await pool.connect() : null;
if (lease) {
  const lock = await lease.query("SELECT pg_try_advisory_lock(hashtextextended('qxlayer-external-health-worker',0)) AS locked");
  if (!lock.rows[0]?.locked) {
    lease.release(); await pool.end();
    throw new Error("Another health worker already holds the singleton lease.");
  }
  lease.on("error", () => process.exit(1)); // A lost lease must stop this worker.
}
const stopMonitor = enabled ? startIntegrationHealthMonitor() : () => {};
const keepAlive = setInterval(() => {}, 60_000);
console.info(enabled ? "Opt-in health worker started with singleton lease." : "Health worker ready; provider monitoring disabled.");
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true; clearInterval(keepAlive);
  setTimeout(() => process.exit(1), 20_000).unref();
  await stopMonitor();
  if (lease) {
    await lease.query("SELECT pg_advisory_unlock(hashtextextended('qxlayer-external-health-worker',0))");
    lease.release();
  }
  await pool.end(); process.exit(0);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());

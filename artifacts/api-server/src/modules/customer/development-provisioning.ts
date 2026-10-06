import { pool, withDatabase } from "@workspace/db";
import { requireSuperAdmin, contextFor, type Principal } from "../authentication/service";
import { HttpError } from "../../lib/errors";
import { orderDetail, reviewRequest } from "./service";
import { getTenant, saveAssets, activateTenant } from "../tenants/service";
import { exchangeConfiguration } from "../../products/exchange/service";
import { masterExchangeDefaults } from "../../products/exchange/master-template";
import { resolveEntitlements } from "../entitlements/resolver";

export const DEVELOPMENT_ORDER_MARKER = "DEVELOPMENT MASTER TEST:";

/** No payment impersonation or public backdoor: operator-only, explicit fixture orders. */
export async function provisionDevelopmentOrder(p: Principal, orderId: string) {
  if (process.env.NODE_ENV !== "development") throw new HttpError(403, "Master provisioning tests require explicit Development mode.");
  requireSuperAdmin(p);
  const lock = await pool.connect();
  try {
    await lock.query("SELECT pg_advisory_lock(hashtextextended($1,0))", [`development-master:${orderId}`]);
    let order = (await orderDetail(p, orderId, true)).order;
    if (!order.details.startsWith(DEVELOPMENT_ORDER_MARKER) || order.design?.type === "custom") {
      throw new HttpError(403, "Only explicitly marked standard Development test orders can use this trigger.");
    }
    if (order.status === "delivered" && order.tenantId) return getTenant(p, order.tenantId);
    if (["rejected", "cancelled"].includes(order.status)) throw new HttpError(409, "This test order is closed.");
    if (!order.tenantId) {
      if (!order.requestedPlan?.id) throw new HttpError(400, "Select an Exchange plan on the test order.");
      order = await reviewRequest(p, orderId, {
        status: "approved", monthlyPrice: "0", setupPrice: "0", customizationPrice: null,
        currency: "USD", operatorNote: "Development test only. No payment confirmation or billing.",
        approvedPlanId: order.requestedPlan.id, approvedAddonIds: order.requestedAddons.map((a: { id: string }) => a.id),
      });
    }
    if (!order.tenantId) throw new HttpError(409, "Test order has no prepared tenant.");
    const tenantId = order.tenantId;
    const raw = await withDatabase(contextFor(p, tenantId), async c => {
      const existing = await c.query("SELECT configuration FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
      const e = await resolveEntitlements(c, tenantId);
      return { existing: existing.rows[0]?.configuration, currency: e.plan?.currency ?? "USD" };
    });
    if (raw.existing?.enabled) {
      // Never overwrite an operator's saved settings during an interrupted retry.
      await activateTenant(p, tenantId);
      return getTenant(p, tenantId);
    }
    const pairs = await withDatabase(contextFor(p, tenantId), c => c.query(
      `SELECT DISTINCT ON (c.asset_id) c.id FROM asset_network_catalog c
        JOIN network_catalog n ON n.id=c.network_id WHERE n.testnet=true ORDER BY c.asset_id,c.id LIMIT 2`));
    if (pairs.rows.length !== 2) throw new HttpError(409, "Two distinct testnet assets are required for this test.");
    await saveAssets(p, tenantId, pairs.rows.map(row => row.id));
    const selected = await exchangeConfiguration(p, tenantId);
    const config = masterExchangeDefaults(selected.catalog, order.actions, raw.currency);
    // The test trigger explicitly reviews these illustrative sandbox defaults.
    await exchangeConfiguration(p, tenantId, { ...config, enabled: true });
    await activateTenant(p, tenantId); // Existing readiness + delivery + owner-access safeguards.
    return getTenant(p, tenantId);
  } finally {
    await lock.query("SELECT pg_advisory_unlock(hashtextextended($1,0))", [`development-master:${orderId}`]).catch(() => undefined);
    lock.release();
  }
}

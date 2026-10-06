import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { ListSandboxAssetNetworksResponse } from "@workspace/api-zod";
import { resolvePrincipal } from "../modules/authentication/service";
import { createTenant, getTenant, saveAssets } from "../modules/tenants/service";
import { savePlan } from "../modules/entitlements/catalog";
import { planFixture } from "./plans";
import { cleanCustomerFixtures } from "./customer-fixtures";

if (process.env.NODE_ENV === "production") throw new Error("Development verification refused in production.");
const suffix = randomUUID().slice(0, 8);
const actor = `user_assetSelectionTest${suffix}`;
const tenantIds: string[] = [];
let planId: string | undefined;
try {
  const response = await fetch(`https://${process.env.REPLIT_DEV_DOMAIN}/api/asset-networks`);
  assert.equal(response.status, 200, "The catalog endpoint must be available.");
  const catalog = ListSandboxAssetNetworksResponse.parse(await response.json());
  const pair = catalog.assets.find(a => a.assetNetworkId && a.assetNetworkId !== `${a.assetId}:${a.networkId}`);
  assert.ok(pair?.assetNetworkId, "Exercise an imported catalog pair whose ID differs from its legacy alias.");
  assert.ok(catalog.assets.every(a => a.assetNetworkId), "The API must expose the canonical ID for every selectable pair.");
  await pool.query("INSERT INTO platform_admins (clerk_user_id) VALUES ($1)", [actor]);
  const admin = await resolvePrincipal(actor);
  const plan = await savePlan(admin, planFixture(`Asset selection test ${suffix}`, { website: true, crypto_exchange: true }));
  planId = plan.id;
  const tenant = await createTenant(admin, { name: `Asset selection test ${suffix}`, slug: `asset-selection-${suffix}`, planId });
  tenantIds.push(tenant.id);
  await saveAssets(admin, tenant.id, [pair.assetNetworkId]);
  assert.deepEqual((await getTenant(admin, tenant.id)).assetNetworkIds, [pair.assetNetworkId]);
  await saveAssets(admin, tenant.id, [`${pair.assetId}:${pair.networkId}`, pair.assetNetworkId]);
  assert.deepEqual((await getTenant(admin, tenant.id)).assetNetworkIds, [pair.assetNetworkId], "Legacy aliases must resolve and deduplicate to canonical IDs.");
  await assert.rejects(() => saveAssets(admin, tenant.id, ["unsupported:network"]), (e: any) => e.status === 400);
  assert.deepEqual((await getTenant(admin, tenant.id)).assetNetworkIds, [pair.assetNetworkId], "Invalid selections must not remove the saved configuration.");
  await saveAssets(admin, tenant.id, []);
  assert.deepEqual((await getTenant(admin, tenant.id)).assetNetworkIds, []);
  console.log("PASS: public catalog IDs, imported pair selection, legacy compatibility, deduplication, invalid-input rollback and clearing.");
} finally {
  if (planId) await cleanCustomerFixtures(tenantIds, planId, [actor]);
  else await pool.query("DELETE FROM platform_admins WHERE clerk_user_id=$1", [actor]);
  await pool.end();
}

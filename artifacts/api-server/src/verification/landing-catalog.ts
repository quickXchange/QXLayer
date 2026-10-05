import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, withDatabase } from "@workspace/db";
import { GetPublicProductCatalogResponse, UpdateLandingProductBody, UpdateLandingProductResponse } from "@workspace/api-zod";
import { publicProducts, listProducts, saveProduct, type LandingProductInput } from "../modules/landing-catalog/service";
import type { Principal } from "../modules/authentication/service";

if (process.env.NODE_ENV === "production") throw new Error("Development verification refused in production.");
const suffix = randomUUID().replaceAll("-", "");
const key = `catalog_verify_${suffix}`;
const actor = `user_catalogVerify${suffix}`;
const admin: Principal = { userId: actor, role: "super_admin", memberships: [] };
const roles = ["client_admin", "staff", "unassigned"] as const;
const fixture: LandingProductInput = {
  visible: true, name: "Catalog verification", description: "A disposable marketing catalog verification fixture.",
  icon: "engine", startingPrice: "199.99", setupFee: "500.50", currency: "EUR",
  billingPeriod: "yearly", status: "coming_soon", ctaLabel: "Learn More", displayOrder: 9999,
};

try {
  await pool.query("INSERT INTO module_catalog (key,name,description,category,sandbox_available) VALUES ($1,'Verification','Disposable fixture','infrastructure',false)", [key]);
  await pool.query("INSERT INTO landing_products (key,name,description,icon) VALUES ($1,'Verification','Disposable catalog fixture','engine')", [key]);
  const saved = UpdateLandingProductResponse.parse(await saveProduct(admin, key, fixture));
  assert.equal(saved.startingPrice, "199.99");
  assert.equal(saved.setupFee, "500.50");
  assert.equal(saved.currency, "EUR");
  assert.equal(saved.billingPeriod, "yearly");
  assert.equal(saved.readiness, "planned");
  assert.equal((await listProducts(admin)).find((p) => p.key === key)?.name, fixture.name);
  const publicRow = GetPublicProductCatalogResponse.parse(await publicProducts()).find((p) => p.key === key);
  assert.equal(publicRow?.startingPrice, "199.99");
  assert.equal(publicRow?.displayOrder, 9999);
  for (const role of roles) {
    const principal: Principal = { userId: `user_other${suffix}`, role, memberships: [] };
    await assert.rejects(async () => listProducts(principal), (e: unknown) => (e as { status: number }).status === 403);
    await assert.rejects(async () => saveProduct(principal, key, fixture), (e: unknown) => (e as { status: number }).status === 403);
  }
  await saveProduct(admin, key, { ...fixture, visible: false, startingPrice: null, setupFee: null, status: "available" });
  assert.equal((await publicProducts()).some((p) => p.key === key), false);
  const hidden = (await listProducts(admin)).find((p) => p.key === key);
  assert.equal(hidden?.readiness, "planned"); // A display-status change cannot enable execution.
  assert.equal(hidden?.startingPrice, null);
  await withDatabase({ actorId: "public:verification" }, async (client) => {
    await assert.rejects(() => client.query("INSERT INTO landing_products (key,name,description,icon) VALUES ('denied','Denied','Forbidden insert','engine')"));
  });
  for (const invalid of [
    { startingPrice: "-1" }, { startingPrice: "12.123" }, { setupFee: "NaN" },
    { billingPeriod: "weekly" }, { icon: "<script>" }, { displayOrder: -1 }, { currency: "usd" },
  ]) {
    assert.equal(UpdateLandingProductBody.safeParse({ ...fixture, ...invalid }).success, false);
  }
  await assert.rejects(async () => saveProduct(admin, key, { ...fixture, name: "   " }));
  await assert.rejects(async () => saveProduct(admin, `absent_${suffix}`, fixture), (e: unknown) => (e as { status: number }).status === 404);
  const policy = await pool.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname='landing_products'");
  assert.equal(policy.rows[0].relrowsecurity, false);
  assert.equal(policy.rows[0].relforcerowsecurity, false);
  const predicates = await pool.query("SELECT qual,with_check FROM pg_policies WHERE tablename='landing_products'");
  assert.equal(predicates.rowCount, 0);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM audit_events WHERE actor_id=$1 AND event_type='landing_catalog.updated'", [actor])).rows[0].n, 2);
  process.stdout.write("PASS: marketing pricing persistence, public visibility filtering, Super Admin-only edits, immutable readiness, validation, read-only transactions, audit, and public projection.\n");
} finally {
  await pool.query("DELETE FROM audit_events WHERE actor_id=$1", [actor]);
  await pool.query("DELETE FROM landing_products WHERE key=$1", [key]);
  await pool.query("DELETE FROM module_catalog WHERE key=$1", [key]);
  await pool.end();
}
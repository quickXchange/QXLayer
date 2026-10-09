/**
 * Isolated investigation only, NOT a Production migration or startup hook.
 * Requires a disposable PostgreSQL cluster on the exact private /tmp socket.
 * No application credentials, Clerk accounts, providers or HTTP endpoints.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const expectedSocket = "/tmp/qx-provisioning-constraint/socket";
const url = new URL(process.env.DATABASE_URL ?? "invalid:");
assert.equal(process.env.NODE_ENV, "test");
assert.equal(url.protocol, "postgresql:");
assert.equal(url.searchParams.get("host"), expectedSocket);
assert.equal(url.searchParams.get("port"), "55441");
assert.equal(url.pathname, "/qx_provisioning_constraint");
assert(!url.password, "This fixture must not use an application password.");

const { pool } = await import("../../../../lib/db/src/index");
const orders = await import("../modules/customer/service");
const tenants = await import("../modules/tenants/service");
const auth = await import("../modules/authentication/service");
const previews = await import("../modules/website/preview-service");
const website = await import("../modules/website/service");
const exchange = await import("../products/exchange/service");
const { masterExchangeDefaults } = await import("../products/exchange/master-template");
const reportDir = "reports/provisioning-constraint-investigation";
const review = JSON.parse(readFileSync("reports/production-configuration-migration/database-review.json", "utf8"));
const source = JSON.parse(readFileSync("reports/production-configuration-migration/source.json", "utf8"));
const defaults = JSON.parse(readFileSync(`${reportDir}/fixture-defaults.json`, "utf8"));
const indexes = JSON.parse(readFileSync(`${reportDir}/fixture-indexes.json`, "utf8"));
const meta = review.production.metadata;
const tableNames: string[] = [...review.included, ...review.excluded].sort();
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
const literal = (s: string) => `'${s.replaceAll("'", "''")}'`;
const ownerId = "isolated-fixture-owner";
const existingCustomerId = "isolated-existing-customer";
const oldDefinition = "CHECK (((status = 'delivered'::text) = (tenant_id IS NOT NULL)))";
const correctedDefinition = "CHECK (((status <> 'delivered'::text) OR (tenant_id IS NOT NULL)))";
const results: { test: string; result: string }[] = [];
const pass = (test: string) => { results.push({ test, result: "PASS" }); console.log(`PASS: ${test}`); };
const query = (s: string, values?: unknown[]) => pool.query(s, values);
async function definition() {
  return (await query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='white_label_requests'::regclass AND conname='white_label_request_delivery'")).rows[0].definition;
}
async function fingerprints() {
  const data: Record<string, string> = {};
  for (const t of tableNames) data[t] = (await query(`SELECT md5(coalesce(string_agg(md5(to_jsonb(r)::text),',' ORDER BY md5(to_jsonb(r)::text)),'')) AS digest FROM ${quote(t)} r`)).rows[0].digest;
  return data;
}
async function otherConstraints() {
  return (await query("SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition,convalidated FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname<>'white_label_request_delivery' ORDER BY conrelid::regclass::text,conname")).rows;
}
async function expectFailure(work: () => Promise<unknown>, code: string | number) {
  await assert.rejects(async () => await work(), (e: any) => e.code === code || e.status === code);
}

// These statements are ONLY used by this socket-guarded isolated rehearsal.
// Existing records are locked, fingerprinted and checked before committing.
async function correctFixture(options: { failLate?: boolean; oldRequired?: boolean } = {}) {
  const c = await pool.connect();
  const before = await fingerprints();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL lock_timeout='1s'; SET LOCAL statement_timeout='10s'");
    await c.query(`LOCK TABLE ${tableNames.map(quote).join(",")} IN SHARE MODE`);
    const current = (await c.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='white_label_requests'::regclass AND conname='white_label_request_delivery'")).rows[0]?.definition;
    if (!options.oldRequired && current === correctedDefinition) { await c.query("COMMIT"); return; }
    assert.equal(current, oldDefinition, "Unexpected constraint: stop rather than changing another rule.");
    await c.query("ALTER TABLE white_label_requests DROP CONSTRAINT white_label_request_delivery, ADD CONSTRAINT white_label_request_delivery CHECK (status <> 'delivered' OR tenant_id IS NOT NULL) NOT VALID");
    await c.query("ALTER TABLE white_label_requests VALIDATE CONSTRAINT white_label_request_delivery");
    for (const t of tableNames) {
      const digest = (await c.query(`SELECT md5(coalesce(string_agg(md5(to_jsonb(r)::text),',' ORDER BY md5(to_jsonb(r)::text)),'')) AS digest FROM ${quote(t)} r`)).rows[0].digest;
      assert.equal(digest, before[t], `Existing data changed: ${t}`);
    }
    if (options.failLate) throw new Error("Injected failure after replacement and validation");
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); }
}
async function guardedFixtureRollback() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL lock_timeout='1s'; SET LOCAL statement_timeout='10s'");
    await c.query("LOCK TABLE white_label_requests IN ACCESS EXCLUSIVE MODE");
    const incompatible = await c.query("SELECT count(*)::int AS n FROM white_label_requests WHERE NOT ((status='delivered') = (tenant_id IS NOT NULL))");
    if (incompatible.rows[0].n) throw new Error("Rollback blocked: preserve pre-delivery tenant links");
    await c.query("ALTER TABLE white_label_requests DROP CONSTRAINT white_label_request_delivery, ADD CONSTRAINT white_label_request_delivery CHECK ((status='delivered') = (tenant_id IS NOT NULL))");
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); }
}

try {
  const actualConnection = await query("SELECT current_database() AS db,inet_server_addr() AS network_address");
  assert.equal(actualConnection.rows[0].db, "qx_provisioning_constraint");
  assert.equal(actualConnection.rows[0].network_address, null, "A Unix socket is required.");
  const sequences = new Set<string>();
  for (const d of defaults) {
    const m = d.expression.match(/nextval\('([^']+)'::regclass\)/);
    if (m) sequences.add(m[1]);
  }
  for (const name of sequences) { assert.match(name, /^[a-z_]+$/); await query(`CREATE SEQUENCE ${quote(name)}`); }
  for (const t of tableNames) {
    const cols = meta.columns.filter((c: any) => c.table === t).map((c: any) => {
      const d = defaults.find((d: any) => d.table === t && d.column === c.column);
      return `${quote(c.column)} ${c.type}${d ? ` DEFAULT ${d.expression}` : ""}${c.notNull ? " NOT NULL" : ""}`;
    });
    await query(`CREATE TABLE ${quote(t)} (${cols.join(",")})`);
  }
  const constraints = [...meta.constraints.filter((c: any) => ["p", "u"].includes(c.type)), ...meta.constraints.filter((c: any) => !["p", "u"].includes(c.type))];
  for (const [i, c] of constraints.entries()) {
    const name = c.table === "white_label_requests" && c.definition === oldDefinition ? "white_label_request_delivery" : `fixture_constraint_${i}`;
    await query(`ALTER TABLE ${quote(c.table)} ADD CONSTRAINT ${quote(name)} ${c.definition}`);
  }
  for (const i of indexes) if (tableNames.includes(i.table)) await query(i.definition);
  for (const t of review.included) await query(`INSERT INTO ${quote(t)} SELECT * FROM jsonb_populate_recordset(NULL::${quote(t)},$1::jsonb)`, [JSON.stringify(source[t])]);
  await query("INSERT INTO platform_admins (clerk_user_id,active) VALUES ($1,true)", [ownerId]);
  const plan = source.plans.find((p: any) => p.name === "White Label Exchange Sandbox Demo");
  assert(plan);
  const existingTenant = (await query("INSERT INTO tenants (name,slug,status,completed_steps) VALUES ('Preserved fixture Exchange','preserved-fixture','active',ARRAY['exchange_provisioned']) RETURNING id")).rows[0].id;
  await query("INSERT INTO tenant_memberships (tenant_id,clerk_user_id,role,active) VALUES ($1,$2,'client_admin',true)", [existingTenant, existingCustomerId]);
  for (const status of ["new", "delivered"]) await query("INSERT INTO white_label_requests (customer_user_id,idempotency_key,configuration,status,tenant_id) VALUES ($1,$2,$3,$4,$5)", [existingCustomerId, randomUUID(), JSON.stringify({ projectName: "Preserved order", brandName: "Preserved brand", actions: ["swap"], details: "" }), status, status === "delivered" ? existingTenant : null]);
  const owner = await auth.resolvePrincipal(ownerId);
  assert.equal(owner.role, "super_admin");
  const customer = await auth.resolvePrincipal("isolated-new-customer");
  const input: any = { projectName: "Isolated approval investigation", websiteName: "Fixture website", brandName: "Fixture Exchange", actions: ["swap"], details: "Isolated synthetic test, not an actual customer order.", requestedPlanId: plan.id, requestedAddonIds: [], billingPeriod: "monthly", idempotencyKey: randomUUID() };
  const reviewInput: any = { status: "approved", monthlyPrice: "300", setupPrice: "0", currency: "USD", operatorNote: "Isolated fixture only", approvedPlanId: plan.id, approvedAddonIds: [] };
  const order = await orders.submitRequest(customer, input);
  const beforeApproval = await fingerprints();
  await expectFailure(() => orders.reviewRequest(owner, order.id, reviewInput), "23514");
  assert.deepEqual(await fingerprints(), beforeApproval);
  pass("Original Production constraint rejects the actual approval service; all preparation and linkage roll back");

  const beforeCorrection = await fingerprints();
  const constraintsBefore = await otherConstraints();
  const concurrent = await pool.connect();
  try {
    await concurrent.query("BEGIN");
    await concurrent.query("LOCK TABLE white_label_requests IN ROW EXCLUSIVE MODE");
    await expectFailure(() => correctFixture(), "55P03");
  } finally { await concurrent.query("ROLLBACK"); concurrent.release(); }
  assert.equal(await definition(), oldDefinition);
  assert.deepEqual(await fingerprints(), beforeCorrection);
  pass("Concurrent write lock causes a bounded timeout with no schema or data change");
  await assert.rejects(() => correctFixture({ failLate: true }), /Injected failure/);
  assert.equal(await definition(), oldDefinition);
  assert.deepEqual(await fingerprints(), beforeCorrection);
  pass("Injected post-validation failure restores original constraint and every existing record");
  await correctFixture();
  assert.equal(await definition(), correctedDefinition);
  assert.deepEqual(await fingerprints(), beforeCorrection);
  assert.deepEqual(await otherConstraints(), constraintsBefore);
  assert.equal((await auth.resolvePrincipal(ownerId)).role, "super_admin");
  pass("Correction preserves all 39 tables' data, existing owner access, customer memberships and every other constraint");
  await correctFixture();
  assert.deepEqual(await fingerprints(), beforeCorrection);
  pass("Already-corrected rerun is a no-op");
  await guardedFixtureRollback();
  assert.equal(await definition(), oldDefinition);
  assert.deepEqual(await fingerprints(), beforeCorrection);
  await correctFixture();
  pass("Guarded reversal is safe before any newly permitted tenant links exist");

  const statuses = ["new", "reviewing", "waiting_for_client", "quote_ready", "approved", "in_setup", "customization", "ready", "delivered", "rejected", "cancelled"];
  for (const status of statuses) for (const tenantId of [null, existingTenant]) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      // Unique/FK rules remain intact; reuse one known valid tenant in a rolled-back fixture.
      await c.query("DELETE FROM white_label_requests WHERE tenant_id=$1", [existingTenant]);
      if (status === "delivered" && !tenantId) await assert.rejects(() => c.query("INSERT INTO white_label_requests (customer_user_id,idempotency_key,configuration,status,tenant_id) VALUES ($1,$2,'{}',$3,$4)", ["matrix-fixture", randomUUID(), status, tenantId]), (e: any) => e.code === "23514");
      else await c.query("INSERT INTO white_label_requests (customer_user_id,idempotency_key,configuration,status,tenant_id) VALUES ($1,$2,'{}',$3,$4)", ["matrix-fixture", randomUUID(), status, tenantId]);
    } finally { await c.query("ROLLBACK"); c.release(); }
  }
  assert.deepEqual(await fingerprints(), beforeCorrection);
  pass("All 22 status/link combinations checked; delivered-without-tenant remains forbidden");
  await expectFailure(() => query("INSERT INTO white_label_requests (customer_user_id,idempotency_key,configuration,status,tenant_id) VALUES ($1,$2,'{}','in_setup',$3)", ["fk-fixture", randomUUID(), randomUUID()]), "23503");
  await expectFailure(() => query("INSERT INTO white_label_requests (customer_user_id,idempotency_key,configuration,status,tenant_id) VALUES ($1,$2,'{}','in_setup',$3)", ["unique-fixture", randomUUID(), existingTenant]), "23505");
  pass("Foreign-key and one-order-per-tenant protections still reject invalid or duplicate tenant links");

  await expectFailure(() => orders.reviewRequest(customer, order.id, reviewInput), 403);
  await expectFailure(() => orders.reviewRequest(owner, order.id, { ...reviewInput, status: "delivered" }), 409);
  const approved = await orders.reviewRequest(owner, order.id, reviewInput);
  assert.equal(approved.status, "in_setup");
  assert(approved.tenantId);
  const tenantId = approved.tenantId!;
  assert.equal((await tenants.getTenant(owner, tenantId)).status, "draft");
  assert.equal((await auth.resolvePrincipal(customer.userId)).memberships.length, 0);
  assert.deepEqual(await orders.myAdminPanels(await auth.resolvePrincipal(customer.userId)), []);
  await expectFailure(async () => tenants.getTenant(await auth.resolvePrincipal(customer.userId), tenantId), 403);
  await expectFailure(() => website.getPublicSite(`wl-${order.id}`), 404);
  await previews.getTenantWebsitePreview(owner, tenantId);
  await expectFailure(() => previews.getTenantWebsitePreview(customer, tenantId), 403);
  await expectFailure(() => orders.deliverRequest(owner, order.id, tenantId), 409);
  await expectFailure(() => tenants.activateTenant(owner, tenantId), 400);
  assert.equal((await tenants.getTenant(owner, tenantId)).status, "draft");
  pass("Actual approval prepares a linked draft; customer access, anonymous website, premature delivery and incomplete activation stay blocked");
  await assert.rejects(() => guardedFixtureRollback(), /Rollback blocked/);
  assert.equal(await definition(), correctedDefinition);
  assert.equal((await orders.orderDetail(owner, order.id, true)).order.tenantId, tenantId);
  pass("Rollback refuses to discard or clear a valid pre-delivery tenant link");

  const pairs = (await query("SELECT DISTINCT ON (c.asset_id) c.id FROM asset_network_catalog c JOIN network_catalog n ON n.id=c.network_id WHERE n.testnet=true ORDER BY c.asset_id,c.id LIMIT 2")).rows;
  assert.equal(pairs.length, 2);
  await tenants.saveAssets(owner, tenantId, pairs.map((p: any) => p.id));
  const config = await exchange.exchangeConfiguration(owner, tenantId);
  await exchange.exchangeConfiguration(owner, tenantId, { ...masterExchangeDefaults(config.catalog, ["swap"], plan.currency), enabled: true });
  await tenants.activateTenant(owner, tenantId);
  const delivered = (await orders.orderDetail(owner, order.id, true)).order;
  assert.equal(delivered.status, "delivered");
  const deliveredCustomer = await auth.resolvePrincipal(customer.userId);
  assert.equal(deliveredCustomer.role, "client_admin");
  assert.equal(deliveredCustomer.memberships[0].tenantId, tenantId);
  assert.equal((await orders.myAdminPanels(deliveredCustomer))[0].tenantId, tenantId);
  await tenants.getTenant(deliveredCustomer, tenantId);
  await website.getPublicSite(`wl-${order.id}`);
  await expectFailure(() => tenants.getTenant(deliveredCustomer, existingTenant), 403);
  const existingCustomer = await auth.resolvePrincipal(existingCustomerId);
  await expectFailure(() => tenants.getTenant(existingCustomer, tenantId), 403);
  pass("Real setup/activation/delivery services grant only the correct customer access and preserve cross-tenant denial");
  const deliveredSnapshot = await fingerprints();
  await orders.deliverRequest(owner, order.id, tenantId);
  assert.deepEqual(await fingerprints(), deliveredSnapshot);
  pass("Already-delivered retry remains idempotent");

  // Custom designs retain their separate readiness requirement.
  const design = { type: "custom", styleName: "Isolated custom", primaryColor: "#123456", accentColor: "#654321", themePreference: "both", description: "", referenceWebsiteUrl: null, notes: "", logoAttachmentId: null, faviconAttachmentId: null, referenceAttachmentIds: [] };
  const custom = await orders.submitRequest(customer, { ...input, projectName: "Isolated custom workflow", idempotencyKey: randomUUID(), design });
  const customReview = { ...reviewInput, customDesignDecision: "approved", customizationPrice: "200" };
  const customApproved = await orders.reviewRequest(owner, custom.id, customReview);
  assert.equal(customApproved.status, "customization");
  const customId = customApproved.tenantId!;
  await tenants.saveAssets(owner, customId, pairs.map((p: any) => p.id));
  const customConfig = await exchange.exchangeConfiguration(owner, customId);
  await exchange.exchangeConfiguration(owner, customId, { ...masterExchangeDefaults(customConfig.catalog, ["swap"], plan.currency), enabled: true });
  await tenants.activateTenant(owner, customId);
  assert.equal((await orders.orderDetail(owner, custom.id, true)).order.status, "customization");
  await expectFailure(() => orders.deliverRequest(owner, custom.id, customId), 409);
  const customReady = await orders.reviewRequest(owner, custom.id, { ...customReview, status: "ready" });
  assert.equal(customReady.status, "delivered");
  assert.equal((await auth.resolvePrincipal(ownerId)).role, "super_admin");
  pass("Custom-design activation does not deliver early; explicit Ready review remains required");

  writeFileSync(`${reportDir}/verification-results.json`, JSON.stringify({
    status: "PASSED_ISOLATED_SERVICE_AND_DATABASE_REHEARSAL",
    database: "PostgreSQL 16, private Unix socket, disposable synthetic database",
    originalConstraint: oldDefinition, proposedConstraint: correctedDefinition,
    productionChanged: false, developmentDatabaseChanged: false, republished: false,
    realClerkOrBrowserJourneyTested: false, nativePublishCurrentlyDetectsChange: false, tests: results,
  }, null, 2) + "\n");
  console.log(`All ${results.length} isolated checks passed.`);
} finally { await pool.end(); }

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pool, withDatabase } from "@workspace/db";
import { resolvePrincipal } from "../modules/authentication/service";
import { integrationBundle, saveIntegration } from "../modules/integrations/service";
import { publicMiniConfig, miniLanguages } from "../modules/integrations/telegram";
import { vaultAvailable } from "../modules/integrations/vault";
import { submitRequest, reviewRequest, myAdminPanels, assertDeliveredExchangeAccess } from "../modules/customer/service";
import { prepareCustomerFixtures, cleanCustomerFixtures } from "./customer-fixtures";
import { exchangeConfiguration, sandboxQuote, sandboxOrder, tenantOrder, trackOrder } from "../products/exchange/service";
import { getPublicSite } from "../modules/website/service";
if (process.env.NODE_ENV === "production") throw new Error("Development-only verification.");
const path = "../../.local/qa/integration-runtime-fixtures.json";
const denied = (work: () => Promise<unknown>, status: number) =>
  assert.rejects(work, (e: any) => e.status === status);
async function cleanup(manifest: any) {
  await withDatabase({ actorId: manifest.actors[0], isSuperAdmin: true, canWrite: true }, async c => {
    for (const table of ["tenant_telegram_receipts", "tenant_integrations"])
      await c.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`, [manifest.tenantIds]);
  });
  await cleanCustomerFixtures(manifest.tenantIds, manifest.planId, manifest.actors);
  await writeFile(path, JSON.stringify({ cleaned: true, checked: manifest.checked ?? [] }, null, 2));
}
if (process.argv.includes("--cleanup")) {
  const m = JSON.parse(await readFile(path, "utf8"));
  if (!m.cleaned) await cleanup(m);
  console.log("Exact disposable Integration QA fixtures cleaned.");
  await pool.end();
} else {
  const suffix = randomUUID().slice(0, 8);
  const actors = ["operator", "customer-a", "customer-b"].map(r => `user_integration-${r}-${suffix}`);
  const manifest: any = { actors, tenantIds: [], checked: [] };
  const checked = (name: string) => { manifest.checked.push(name); console.log("PASS", name); };
  await mkdir("../../.local/qa", { recursive: true });
  try {
    await pool.query("INSERT INTO platform_admins(clerk_user_id) VALUES($1)", [actors[0]]);
    const op = await resolvePrincipal(actors[0]);
    const fixture = await prepareCustomerFixtures(op, suffix);
    manifest.planId = fixture.planId; manifest.tenantIds = fixture.tenants.map(t => t.id);
    manifest.tenants = fixture.tenants.map(t => ({ id: t.id, slug: t.slug }));
    await writeFile(path, JSON.stringify(manifest));
    const [ta, tb] = fixture.tenants;
    for (const [t, actor] of [[ta, actors[1]], [tb, actors[2]]] as const)
      await pool.query("INSERT INTO tenant_memberships(tenant_id,clerk_user_id,role) VALUES($1,$2,'client_admin')", [t.id, actor]);
    const a = await resolvePrincipal(actors[1]), b = await resolvePrincipal(actors[2]);
    await denied(() => integrationBundle(a), 403);
    await denied(() => integrationBundle(a, tb.id), 403);
    const body = { enabled: true, settings: {}, credentialManagement: "both" as const, reason: "Isolated Development verification" };
    await saveIntegration(op, ta.id, "1forge", body);
    await saveIntegration(a, ta.id, "1forge", { ...body, settings: { healthMonitoring: false } });
    await denied(() => saveIntegration(b, ta.id, "1forge", body), 403);
    await saveIntegration(op, ta.id, "1forge", { ...body, credentialManagement: "super_admin" });
    await denied(() => saveIntegration(a, ta.id, "1forge", { ...body, credentialManagement: "super_admin", secrets: { apiKey: "fictional-test-only" } }), 403);
    if (!vaultAvailable()) await denied(() => saveIntegration(op, ta.id, "1forge", { ...body, credentialManagement: "super_admin", secrets: { apiKey: "fictional-test-only" } }), 503);
    const bundle = await integrationBundle(a, ta.id);
    assert.equal(bundle.connections.length, 1);
    assert.deepEqual(bundle.definitions[0].secretFields, []);
    assert.ok(!JSON.stringify(bundle).includes("encrypted_credentials"));
    const rls = await withDatabase({ actorId: b.userId, tenantId: tb.id }, c => c.query("SELECT id FROM tenant_integrations WHERE tenant_id=$1", [ta.id]));
    const role = (await pool.query("SELECT rolsuper OR rolbypassrls AS bypass FROM pg_roles WHERE rolname=current_user")).rows[0];
    if (!role.bypass) assert.equal(rls.rowCount, 0);
    const policy = (await pool.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='tenant_integrations'::regclass")).rows[0];
    assert.equal(policy.relrowsecurity, true); assert.equal(policy.relforcerowsecurity, true);
    checked("application tenant isolation, masked responses, permission modes, missing vault; policies present (Development privileged-role bypass disclosed)");
    const mini = { enabled: true, credentialManagement: "super_admin" as const, settings: { menu: ["swap", "tracking"], primaryColor: "#1188aa", backgroundColor: "#0d1018" }, reason: body.reason };
    await saveIntegration(op, ta.id, "telegram_mini_app", mini);
    assert.equal((await publicMiniConfig(ta.slug)).brandName, ta.name);
    assert.deepEqual((await publicMiniConfig(ta.slug)).menu, ["swap", "tracking"]);
    assert.ok((await miniLanguages(ta.slug, "en") as any).translations);
    const route = fixture.base.routes.find(r => r.action === "swap")!;
    const input = { action: "swap" as const, source: route.source, destination: route.destination, amount: "1" };
    const quote = await sandboxQuote(ta.slug, input, "telegram");
    const orderInput = { quoteToken: quote.token, idempotencyKey: randomUUID() };
    const order = await sandboxOrder(ta.slug, orderInput, "telegram");
    assert.equal((await sandboxOrder(ta.slug, orderInput, "telegram")).order.id, order.order.id);
    assert.equal((await trackOrder(ta.slug, order.order.id, order.trackingToken)).id, order.order.id);
    await denied(() => trackOrder(tb.slug, order.order.id, order.trackingToken), 404);
    await saveIntegration(op, ta.id, "telegram_mini_app", { ...mini, settings: { ...mini.settings, menu: ["tracking"] } });
    await denied(() => sandboxQuote(ta.slug, input, "telegram"), 403);
    await denied(() => sandboxOrder(ta.slug, { ...orderInput, idempotencyKey: randomUUID() }, "telegram"), 403);
    await saveIntegration(op, ta.id, "telegram_mini_app", { ...mini, enabled: false });
    await denied(() => publicMiniConfig(ta.slug), 404);
    await saveIntegration(op, ta.id, "telegram_mini_app", mini);
    checked("Mini branding, original language dictionaries, Sandbox creation/idempotency/private tracking, feature and module disable");
    const request = await submitRequest(a, { projectName: `Runtime approval ${suffix}`, brandName: `Runtime approval ${suffix}`,
      preferredDomain: null, actions: ["swap"], details: "Disposable Sandbox verification", requestedPlanId: fixture.planId, idempotencyKey: randomUUID() });
    const approved = await reviewRequest(op, request.id, { status: "approved", monthlyPrice: "149", setupPrice: "299", currency: "USD",
      approvedPlanId: fixture.planId, approvedAddonIds: [], operatorNote: "Disposable approval verification" });
    assert.equal(approved.status, "delivered");
    assert.ok(approved.tenantId);
    manifest.tenantIds.push(approved.tenantId);
    await writeFile(path, JSON.stringify(manifest));
    const customer = await resolvePrincipal(a.userId);
    assert.ok(customer.memberships.some(m => m.tenantId === approved.tenantId));
    await assertDeliveredExchangeAccess(customer, approved.tenantId!);
    assert.ok((await myAdminPanels(customer)).some((p: any) => p.tenantId === approved.tenantId));
    const empty = await exchangeConfiguration(op, approved.tenantId!);
    assert.equal(empty.configuration.routes.length, 0);
    const deliveredTenant = (await pool.query("SELECT slug,completed_steps FROM tenants WHERE id=$1", [approved.tenantId])).rows[0];
    assert.ok(!deliveredTenant.completed_steps.includes("exchange_provisioned"));
    assert.equal((await getPublicSite(deliveredTenant.slug) as any).brandName, `Runtime approval ${suffix}`);
    checked("approval automatically provisions isolated master and same-account Admin, without demo routes");
    await pool.query("UPDATE tenants SET status='suspended' WHERE id=$1", [ta.id]);
    const suspended = await resolvePrincipal(a.userId);
    assert.ok(!suspended.memberships.some(m => m.tenantId === ta.id));
    await denied(() => getPublicSite(ta.slug), 404);
    await denied(() => sandboxQuote(ta.slug, input), 404);
    await denied(() => integrationBundle(suspended, ta.id), 403);
    assert.equal((await tenantOrder(op, ta.id, order.order.id)).id, order.order.id);
    assert.equal((await tenantOrder(op, ta.id, order.order.id, { status: "processing", expectedStatus: "pending", note: "Safe operator handling during suspension" })).status, "processing");
    checked("suspension blocks website/new orders/customer Admin while Super Admin handles existing Sandbox orders");
    await pool.query("UPDATE tenants SET status='active' WHERE id=$1", [ta.id]);
    await writeFile(path, JSON.stringify(manifest, null, 2));
    if (!process.argv.includes("--keep")) await cleanup(manifest);
    else console.log("Disposable fixture manifest retained for the one browser verification pass.");
  } catch (error) {
    if (manifest.planId) await cleanup(manifest);
    throw error;
  } finally { await pool.end(); }
}

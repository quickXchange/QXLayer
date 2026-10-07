import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { pool } from "@workspace/db";
import { resolvePrincipal } from "../modules/authentication/service";
import { savePlan } from "../modules/entitlements/catalog";
import { planFixture } from "./plans";
import { cleanCustomerFixtures } from "./customer-fixtures";
import { submitRequest, orderDetail, myAdminPanels, assertDeliveredExchangeAccess } from "../modules/customer/service";
import { provisionDevelopmentOrder, DEVELOPMENT_ORDER_MARKER } from "../modules/customer/development-provisioning";
import { uploadAttachment, deleteFixtureFiles } from "../modules/customer/order-files";
import { getTenant, saveWebsiteSettings, saveBrand } from "../modules/tenants/service";
import { getPublicSite } from "../modules/website/service";
import { publicBrandingFile } from "../modules/website/branding-files";
import { exchangeConfiguration, tenantOrders, publicExchange } from "../products/exchange/service";
import { masterExchangeDefaults } from "../products/exchange/master-template";
import { sealIntegrationCredentials, openIntegrationCredentials, integrationSummary } from "../products/exchange/integration-contract";

if (process.env.NODE_ENV !== "development") throw new Error("Master verification requires explicit Development mode.");
// Keep cleanup scope across workspace restarts during long browser passes.
const file = fileURLToPath(new URL("../../../../.local/qa/master-fixtures.json", import.meta.url));
type Fixture = { actors: string[]; planId: string; tenants: { id: string; slug: string; name: string; ownerId: string; orderId: string }[] };
async function cleanup(f: Fixture) {
  const linked = await pool.query("SELECT tenant_id FROM white_label_requests WHERE customer_user_id=ANY($1::text[]) AND tenant_id IS NOT NULL", [f.actors]);
  const tenantIds = [...new Set([...f.tenants.map(t => t.id), ...linked.rows.map(r => r.tenant_id as string)])];
  await deleteFixtureFiles(pool, f.actors.slice(1));
  await pool.query("DELETE FROM white_label_attachments WHERE owner_user_id=ANY($1::text[])", [f.actors.slice(1)]);
  if (f.planId) await cleanCustomerFixtures(tenantIds, f.planId, f.actors);
  else await pool.query("DELETE FROM platform_admins WHERE clerk_user_id=ANY($1::text[])", [f.actors]);
  await unlink(file).catch(() => undefined);
}
// Distinct generated raster logos: letter A / B, no external assets or demo copies.
function logoPng(letter: "A" | "B", rgb: number[]) {
  const crc = (buf: Buffer) => {
    let v = 0xffffffff;
    for (const b of buf) { v ^= b; for (let i = 0; i < 8; i++) v = (v >>> 1) ^ (v & 1 ? 0xedb88320 : 0); }
    return (v ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, bytes: Buffer) => {
    const data = Buffer.concat([Buffer.from(type), bytes]), size = Buffer.alloc(4), checksum = Buffer.alloc(4);
    size.writeUInt32BE(bytes.length); checksum.writeUInt32BE(crc(data)); return Buffer.concat([size, data, checksum]);
  };
  const pattern = letter === "A" ? ["01110","11011","11011","11111","11011","11011","11011"] : ["11110","11011","11011","11110","11011","11011","11110"];
  const pixels = Buffer.alloc(64 * (1 + 64 * 3));
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const px = Math.floor((x - 12) / 8), py = Math.floor((y - 4) / 8);
    const color = px >= 0 && px < 5 && py >= 0 && py < 7 && pattern[py][px] === "1" ? [255,255,255] : rgb;
    color.forEach((v, i) => { pixels[y * 193 + 1 + x * 3 + i] = v; });
  }
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(64); hdr.writeUInt32BE(64, 4); hdr[8] = 8; hdr[9] = 2;
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", hdr), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}
if (process.argv.includes("--cleanup")) {
  try { await cleanup(JSON.parse(await readFile(file, "utf8"))); process.stdout.write("PASS: disposable master fixtures removed.\n"); }
  finally { await pool.end(); }
} else {
  const suffix = randomUUID().slice(0, 8);
  const f: Fixture = { actors: [`user_masterOp${suffix}`, `user_masterA${suffix}`, `user_masterB${suffix}`], planId: "", tenants: [] };
  let keep = false;
  try {
    const reference = await pool.query("SELECT t.id,b.* FROM tenants t JOIN tenant_branding b ON b.tenant_id=t.id WHERE t.slug='novax-live-demo'");
    const original = JSON.stringify(reference.rows);
    await pool.query("INSERT INTO platform_admins(clerk_user_id) VALUES($1)", [f.actors[0]]);
    const operator = await resolvePrincipal(f.actors[0]);
    const pf = planFixture(`Disposable master ${suffix}`, { website: true, crypto_exchange: true, swap: true, convert: true, buy: true, sell: true });
    pf.entitlements = pf.entitlements.map(e => typeof e.value === "boolean" ? e : { ...e, value: "100000" });
    f.planId = (await savePlan(operator, pf)).id;
    for (const [i, label] of (["A", "B"] as const).entries()) {
      const owner = await resolvePrincipal(f.actors[i + 1]);
      const logo = await uploadAttachment(owner, `master-${label}.png`, "image/png", "logo", logoPng(label, i ? [125,60,205] : [30,90,220]));
      const icon = await uploadAttachment(owner, `master-${label}-icon.png`, "image/png", "favicon", logoPng(label, i ? [125,60,205] : [30,90,220]));
      const request = await submitRequest(owner, {
        projectName: `Development Master ${label} ${suffix}`, websiteName: `Atlas ${label} Exchange`,
        brandName: `Atlas ${label} Company`, companyName: `Atlas ${label} Company`,
        preferredDomain: `master-${label.toLowerCase()}-${suffix}.example`, actions: ["swap", "convert", "buy", "sell"],
        requestedPlanId: f.planId, requestedAddonIds: [], details: `${DEVELOPMENT_ORDER_MARKER} disposable isolation verification`,
        idempotencyKey: randomUUID(), design: {
          type: "standard", styleName: "Approved shared Exchange master", primaryColor: i ? "#7d3ccd" : "#1e5adc",
          accentColor: i ? "#b284f4" : "#47b9fc", themePreference: i ? "dark" : "light", description: "", notes: "",
          referenceWebsiteUrl: null, referenceAttachmentIds: [], logoAttachmentId: logo.id, faviconAttachmentId: icon.id,
        },
      });
      const prepared = await provisionDevelopmentOrder(operator, request.id);
      f.tenants.push({ id: prepared.id, slug: prepared.slug, name: prepared.websiteSettings.websiteName!, ownerId: owner.userId, orderId: request.id });
      const concurrent = await Promise.all([provisionDevelopmentOrder(operator, request.id), provisionDevelopmentOrder(operator, request.id)]);
      assert.ok(concurrent.every(t => t.id === prepared.id));
      assert.equal((await orderDetail(owner, request.id)).order.status, "delivered");
      assert.equal((await orderDetail(owner, request.id)).order.tenantId, prepared.id);
      const refreshedOwner = await resolvePrincipal(owner.userId);
      await assertDeliveredExchangeAccess(refreshedOwner, prepared.id);
      assert.equal((await myAdminPanels(refreshedOwner))[0].tenantId, prepared.id);
      const site = await getPublicSite(prepared.slug);
      assert.equal(site.websiteSettings?.websiteName, `Atlas ${label} Exchange`);
      assert.equal(site.primaryColor, i ? "#7d3ccd" : "#1e5adc");
      assert.equal(site.brandName, `Atlas ${label} Company`);
      assert.equal(site.logoUrl, `/api/public/sites/${prepared.slug}/branding/logo`);
      const branding = await publicBrandingFile(prepared.slug, "logo");
      const [logoBytes] = await branding.file.download();
      assert.equal(createHash("sha256").update(logoBytes).digest("hex"),
        createHash("sha256").update(logoPng(label, i ? [125,60,205] : [30,90,220])).digest("hex"));
      assert.equal((await tenantOrders(operator, prepared.id, {})).total, 0, "New tenant must have no copied orders/history.");
      const live = await publicExchange(prepared.slug);
      assert.equal(live.enabled, true);
      assert.ok(!JSON.stringify(site).includes(owner.userId));
    }
    const [a, b] = f.tenants;
    const ownerA = await resolvePrincipal(a.ownerId), ownerB = await resolvePrincipal(b.ownerId);
    await assert.rejects(async () => getTenant(ownerA, b.id), (e: any) => e.status === 403);
    await assert.rejects(async () => exchangeConfiguration(ownerA, b.id), (e: any) => e.status === 403);
    await assert.rejects(async () => saveBrand(ownerA, b.id, { brandName: "Forbidden", logoUrl: null, primaryColor: "#000000", accentColor: "#ffffff", themeMode: "light", defaultLanguage: "en", supportedLanguages: ["en"] }), (e: any) => e.status === 403);
    const beforeB = JSON.stringify(await getPublicSite(b.slug));
    const configB = JSON.stringify((await exchangeConfiguration(ownerB, b.id)).configuration);
    const tenantA = await getTenant(ownerA, a.id);
    await saveWebsiteSettings(ownerA, a.id, { ...tenantA.websiteSettings, supportDetails: "Tenant A isolation test" });
    const exA = (await exchangeConfiguration(ownerA, a.id)).configuration;
    await exchangeConfiguration(ownerA, a.id, { ...exA, routes: exA.routes.map(r => ({ ...r, feeBps: 17 })) });
    assert.equal(JSON.stringify(await getPublicSite(b.slug)), beforeB);
    assert.equal(JSON.stringify((await exchangeConfiguration(ownerB, b.id)).configuration), configB);
    assert.equal(JSON.stringify((await pool.query("SELECT t.id,b.* FROM tenants t JOIN tenant_branding b ON b.tenant_id=t.id WHERE t.slug='novax-live-demo'")).rows), original, "NovaX must remain unchanged.");
    const catalog = (await exchangeConfiguration(operator, a.id)).catalog;
    const one = masterExchangeDefaults(catalog, ["swap"], "USD"), two = masterExchangeDefaults(catalog, ["swap"], "USD");
    assert.notEqual(one.routes[0].id, two.routes[0].id);
    one.assets[0].symbol = "CHANGED";
    assert.notEqual(two.assets[0].symbol, "CHANGED");
    const scope = { tenantId: a.id, kind: "exchange" as const, providerId: "future-adapter" };
    const key = randomBytes(32), credentials = { apiKey: randomBytes(16).toString("hex") };
    const sealed = sealIntegrationCredentials(scope, credentials, key, "test-key");
    assert.deepEqual(openIntegrationCredentials(scope, sealed, key), credentials);
    assert.throws(() => openIntegrationCredentials({ ...scope, tenantId: b.id }, sealed, key));
    assert.throws(() => openIntegrationCredentials({ ...scope, providerId: "other" }, sealed, key));
    assert.ok(!JSON.stringify(integrationSummary({ ...scope, state: "not_connected", credentials: sealed })).includes(sealed.ciphertext));
    const savedMode = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    await assert.rejects(() => provisionDevelopmentOrder(operator, a.orderId), (e: any) => e.status === 403);
    process.env.NODE_ENV = savedMode;
    if (process.argv.includes("--keep")) {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(f), { mode: 0o600 });
      keep = true;
      process.stdout.write(`PASS: master, order branding, uploaded logo/favicon, idempotent provisioning, owner Admin, isolation, defaults and encrypted credential scope. Browser fixtures: ${file}\n`);
    } else process.stdout.write("PASS: master template, isolated branding/configuration, order linkage, owner Admin, idempotency, clean defaults and tenant-bound encryption.\n");
  } finally {
    if (!keep) await cleanup(f);
    await pool.end();
  }
}

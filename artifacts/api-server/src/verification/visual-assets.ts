import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pool } from "@workspace/db";
import { GetExchangeVisualCatalogResponse } from "@workspace/api-zod";
import { isImportedVisualUrl, visualCatalog, visualUrl } from "../products/exchange/visual-assets";

if (process.env.NODE_ENV === "production") throw new Error("Development-only visual verification.");
try {
  const catalog = GetExchangeVisualCatalogResponse.parse(visualCatalog);
  assert.equal(catalog.assets.length, 424);
  assert.equal(catalog.unavailable.length, 10);
  assert.equal(new Set(catalog.assets.map(a => `${a.kind}:${a.code}`)).size, catalog.assets.length);
  const blobs = visualCatalog.blobs;
  assert.equal(blobs.length, 241);
  for (const a of catalog.assets) {
    for (const url of [a.logoUrl, ...a.alternatives]) assert.ok(isImportedVisualUrl(url), `Unrecognized catalog URL for ${a.code}`);
  }
  assert.equal(isImportedVisualUrl("/api/exchange/visual-assets/" + "0".repeat(64) + ".svg"), false);
  assert.equal(isImportedVisualUrl("/api/exchange/visual-assets/../../private"), false);
  assert.equal(isImportedVisualUrl("https://example.com/asset.svg"), false);
  for (const [code, id] of [["BTC", "btc"], ["ETH", "eth"], ["USDT", "usdt"], ["SOL", "sol"], ["BNB", "bnb"]]) {
    assert.equal(catalog.assets.find(a => a.kind === "crypto" && a.code === code)?.recordId, id);
  }
  assert.equal(catalog.assets.find(a => a.kind === "network" && a.code === "SOL")?.recordId, catalog.assets.find(a => a.kind === "network" && a.code === "SPL")?.recordId);
  assert.equal(catalog.assets.find(a => a.kind === "network" && a.code === "POLYGON")?.recordId, catalog.assets.find(a => a.kind === "network" && a.code === "POLYGON_LEGACY")?.recordId);
  const usd = catalog.assets.find(a => a.kind === "currency" && a.code === "USD")!;
  assert.equal(usd.logoUrl, catalog.assets.find(a => a.kind === "flag" && a.code === "US")?.logoUrl);
  assert.equal(catalog.assets.find(a => a.kind === "currency" && a.code === "GBP")?.logoUrl, catalog.assets.find(a => a.kind === "flag" && a.code === "GB")?.logoUrl);
  assert.ok(catalog.assets.filter(a => a.kind === "payment-method").some(a => a.alternatives.length > 0));
  assert.equal(JSON.stringify(catalog).includes("blobs"), false);
  assert.equal(JSON.stringify(catalog).includes("tenantId"), false);
  const duplicates = (await pool.query("SELECT lower(symbol) FROM asset_catalog GROUP BY lower(symbol) HAVING count(*)>1")).rows;
  assert.deepEqual(duplicates, []);
  if (process.argv.includes("--baseline")) {
    const baseline = JSON.parse(await readFile("/tmp/qxlayer-visual-import-baseline.json", "utf8"));
    const current = (await pool.query("SELECT tenant_id,configuration FROM tenant_product_configuration WHERE module_key='crypto_exchange' ORDER BY tenant_id")).rows;
    for (const row of current) {
      for (const a of row.configuration.assets ?? []) delete a.logoUrl;
      for (const m of row.configuration.paymentMethods ?? []) delete m.logoUrl;
    }
    assert.deepEqual(current, baseline.configurations, "Non-visual Exchange configuration changed");
    assert.deepEqual((await pool.query("SELECT * FROM tenant_asset_networks ORDER BY tenant_id,asset_network_id")).rows, baseline.assignments, "Tenant assignment changed");
    assert.deepEqual((await pool.query("SELECT id,status,request FROM exchange_orders ORDER BY id")).rows, baseline.orders, "Existing orders changed");
    process.stdout.write("PASS: import left every non-visual configuration field, tenant assignment and existing order unchanged.\n");
  }
  if (process.argv.includes("--http")) {
    const origin = "http://localhost:80";
    const response = await fetch(`${origin}/api/exchange/visual-catalog`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), catalog);
    const invalid = await fetch(`${origin}/api/exchange/visual-assets/${"0".repeat(64)}.svg`);
    assert.equal(invalid.status, 404);
    // Every imported object is fetched through the same public proxy as the UI.
    // Byte hashes prove SVG/PNG/WEBP transparency/quality were not transformed.
    const pending = [...blobs];
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (pending.length) {
        const b = pending.pop()!;
        const r = await fetch(`${origin}${visualUrl(b.filename)}`);
        assert.equal(r.status, 200, b.filename);
        assert.equal(r.headers.get("content-type")?.split(";")[0], b.contentType);
        assert.equal(r.headers.get("x-content-type-options"), "nosniff");
        assert.ok(r.headers.get("content-security-policy")?.includes("sandbox"));
        const bytes = Buffer.from(await r.arrayBuffer());
        assert.equal(createHash("sha256").update(bytes).digest("hex"), b.filename.split(".")[0]);
      }
    }));
    process.stdout.write("PASS: all 241 stored originals load through the proxy with exact SHA-256 hashes, original MIME types and SVG isolation headers; unknown paths return 404.\n");
  }
  process.stdout.write("PASS: 424 unique visual identities, stable existing record matches, shared network aliases, currency/flag mappings, variants and 10 explicit unavailable identities.\n");
} finally { await pool.end(); }

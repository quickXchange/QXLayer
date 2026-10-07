import test from "node:test";
import assert from "node:assert/strict";
import { classifyGlobal, globalManifest, globalManifestFingerprint, globalPreflightSql, prepareGlobalApply } from "./global-foundation";
const fresh = () => ({ capturedAt: new Date().toISOString(), tables: Object.fromEntries(Object.keys(globalManifest).map(t => [t, []])) });
test("empty Production configuration can initialize only curated global dictionaries and exactly 15 cards", () => {
  const s = fresh(), rows = classifyGlobal(s);
  assert(rows.every(r => r.classification === "INSERT"));
  assert.equal(rows.filter(r => r.table === "landing_products").length, 15);
  assert(!rows.some(r => r.key === "kolo"));
  assert.deepEqual(Object.keys(s.tables), ["module_catalog", "entitlement_definitions", "asset_catalog", "network_catalog", "asset_network_catalog", "landing_products"]);
  const approval = { manifestFingerprint: globalManifestFingerprint, insert: Object.fromEntries(Object.entries(globalManifest).map(([t, m]) => [t, m.rows.map(r => String(r[m.key]))])), preserve: {}, restoreVisibility: [] };
  const sql = prepareGlobalApply(s, approval);
  assert(!/\b(?:DELETE|TRUNCATE|ALTER|CREATE TABLE|platform_admins|tenant_memberships|plans|addons|provider_assignments|credentials|exchange_orders)\b/i.test(sql.replace(/^--.*$/gm, "")));
  assert(sql.indexOf("Preflight drift") < sql.indexOf("INSERT INTO"));
  assert(sql.includes("Postcondition failed")); assert(sql.includes("15 minutes"));
  assert(!/INSERT|UPDATE|DELETE|TRUNCATE/.test(globalPreflightSql));
  assert.throws(() => prepareGlobalApply(s, { ...approval, insert: {} }), /Review required/);
});
test("JSON key order is irrelevant; edited global configuration and hidden edited cards are preserved only with review", () => {
  const s = { capturedAt: new Date().toISOString(), tables: Object.fromEntries(Object.entries(globalManifest).map(([t, m]) => [t, structuredClone(m.rows)])) };
  const module = s.tables.module_catalog[0];
  module.definition = Object.fromEntries(Object.entries(module.definition as object).reverse());
  assert.equal(classifyGlobal(s).find(r => r.table === "module_catalog")!.classification, "UNCHANGED");
  s.tables.landing_products[0].visible = false;
  s.tables.landing_products[0].name = "Intentional custom marketing";
  assert.equal(classifyGlobal(s).find(r => r.table === "landing_products")!.classification, "CONFLICT / REVIEW REQUIRED");
  const sql = prepareGlobalApply(s, { manifestFingerprint: globalManifestFingerprint, insert: {}, restoreVisibility: [],
    preserve: { landing_products: [String(s.tables.landing_products[0].key)] } });
  assert(!sql.includes("SET name"));
});

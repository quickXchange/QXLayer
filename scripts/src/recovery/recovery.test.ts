import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { approvedRecords, catalogPreflightSql, classifyCatalog, prepareCatalogApply, type CatalogSnapshot } from "./catalog-package";
const fresh = (rows = approvedRecords.map(r => ({ ...r }))): CatalogSnapshot =>
  ({ capturedAt: new Date().toISOString(), catalogRows: rows, moduleKeys: approvedRecords.map(r => r.key) });
test("old delivery predicate implies new predicate for every allowed lifecycle state", () => {
  const statuses = ["new", "reviewing", "waiting_for_client", "quote_ready", "approved", "in_setup", "customization", "ready", "delivered", "rejected", "cancelled"];
  for (const status of statuses) for (const linked of [false, true]) {
    const old = (status === "delivered") === linked;
    const next = status !== "delivered" || linked;
    if (old) assert(next, `${status}: old-valid row rejected by new constraint`);
    if (["in_setup", "customization", "ready"].includes(status) && linked) { assert(!old); assert(next); }
    if (status === "delivered" && !linked) assert(!next);
  }
});
test("schema scripts touch only the named CHECK and rollback refuses incompatible rows", () => {
  for (const name of ["02-delivery-forward.sql", "03-delivery-rollback.sql"]) {
    const sql = readFileSync(new URL(`../../../reports/final-recovery/${name}`, import.meta.url), "utf8");
    assert(sql.includes("LOCK TABLE public.white_label_requests"));
    assert(sql.includes("convalidated"));
    assert(!/\b(?:DELETE|TRUNCATE|CREATE TABLE|UPDATE)\b/i.test(sql.replace(/^--.*$/gm, "")));
    assert(sql.includes("DROP CONSTRAINT white_label_request_delivery"));
    assert.match(sql, /END;\n\$qx_(?:recovery|rollback)\$/);
  }
  const rollback = readFileSync(new URL("../../../reports/final-recovery/03-delivery-rollback.sql", import.meta.url), "utf8");
  assert(rollback.includes("IS FALSE"));
  assert(rollback.includes("Rollback blocked"));
});
test("empty catalog is exactly 15 INSERT; repeat populated preflight is UNCHANGED", () => {
  assert(classifyCatalog(fresh([])).every(r => r.classification === "INSERT"));
  const plan = classifyCatalog(fresh());
  assert.equal(plan.length, 15);
  assert(plan.every(r => r.classification === "UNCHANGED"));
  assert(!plan.some(r => r.key === "kolo"));
});
test("classifies all four states without overwriting edited configuration", () => {
  const s = fresh();
  s.catalogRows.shift();
  s.catalogRows[1].visible = false;
  s.catalogRows[2].starting_price = "999.00";
  const plan = classifyCatalog(s);
  assert.equal(plan[0].classification, "INSERT");
  assert.equal(plan[1].classification, "UNCHANGED");
  assert.equal(plan[2].classification, "RESTORE VISIBILITY");
  assert.equal(plan[3].classification, "CONFLICT / REVIEW REQUIRED");
  assert.deepEqual(plan[3].differences, ["starting_price"]);
});
test("missing dependencies, duplicate keys and out-of-scope records fail closed", () => {
  const s = fresh([]);
  s.moduleKeys.pop();
  assert.equal(classifyCatalog(s).at(-1)!.classification, "CONFLICT / REVIEW REQUIRED");
  assert.throws(() => prepareCatalogApply(s, { approvedInsertKeys: approvedRecords.slice(0, -1).map(r => r.key), approvedVisibilityKeys: [], preserveConflictKeys: [approvedRecords.at(-1)!.key] }), /Missing module/);
  assert.throws(() => classifyCatalog(fresh([approvedRecords[0], approvedRecords[0]])), /duplicate/);
  assert.throws(() => classifyCatalog(fresh([{ ...approvedRecords[0], key: "kolo" }])), /Unapproved/);
});
test("apply requires per-key approval, frozen baseline and postcondition", () => {
  const s = fresh([]);
  assert.throws(() => prepareCatalogApply(s, { approvedInsertKeys: [], approvedVisibilityKeys: [], preserveConflictKeys: [] }), /Explicit review/);
  const sql = prepareCatalogApply(s, { approvedInsertKeys: approvedRecords.map(r => r.key), approvedVisibilityKeys: [], preserveConflictKeys: [] });
  assert(sql.includes("IS DISTINCT FROM expected_rows"));
  assert(sql.includes("IS DISTINCT FROM final_rows"));
  assert(sql.includes("15 minutes"));
  assert(sql.includes("Nonstandard catalog triggers"));
  assert(!/\b(?:DELETE|TRUNCATE|ALTER TABLE)\b/i.test(sql.replace(/^--.*$/gm, "")));
  assert(!sql.includes("'kolo'"));
});
test("visibility approval is explicit; conflicts can only be explicitly preserved", () => {
  const s = fresh();
  s.catalogRows[0].visible = false;
  s.catalogRows[1].name = "Existing Production Copy";
  s.catalogRows[1].description = "'; DROP TABLE tenants; --";
  assert.throws(() => prepareCatalogApply(s, { approvedInsertKeys: [], approvedVisibilityKeys: [s.catalogRows[0].key], preserveConflictKeys: [] }), /Explicit review/);
  const sql = prepareCatalogApply(s, { approvedInsertKeys: [], approvedVisibilityKeys: [s.catalogRows[0].key], preserveConflictKeys: [s.catalogRows[1].key] });
  assert(sql.includes("SET visible=true"));
  assert(!sql.includes("SET name="));
  assert(!sql.includes("DROP TABLE tenants"));
  assert.throws(() => prepareCatalogApply(s, { approvedInsertKeys: ["kolo"], approvedVisibilityKeys: [], preserveConflictKeys: [] }), /Invalid per-key/);
});
test("catalog preflight is read-only and restricted to platform-global tables", () => {
  assert(catalogPreflightSql.includes("BEGIN READ ONLY"));
  assert(!/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER)\b/i.test(catalogPreflightSql));
  assert(!/\b(?:tenants|white_label_requests|tenant_memberships|exchange_orders)\b/.test(catalogPreflightSql));
});

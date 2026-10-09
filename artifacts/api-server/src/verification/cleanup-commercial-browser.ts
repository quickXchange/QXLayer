import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { pool } from "@workspace/db";
import { deleteCatalogRecord } from "../modules/entitlements/catalog";
import type { Principal } from "../modules/authentication/service";

if (process.env.NODE_ENV === "production") throw new Error("Development QA cleanup only.");
const path = "../../.local/commercial-white-label-browser-qa.json";
const manifest = JSON.parse(readFileSync(path, "utf8"));
assert.match(manifest.environment, /development/i);
const ids = (key: string): string[] => {
  const values = [...new Set<string>(manifest.records[key] ?? [])];
  assert(values.every(id => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)), `Invalid ${key} scope`);
  return values;
};
const tenantIds = ids("tenantUuids"), orderIds = ids("orderUuids");
const planIds = ids("planUuids"), addonIds = ids("addOnUuids"), eventIds = ids("notificationUuids");
// The tester also classified the customer-note event under "other"; its exact ID is already in the notification scope.
assert(ids("otherUuids").every(id => eventIds.includes(id)), "Unclassified QA records require explicit cleanup review.");
const operatorId: string = manifest.identities.operator.clerkUserId;
const customerId: string = manifest.identities.customer.clerkUserId;
assert.match(operatorId, /^user_[A-Za-z0-9]+$/); assert.match(customerId, /^user_[A-Za-z0-9]+$/);
const actorIds = [operatorId, customerId];
const op: Principal = { userId: operatorId, role: "super_admin", memberships: [] };
const deleted: Record<string, number> = {};
try {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.actor_id',$1,true),set_config('app.is_super_admin','true',true),set_config('app.can_write','true',true)", [operatorId]);
    const baseline = JSON.parse(readFileSync("../../reports/commercial-white-label-release/development-preqa-baseline.json", "utf8"));
    const expectedOwner = baseline.fingerprints.split("\n").find((line: string) => line.startsWith("platform_admins,")).split(",")[2];
    const owner = await c.query("SELECT md5(coalesce(string_agg(md5(row_to_json(a)::text),'' ORDER BY md5(row_to_json(a)::text)),'')) AS fingerprint FROM platform_admins a WHERE NOT(clerk_user_id=ANY($1::text[]))", [actorIds]);
    assert.equal(owner.rows[0].fingerprint, expectedOwner, "Wrong database or changed original Development owner: no cleanup allowed.");
    const columns = await c.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'");
    const tables = new Map<string, Set<string>>();
    for (const r of columns.rows) {
      assert(/^[a-z_][a-z0-9_]*$/.test(r.table_name));
      if (!tables.has(r.table_name)) tables.set(r.table_name, new Set());
      tables.get(r.table_name)!.add(r.column_name);
    }
    const predicates = new Map<string, { sql: string; args: unknown[] }>();
    for (const [table, cols] of tables) if (cols.has("tenant_id") && !["white_label_requests", "audit_events"].includes(table)) {
      predicates.set(table, { sql: "tenant_id=ANY($1::uuid[])", args: [tenantIds] });
    }
    predicates.set("tenants", { sql: "id=ANY($1::uuid[])", args: [tenantIds] });
    predicates.set("white_label_requests", { sql: "id=ANY($1::uuid[])", args: [orderIds] });
    predicates.set("white_label_events", { sql: "request_id=ANY($1::uuid[]) OR id=ANY($2::uuid[])", args: [orderIds, eventIds] });
    predicates.set("customer_notification_reads", { sql: "event_id IN (SELECT id FROM white_label_events WHERE request_id=ANY($1::uuid[]) OR id=ANY($2::uuid[]))", args: [orderIds, eventIds] });
    predicates.set("audit_events", { sql: "actor_id=ANY($1::text[]) OR tenant_id=ANY($2::uuid[])", args: [actorIds, tenantIds] });
    // The two generated Clerk identities remain unassigned; do not delete accounts.
    predicates.set("platform_admins", { sql: "clerk_user_id=$1", args: [operatorId] });
    const edges = await c.query(`SELECT child.relname AS child,parent.relname AS parent
      FROM pg_constraint fk JOIN pg_class child ON child.oid=fk.conrelid JOIN pg_class parent ON parent.oid=fk.confrelid
      JOIN pg_namespace n ON n.oid=child.relnamespace WHERE fk.contype='f' AND n.nspname='public'`);
    const visited = new Set<string>(), visiting = new Set<string>(), ordered: string[] = [];
    const visit = (table: string) => {
      if (visited.has(table) || !predicates.has(table)) return;
      assert(!visiting.has(table), "Cyclic QA cleanup requires explicit review.");
      visiting.add(table);
      for (const e of edges.rows) if (e.parent === table && e.child !== table) visit(e.child);
      visiting.delete(table); visited.add(table); ordered.push(table);
    };
    for (const table of predicates.keys()) visit(table);
    for (const table of ordered) {
      const p = predicates.get(table)!;
      const result = await c.query(`DELETE FROM "${table}" WHERE ${p.sql}`, p.args);
      deleted[table] = result.rowCount ?? 0;
    }
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); }
  // Preserve any unexpected outside reference: use the same protected deletion as the operator UI.
  for (const id of addonIds) if ((await pool.query("SELECT 1 FROM addons WHERE id=$1", [id])).rowCount) await deleteCatalogRecord(op, id, "addon");
  for (const id of planIds) if ((await pool.query("SELECT 1 FROM plans WHERE id=$1", [id])).rowCount) await deleteCatalogRecord(op, id, "plan");
  await pool.query("DELETE FROM audit_events WHERE actor_id=ANY($1::text[])", [actorIds]);
  manifest.cleanup = { status: "complete", completedAt: new Date().toISOString(), deleted, clerkIdentities: "retained unassigned; no account deletion" };
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  console.info("Removed exact recorded QA business records and temporary access. Existing rows and Clerk accounts retained.");
} catch (e) {
  manifest.cleanup = { status: "requires-review", message: String(e) };
  writeFileSync(path, JSON.stringify(manifest, null, 2)); throw e;
} finally { await pool.end(); }

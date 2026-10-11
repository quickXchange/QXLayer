import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { rowPolicies } from "./row-security";
import { pricingRulesTable } from "./schema/commerce";

test("pricing rules are public-read-only, with the existing tenant write predicate", () => {
  const pricing = rowPolicies("pricing_rules", true);
  assert.equal(pricing.read, "(true)");
  assert.equal(pricing.write, rowPolicies("exchange_orders", true).write);
  assert.match(pricing.write, /app\.can_write/);
  assert.match(pricing.write, /app\.is_super_admin/);
  assert.match(pricing.write, /app\.tenant_id/);
  assert.notEqual(rowPolicies("exchange_orders", true).read, "(true)");
});

test("Drizzle pricing policies carry USING true and guarded USING/WITH CHECK writes", () => {
  const policies = getTableConfig(pricingRulesTable).policies;
  const read = policies.find(p => p.name === "qx_read")!;
  const write = policies.find(p => p.name === "qx_write")!;
  const dialect = new PgDialect();
  assert.equal(read.for, "select");
  assert.equal(dialect.sqlToQuery(read.using!).sql, "(true)");
  for (const expression of [write.using, write.withCheck]) {
    assert.ok(expression);
    assert.equal(dialect.sqlToQuery(expression).sql, rowPolicies("pricing_rules", true).write);
  }
});

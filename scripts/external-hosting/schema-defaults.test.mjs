import test from "node:test";
import assert from "node:assert/strict";
import { canonicalSchema } from "../external-postgres/schema-reference.mjs";
const column = (table, name, type, value) => ({
  table_name: table, name, type, required: true, default_value: value,
});
const normalize = c => canonicalSchema({ columns: [c], constraints: [], indexes: [] }).columns[0];
test("Only four reviewed pg_dump constant spellings are equivalent", () => {
  for (const name of ["monthly_price", "yearly_price", "setup_fee"])
    assert.equal(normalize(column("addons", name, "numeric(22,2)", "'0'::numeric")).default_value, "0");
  assert.equal(normalize(column("tenant_branding", "supported_languages", "text[]",
    "'{en}'::text[]")).default_value, "ARRAY['en'::text]");
});
test("Default comparison preserves real drift, casts, nullability and unknown columns", () => {
  for (const c of [
    column("addons", "monthly_price", "numeric(22,2)", "'1'::numeric"),
    column("addons", "monthly_price", "numeric(22,2)", null),
    column("addons", "monthly_price", "numeric(22,2)", "'0'::numeric + malicious()"),
    column("plans", "monthly_price", "numeric(22,2)", "'0'::numeric"),
    column("addons", "monthly_price", "numeric(10,2)", "'0'::numeric"),
    { ...column("addons", "monthly_price", "numeric(22,2)", "'0'::numeric"), required: false },
    column("tenant_branding", "supported_languages", "text[]", "'{en,fr}'::text[]"),
  ]) assert.deepEqual(normalize(c), c);
});

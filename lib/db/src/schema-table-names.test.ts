import test from "node:test";
import assert from "node:assert/strict";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { applicationTableNames } from "./schema-table-names";

test("public tenant RLS inventory retains every business table and excludes private Auth support", () => {
  const tables = Object.values(schema).filter(t => is(t, PgTable)).map(t => getTableConfig(t));
  const names = applicationTableNames();
  const publicTables = tables.filter(t => !t.schema || t.schema === "public");
  assert.deepEqual(names, publicTables.map(t => t.name));
  assert(names.includes("platform_admins"));
  assert(names.includes("tenant_memberships"));
  assert(names.includes("white_label_requests"));
  const privateTables = tables.filter(t => t.schema === "vynox_supabase_auth");
  assert.equal(privateTables.length, 5);
  for (const t of privateTables) assert(!names.includes(t.name), `${t.name} is not a public tenant table`);
});

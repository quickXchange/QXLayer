import test from "node:test";
import assert from "node:assert/strict";
import { catalogSql } from "./production-recovery-catalog.mjs";
test("recovery catalog is schema-scoped, read-only and excludes stored role passwords", () => {
  assert.match(catalogSql, /BEGIN READ ONLY/);
  assert.match(catalogSql, /pg_default_acl/);
  assert.match(catalogSql, /pg_auth_members/);
  assert.match(catalogSql, /vynox_supabase_auth/);
  assert.doesNotMatch(catalogSql, /rolpassword|\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|GRANT|REVOKE)\b/i);
});

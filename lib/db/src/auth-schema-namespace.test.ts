import test from "node:test";
import assert from "node:assert/strict";
import { getTableConfig } from "drizzle-orm/pg-core";
import { supabaseAuthSchema, supabaseIdentityLinks, supabaseSessions, supabaseRateLimits,
  supabaseRecoveryCodes, supabaseRecoveryEvents } from "./schema/supabase-sessions";

test("Auth namespace is exported for schema generation and all support tables stay private", () => {
  assert.equal(supabaseAuthSchema.schemaName, "vynox_supabase_auth");
  const tables = [supabaseIdentityLinks, supabaseSessions, supabaseRateLimits, supabaseRecoveryCodes, supabaseRecoveryEvents];
  assert.equal(tables.length, 5);
  for (const table of tables) assert.equal(getTableConfig(table).schema, "vynox_supabase_auth");
});

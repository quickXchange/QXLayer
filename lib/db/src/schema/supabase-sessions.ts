import { sql } from "drizzle-orm";
import { check, integer, pgSchema, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Existing application-owned support schema. Provider users/factors stay in Supabase.
// Declaration only: no startup DDL, identity import or publish-time custom migration.
// Export the namespace itself so Drizzle emits CREATE SCHEMA before its tables.
export const supabaseAuthSchema = pgSchema("vynox_supabase_auth");
const auth = supabaseAuthSchema;
export const supabaseIdentityLinks = auth.table("identity_links", {
  subject: uuid("subject").primaryKey(),
  businessId: text("business_id").notNull().unique("identity_links_business_id_key"),
  proofSubject: text("proof_subject").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const supabaseSessions = auth.table("sessions", {
  digest: text("digest").primaryKey(),
  subject: uuid("subject").notNull(),
  envelope: text("envelope").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, t => [check("sessions_digest_check", sql`${t.digest} ~ '^[a-f0-9]{64}$'`)]);
export const supabaseRateLimits = auth.table("rate_limits", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
export const supabaseRecoveryCodes = auth.table("recovery_codes", {
  subject: uuid("subject").notNull(),
  digest: text("digest").notNull(),
  factorFingerprint: text("factor_fingerprint").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, t => [
  primaryKey({ name: "recovery_codes_pkey", columns: [t.subject, t.digest] }),
  check("recovery_codes_digest_check", sql`${t.digest} ~ '^[a-f0-9]{64}$'`),
  check("recovery_codes_factor_fingerprint_check", sql`${t.factorFingerprint} ~ '^[a-f0-9]{64}$'`),
]);
export const supabaseRecoveryEvents = auth.table("recovery_events", {
  id: uuid("id").primaryKey(),
  subject: uuid("subject").notNull(),
  operation: text("operation").notNull(),
  outcome: text("outcome").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  check("recovery_events_operation_check", sql`${t.operation} = ANY (ARRAY['generate'::text, 'recover'::text])`),
  check("recovery_events_outcome_check", sql`${t.outcome} = ANY (ARRAY['complete'::text, 'consumed'::text, 'failed'::text])`),
]);

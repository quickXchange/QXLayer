import assert from "node:assert/strict";
import { schemaDigest } from "./provisioning-schema-contract.mjs";

export const commercialSchemaFiles = ["lib/db/src/schema/plans.ts", "lib/db/src/schema/customer-notifications.ts"];
const normalize = s => s.toLowerCase().replaceAll('"', "").replaceAll("public.", "").replace(/::(?:numeric|text)/g, "").replace(/[\s();]/g, "");
// Explicitly reviewed additions only. No row copying, overwrites, startup DDL or broad schema synchronization.
export const commercialAdditions = [
  `CREATE TABLE customer_notification_reads (customer_user_id text NOT NULL,event_id uuid NOT NULL,read_at timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT customer_notification_reads_customer_user_id_event_id_pk PRIMARY KEY(customer_user_id,event_id));`,
  `ALTER TABLE addons ADD COLUMN discount_percent numeric(5,2) DEFAULT '0' NOT NULL;`,
  `ALTER TABLE addons ADD COLUMN pricing_confirmed boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE plans ADD COLUMN pricing_configured boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE plans ADD COLUMN discount_percent numeric(5,2) DEFAULT '0' NOT NULL;`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN billing_period text DEFAULT 'monthly' NOT NULL;`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN discount_percent numeric(5,2) DEFAULT '0' NOT NULL;`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN cancelled boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE tenant_subscriptions ADD COLUMN operator_note text DEFAULT '' NOT NULL;`,
  `ALTER TABLE customer_notification_reads ADD CONSTRAINT customer_notification_reads_event_id_white_label_events_id_fk FOREIGN KEY(event_id) REFERENCES white_label_events(id) ON DELETE no action ON UPDATE no action;`,
  `ALTER TABLE addons ADD CONSTRAINT addons_discount CHECK ((discount_percent >= 0) AND (discount_percent <= 100));`,
  `ALTER TABLE plans ADD CONSTRAINT plans_discount CHECK ((discount_percent >= 0) AND (discount_percent <= 100));`,
  `ALTER TABLE tenant_subscriptions ADD CONSTRAINT subscription_billing_period CHECK (billing_period = ANY (ARRAY['monthly','yearly']));`,
  `ALTER TABLE tenant_subscriptions ADD CONSTRAINT subscription_discount CHECK ((discount_percent >= 0) AND (discount_percent <= 100));`,
];

export function verifyCommercialPlan({ diff, schemaDigests }, read) {
  for (const file of commercialSchemaFiles) assert.equal(schemaDigest(read(file)), schemaDigests[file], `Commercial schema changed: refresh reviewed evidence for ${file}.`);
  assert.equal(diff.success, true, "Commercial native diff unavailable.");
  for (const key of ["tablesToRemove", "tablesToTruncate", "columnsToRemove", "schemasToRemove", "matViewsToRemove"]) {
    assert(Array.isArray(diff[key]) && diff[key].length === 0, `Unsafe or missing commercial diff field: ${key}`);
  }
  assert.equal(diff.hasStructuralDataLoss, false);
  assert.equal(diff.maybeNonBackwardsCompatible, false);
  assert(Array.isArray(diff.statementsToExecute));
  assert.equal(diff.hasDiff, diff.statementsToExecute.length > 0);
  const allowed = new Set(commercialAdditions.map(normalize));
  const seen = new Set();
  for (const statement of diff.statementsToExecute) {
    const sql = normalize(statement);
    assert(allowed.has(sql), "Unexpected commercial migration statement: review separately.");
    assert(!seen.has(sql), "Duplicate commercial migration statement.");
    seen.add(sql);
  }
  return diff.hasDiff ? `reviewed ${seen.size} additive native statements` : "already-applied";
}

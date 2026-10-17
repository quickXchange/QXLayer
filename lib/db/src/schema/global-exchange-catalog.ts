import { integer, jsonb, primaryKey, text, boolean, foreignKey, check, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { pgTable } from "../row-security";

// Global reference data only. Availability is not tenant activation or connectivity.
export const globalExchangeCatalogTable = pgTable("global_exchange_catalog", {
  kind: text("kind").notNull(),
  id: text("id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("catalog_only"),
  logoUrl: text("logo_url"),
  metadata: jsonb("metadata").notNull().default({}),
  revision: integer("revision").notNull().default(1),
}, t => [
  primaryKey({name:"global_exchange_catalog_pkey",columns:[t.kind,t.id]}),
  uniqueIndex("global_exchange_catalog_identity").on(t.kind,sql`lower(${t.code})`),
  check("global_exchange_catalog_kind_check",sql`${t.kind} in ('currencies','payment_methods','assets','networks')`),
  check("global_exchange_catalog_status_check",sql`${t.status} in ('enabled','disabled','catalog_only')`),
  check("global_exchange_catalog_revision_check",sql`${t.revision}>0`),
  check("global_exchange_catalog_check",sql`${t.kind}<>'currencies' or (${t.id}=${t.code} and ${t.code} ~ '^[A-Z]{3}$' and ${t.code} not in ('DZD','ILS'))`),
  check("global_exchange_catalog_metadata_check",sql`not coalesce((${t.metadata}->'countryCodes') ?| array['DZ','IL'],false)`),
  check("global_exchange_catalog_check1",sql`${t.status}<>'enabled' or coalesce((${t.metadata}->>'verified'='true' and ${t.metadata}->>'sourceUrl' like 'https://%'),false)`),
]);
export const globalExchangeCatalogLinksTable = pgTable("global_exchange_catalog_links", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  sourceId: text("source_id").notNull(),
  targetId: text("target_id").notNull(),
  sourceKind: text("source_kind").generatedAlwaysAs(sql`case when kind='asset_network' then 'assets' else 'payment_methods' end`),
  targetKind: text("target_kind").generatedAlwaysAs(sql`case when kind='asset_network' then 'networks' else 'currencies' end`),
  enabled: boolean("enabled").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  metadata: jsonb("metadata").notNull().default({}),
}, t => [
  foreignKey({name:"global_exchange_catalog_links_source_kind_source_id_fkey",columns:[t.sourceKind,t.sourceId],foreignColumns:[globalExchangeCatalogTable.kind,globalExchangeCatalogTable.id]}),
  foreignKey({name:"global_exchange_catalog_links_target_kind_target_id_fkey",columns:[t.targetKind,t.targetId],foreignColumns:[globalExchangeCatalogTable.kind,globalExchangeCatalogTable.id]}),
  unique("global_exchange_catalog_links_kind_source_id_target_id_key").on(t.kind,t.sourceId,t.targetId),
  check("global_exchange_catalog_links_kind_check",sql`${t.kind} in ('payment_fiat','asset_network')`),
  check("global_exchange_catalog_links_check",sql`not ${t.enabled} or ${t.verified}`),
  check("global_exchange_catalog_links_check1",sql`not ${t.verified} or ${t.kind}<>'asset_network' or coalesce(${t.metadata}->>'native'='true',false) or coalesce(length(${t.metadata}->>'contractAddress')>0,false)`),
  check("global_exchange_catalog_links_metadata_check",sql`not coalesce((${t.metadata}->'countryCodes') ?| array['DZ','IL'],false)`),
]);

import { sql } from "drizzle-orm";
import { boolean, check, integer, numeric, text } from "drizzle-orm/pg-core";
import { pgTable } from "../row-security";
import { modulesTable } from "./catalog";

// Marketing metadata only. This table cannot grant rights or load product code.
export const landingProductsTable = pgTable("landing_products", {
  key: text("key").primaryKey().references(() => modulesTable.key),
  visible: boolean("visible").notNull().default(true),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  startingPrice: numeric("starting_price", { precision: 12, scale: 2 }),
  setupFee: numeric("setup_fee", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  billingPeriod: text("billing_period").notNull().default("on_request"),
  status: text("status").notNull().default("coming_soon"),
  ctaLabel: text("cta_label").notNull().default("Learn More"),
  displayOrder: integer("display_order").notNull().default(0),
}, (t) => [
  check("landing_products_amounts", sql`(${t.startingPrice} IS NULL OR ${t.startingPrice}>=0) AND (${t.setupFee} IS NULL OR ${t.setupFee}>=0)`),
  check("landing_products_order", sql`${t.displayOrder} BETWEEN 0 AND 10000`),
  check("landing_products_currency", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  check("landing_products_billing", sql`${t.billingPeriod} IN ('monthly','yearly','one_time','on_request')`),
  check("landing_products_status", sql`${t.status} IN ('available','coming_soon')`),
  check("landing_products_icon", sql`${t.icon} IN ('exchange','card','payments','staking','earn','dex','content','telegram','miniapp','whatsapp','ios','android','engine','nodes','mining','kolo')`),
  check("landing_products_copy", sql`length(btrim(${t.name})) BETWEEN 2 AND 100 AND length(btrim(${t.description})) BETWEEN 10 AND 500 AND length(btrim(${t.ctaLabel})) BETWEEN 2 AND 40`),
]);
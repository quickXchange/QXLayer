import { boolean, jsonb, text } from "drizzle-orm/pg-core";
import { pgTable } from "../row-security";
import { createInsertSchema } from "drizzle-zod";

export const modulesTable = pgTable("module_catalog", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  sandboxAvailable: boolean("sandbox_available").notNull().default(true),
  definition: jsonb("definition").notNull().default({}),
});

export const assetsTable = pgTable("asset_catalog", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
});

export const networksTable = pgTable("network_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  testnet: boolean("testnet").notNull().default(true),
});

export const assetNetworksTable = pgTable("asset_network_catalog", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assetsTable.id),
  networkId: text("network_id").notNull().references(() => networksTable.id),
});

export const insertModuleSchema = createInsertSchema(modulesTable);
export const insertAssetSchema = createInsertSchema(assetsTable);
export const insertNetworkSchema = createInsertSchema(networksTable);
export const insertAssetNetworkSchema = createInsertSchema(assetNetworksTable);
export type ModuleDefinitionRow = typeof modulesTable.$inferSelect;
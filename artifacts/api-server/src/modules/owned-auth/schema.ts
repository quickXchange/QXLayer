import { pgSchema, text, timestamp, boolean, integer, bigint } from "drizzle-orm/pg-core";

// Deliberately separate from the public business/RLS schema and API models.
const authSchema = pgSchema("qxlayer_auth");
const dates = () => ({
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});
export const user = authSchema.table("user", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  email: text("email").notNull().unique(), emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"), twoFactorEnabled: boolean("twoFactorEnabled").notNull().default(false), ...dates(),
});
export const session = authSchema.table("session", {
  id: text("id").primaryKey(), token: text("token").notNull().unique(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  ipAddress: text("ipAddress"), userAgent: text("userAgent"), ...dates(),
});
export const account = authSchema.table("account", {
  id: text("id").primaryKey(), accountId: text("accountId").notNull(), providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  password: text("password"), accessToken: text("accessToken"), refreshToken: text("refreshToken"), idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }), scope: text("scope"), ...dates(),
});
export const verification = authSchema.table("verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(), ...dates(),
});
export const twoFactor = authSchema.table("twoFactor", {
  id: text("id").primaryKey(), userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(), backupCodes: text("backupCodes").notNull(),
  verified: boolean("verified").notNull().default(false),
  failedVerificationCount: integer("failedVerificationCount").notNull().default(0),
  lockedUntil: timestamp("lockedUntil", { withTimezone: true }),
});
export const rateLimit = authSchema.table("rateLimit", {
  id: text("id").primaryKey(), key: text("key").notNull().unique(),
  count: integer("count").notNull(), lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
});
export const identityLink = authSchema.table("identity_link", {
  authUserId: text("auth_user_id").primaryKey().references(() => user.id, { onDelete: "restrict" }),
  businessId: text("business_id").notNull().unique(),
  proofSubject: text("proof_subject").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

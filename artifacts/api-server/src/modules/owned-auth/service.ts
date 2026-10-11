import { createHmac } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { fromNodeHeaders } from "better-auth/node";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { pool } from "@workspace/db";
import type { Request } from "express";
import { HttpError } from "../../lib/errors";
import { ownedAuthentication, authOrigin } from "./config";
import { sendAuthMail } from "./mail";
import * as schema from "./schema";

export const authDatabase = drizzle(pool, { schema });
export function createOwnedAuth(baseURL: string, secret: string, deliver = sendAuthMail) {
  return betterAuth({
    appName: "QXLayer", baseURL, basePath: "/api/auth", secret,
    // Adapter failures can otherwise log credential/query parameters.
    logger: { disabled: true },
    database: drizzleAdapter(authDatabase, { provider: "pg", schema, transaction: true }),
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, autoSignIn: false,
      minPasswordLength: 12, maxPasswordLength: 128, revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 900,
      sendResetPassword: async ({ user, url }) => deliver(user.email, "Reset your QXLayer password", url),
    },
    emailVerification: {
      sendOnSignUp: true, expiresIn: 1800,
      sendVerificationEmail: async ({ user, url }) => deliver(user.email, "Verify your QXLayer email", url),
    },
    user: { deleteUser: { enabled: false }, changeEmail: { enabled: false } },
    account: { accountLinking: { enabled: false } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 3600, freshAge: 600, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 50,
      customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 }, "/send-verification-email": { window: 60, max: 3 } } },
    advanced: { cookiePrefix: "qx_owned", useSecureCookies: baseURL.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: baseURL.startsWith("https:") },
      // No forwarded client-IP headers trusted from arbitrary API callers.
      ipAddress: { ipAddressHeaders: [] } },
    plugins: [twoFactor({ issuer: "QXLayer", skipVerificationOnEnable: false,
      backupCodeOptions: { storeBackupCodes: "encrypted" }, accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 } })],
  });
}
let instance: ReturnType<typeof createOwnedAuth> | undefined;
export function ownedAuthServer() {
  if (!ownedAuthentication()) throw new HttpError(404, "Project-owned authentication is not enabled.");
  if (!instance) {
    const signing = process.env.SESSION_SECRET;
    if (!signing || signing.length < 32) throw new Error("A strong existing server session secret is required.");
    const secret = createHmac("sha256", signing).update("qxlayer-owned-auth/staging/v1").digest("base64");
    instance = createOwnedAuth(authOrigin(), secret);
  }
  return instance;
}
export async function ownedSession(req: Request) {
  const result = await ownedAuthServer().api.getSession({ headers: fromNodeHeaders(req.headers),
    query: { disableCookieCache: true } });
  if (!result?.user.emailVerified) return null;
  return result;
}
export async function ownedBusinessId(id: string) {
  const [link] = await authDatabase.select().from(schema.identityLink).where(eq(schema.identityLink.authUserId, id));
  // New IDs cannot collide with a pre-existing Clerk/business subject.
  return link?.businessId ?? `owned:${id}`;
}
export async function ownedDirectory() {
  const rows = await authDatabase.select({ user: schema.user, link: schema.identityLink })
    .from(schema.user).leftJoin(schema.identityLink, eq(schema.identityLink.authUserId, schema.user.id));
  return rows.map(({ user, link }) => ({ id: link?.businessId ?? `owned:${user.id}`, firstName: user.name,
    lastName: null, primaryEmailAddressId: user.id,
    emailAddresses: [{ id: user.id, emailAddress: user.email }], createdAt: user.createdAt.getTime(), banned: false, locked: false }));
}

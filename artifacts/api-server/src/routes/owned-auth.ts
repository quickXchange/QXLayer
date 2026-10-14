import { Router } from "express";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { sameOriginMutation } from "../middlewares/authentication";
import { HttpError } from "../lib/errors";
import { ownedAuthentication, authOrigin } from "../modules/owned-auth/config";
import { authDatabase, ownedSession } from "../modules/owned-auth/service";
import { mailReady } from "../modules/owned-auth/mail";
import * as schema from "../modules/owned-auth/schema";
import { applicationUserId } from "../../../../lib/external-clerk/index.mjs";
import { developmentSupabaseAuth, supabaseAuthConfiguration } from "../modules/supabase-auth/config";
import { enrollDevelopmentIdentity } from "../modules/supabase-auth/development-enrollment";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";

const router = Router();
router.get("/owned-auth/status", (_req, res) => {
  res.set("Cache-Control", "no-store").json({ enabled: ownedAuthentication(), mailReady: mailReady() });
});
router.use("/auth-migration", (req, res, next) => {
  if (!ownedAuthentication() && !developmentSupabaseAuth()) { res.status(404).json({ error: "Migration is not enabled." }); return; }
  sameOriginMutation(req, res, next);
}, clerkMiddleware((req) => ({ publishableKey: developmentSupabaseAuth()
    ? publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY)
    : process.env.CLERK_PUBLISHABLE_KEY,
   authorizedParties: [developmentSupabaseAuth() ? supabaseAuthConfiguration().origin : authOrigin()] })));

async function legacyProof(req: Parameters<typeof getAuth>[0]) {
  const native = getAuth(req);
  if (!native.userId || !native.sessionId) throw new HttpError(401, "Sign in to your existing account first.");
  const [session, user] = await Promise.all([clerkClient.sessions.getSession(native.sessionId), clerkClient.users.getUser(native.userId)]);
  const created = Number(session.createdAt);
  if (session.status !== "active" || session.userId !== native.userId || !Number.isFinite(created) ||
      created > Date.now() + 60000 || Date.now() - created > 600000)
    throw new HttpError(403, "Sign out of the existing account and sign in again to confirm this migration.");
  const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId && e.verification?.status === "verified");
  const businessId = applicationUserId(native.userId);
  if (!email || !businessId) throw new HttpError(403, "A verified existing account and approved identity binding are required.");
  return { businessId, subject: native.userId, email: email.emailAddress.toLowerCase(),
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "VYNOX LAYER account" };
}
router.post("/auth-migration/enroll", async (req, res) => {
  const { password } = z.object({ password: z.string().min(12).max(128) }).strict().parse(req.body);
  const proof = await legacyProof(req);
  if (developmentSupabaseAuth()) {
    await enrollDevelopmentIdentity(req, res, proof, password);
    res.status(201).json({ enrolled: true });
    return;
  }
  // No role changes, email-only matching, password copy or replacement identity.
  const existing = await authDatabase.select().from(schema.identityLink).where(eq(schema.identityLink.businessId, proof.businessId));
  const emailOwner = await authDatabase.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, proof.email));
  if (existing.length || emailOwner.length) throw new HttpError(409, "This account is already enrolled. Sign in, or link your existing owned account.");
  const id = randomUUID(), passwordHash = await hashPassword(password);
  try {
    await authDatabase.transaction(async tx => {
      await tx.insert(schema.user).values({ id, email: proof.email, name: proof.name, emailVerified: true });
      await tx.insert(schema.account).values({ id: randomUUID(), accountId: id, userId: id, providerId: "credential", password: passwordHash });
      await tx.insert(schema.identityLink).values({ authUserId: id, businessId: proof.businessId, proofSubject: proof.subject });
    });
  } catch { throw new HttpError(409, "Account enrollment could not be completed. No existing permissions were changed."); }
  res.status(201).json({ enrolled: true });
});
router.post("/auth-migration/link", async (req, res) => {
  if (!ownedAuthentication()) throw new HttpError(404, "Use the Supabase existing-account linking flow.");
  const own = await ownedSession(req);
  if (!own || Date.now() - new Date(own.session.createdAt).getTime() > 600000)
    throw new HttpError(401, "Sign in again to your verified owned account first.");
  const proof = await legacyProof(req);
  const rows = await authDatabase.select().from(schema.identityLink).where(or(
    eq(schema.identityLink.authUserId, own.user.id), eq(schema.identityLink.businessId, proof.businessId)));
  if (rows.length) throw new HttpError(409, "This identity is already linked. Existing links cannot be replaced.");
  // A used standalone account must not abandon its own business records.
  const { withDatabase } = await import("@workspace/db");
  const used = await withDatabase({ actorId: `owned:${own.user.id}` }, async c => {
    const r = await c.query(`SELECT EXISTS(SELECT 1 FROM white_label_requests WHERE customer_user_id=$1)
      OR EXISTS(SELECT 1 FROM tenant_memberships WHERE clerk_user_id=$1)
      OR EXISTS(SELECT 1 FROM platform_admins WHERE clerk_user_id=$1) AS used`, [`owned:${own.user.id}`]);
    return r.rows[0].used;
  });
  if (used) throw new HttpError(409, "This account already has business records. An operator-reviewed migration is required.");
  try {
    await authDatabase.transaction(async tx => {
      await tx.insert(schema.identityLink).values({ authUserId: own.user.id, businessId: proof.businessId, proofSubject: proof.subject });
      await tx.delete(schema.session).where(eq(schema.session.userId, own.user.id));
    });
  } catch { throw new HttpError(409, "The identity could not be linked. Existing links were preserved."); }
  res.json({ linked: true, signInAgain: true });
});
export default router;

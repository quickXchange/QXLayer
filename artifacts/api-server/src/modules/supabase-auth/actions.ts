import { createHmac } from "node:crypto";
import { pool, withDatabase } from "@workspace/db";
import { z } from "zod";
import type { Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { applicationUserId } from "../../../../../lib/external-clerk/index.mjs";
import { HttpError } from "../../lib/errors";
import { authRequest, type SupabaseTokens } from "./provider";
import { supabaseAuthConfiguration, supabaseBusinessId, supabaseSessionSecret } from "./config";
import { establishSession, needSession, publicUser, hasVerifiedFactor, reauthenticate, readSession,
  revokeLocalSession, updateSession, type AuthSession } from "./session";

const password = z.string().min(12, "Use at least 12 characters.").max(128);
const email = z.string().email().max(254).transform(v => v.trim().toLowerCase());
const factorId = z.string().uuid();
export const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("signup"), name: z.string().trim().min(1).max(120), email, password }).strict(),
  z.object({ action: z.literal("login"), email, password: z.string().min(1).max(128) }).strict(),
  z.object({ action: z.literal("logout") }).strict(),
  z.object({ action: z.literal("recover"), email }).strict(),
  z.object({ action: z.literal("resend"), email }).strict(),
  z.object({ action: z.literal("verify"), token: z.string().min(1).max(2048), tokenType: z.enum(["signup", "recovery"]) }).strict(),
  z.object({ action: z.literal("reset-password"), password }).strict(),
  z.object({ action: z.literal("change-password"), currentPassword: z.string().min(1).max(128), password }).strict(),
  z.object({ action: z.literal("mfa-enroll"), currentPassword: z.string().min(1).max(128) }).strict(),
  z.object({ action: z.literal("mfa-verify"), code: z.string().regex(/^[0-9]{6}$/), factorId: factorId.optional() }).strict(),
  z.object({ action: z.literal("mfa-remove"), currentPassword: z.string().min(1).max(128), factorId,
    code: z.string().regex(/^[0-9]{6}$/) }).strict(),
  z.object({ action: z.literal("link-existing") }).strict(),
]);
export async function limitAction(req: Request, action: string, account = "") {
  const secret = supabaseSessionSecret();
  const key = createHmac("sha256", secret).update(`${req.socket.remoteAddress}\0${action}\0${account}`).digest("hex");
  const maximum = ["login", "signup", "recover", "resend"].includes(action) ? 5 : 15;
  const result = await pool.query(`INSERT INTO vynox_supabase_auth.rate_limits(key,hits,reset_at)
    VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN vynox_supabase_auth.rate_limits.reset_at<now() THEN 1 ELSE vynox_supabase_auth.rate_limits.hits+1 END,
    reset_at=CASE WHEN vynox_supabase_auth.rate_limits.reset_at<now() THEN now()+interval '1 minute'
      ELSE vynox_supabase_auth.rate_limits.reset_at END RETURNING hits`, [key]);
  if (result.rows[0].hits > maximum) throw new HttpError(429, "Too many attempts. Wait a minute before retrying.");
}
async function totp(s: AuthSession, code: string, requested?: string) {
  const owned = s.user.factors?.find(f => f.factor_type === "totp" &&
    (requested ? f.id === requested : f.status === "verified"));
  if (!owned) throw new HttpError(400, "No matching authenticator is enrolled on this account.");
  const challenge = await authRequest<{ id: string }>(`/factors/${owned.id}/challenge`,
    { method: "POST", accessToken: s.payload.accessToken });
  const tokens = await authRequest<SupabaseTokens>(`/factors/${owned.id}/verify`,
    { method: "POST", accessToken: s.payload.accessToken, body: { challenge_id: challenge.id, code } });
  await updateSession(s, tokens);
  return tokens;
}
async function logoutAll(s: AuthSession, req: Request, res: Response) {
  // Delete app sessions first: provider outages cannot leave an app session usable.
  await pool.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [s.user.id]);
  await revokeLocalSession(req, res);
  await authRequest("/logout?scope=global", { method: "POST", accessToken: s.payload.accessToken });
}
async function linkExisting(req: Request, s: AuthSession) {
  if (Date.now() - s.payload.created > 600000 || (hasVerifiedFactor(s.user) && !s.aal2))
    throw new HttpError(401, "Sign in again and complete MFA before linking.");
  const legacy = getAuth(req);
  if (!legacy.userId || !legacy.sessionId) throw new HttpError(401, "Fresh proof of your existing Clerk account is required.");
  const [session, user] = await Promise.all([clerkClient.sessions.getSession(legacy.sessionId), clerkClient.users.getUser(legacy.userId)]);
  const business = applicationUserId(legacy.userId);
  const created = Number(session.createdAt);
  if (!business || session.status !== "active" || session.userId !== legacy.userId || !Number.isFinite(created) ||
      created > Date.now() + 60000 || Date.now() - created > 600000 ||
      !user.emailAddresses.some(e => e.id === user.primaryEmailAddressId && e.verification?.status === "verified"))
    throw new HttpError(403, "A fresh verified legacy account and approved Staging binding are required.");
  const standalone = supabaseBusinessId(s.user.id);
  const used = await withDatabase({ actorId: standalone }, async c => c.query(`SELECT EXISTS(
    SELECT 1 FROM public.white_label_requests WHERE customer_user_id=$1)
    OR EXISTS(SELECT 1 FROM public.tenant_memberships WHERE clerk_user_id=$1)
    OR EXISTS(SELECT 1 FROM public.platform_admins WHERE clerk_user_id=$1) AS used`, [standalone]));
  if (used.rows[0].used) throw new HttpError(409, "This account already has business records; operator review is required.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [standalone]);
    const existing = await client.query(`SELECT subject FROM vynox_supabase_auth.identity_links
      WHERE subject=$1 OR business_id=$2`, [s.user.id, business]);
    if (existing.rowCount) throw new HttpError(409, "An existing identity link cannot be replaced.");
    await client.query("INSERT INTO vynox_supabase_auth.identity_links(subject,business_id,proof_subject) VALUES($1,$2,$3)",
      [s.user.id, business, legacy.userId]);
    await client.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [s.user.id]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}
export async function performAction(raw: unknown, req: Request, res: Response) {
  const a = input.parse(raw);
  await limitAction(req, a.action, "email" in a ? a.email : "");
  const cfg = supabaseAuthConfiguration();
  if (["signup", "recover", "resend"].includes(a.action) && !cfg.mailReady)
    throw new HttpError(503, "Verification and recovery email delivery is not configured.");
  switch (a.action) {
    case "signup":
      await authRequest("/signup", { method: "POST", body: { email: a.email, password: a.password, data: { name: a.name } } });
      return { ok: true };
    case "login": {
      const tokens = await authRequest<SupabaseTokens>("/token?grant_type=password",
        { method: "POST", body: { email: a.email, password: a.password } });
      if (!tokens.user.email_confirmed_at) throw new HttpError(403, "Verify your email before signing in.");
      await establishSession(req, res, tokens);
      return { ok: true, user: publicUser(tokens.user), mfaRequired: hasVerifiedFactor(tokens.user) };
    }
    case "logout": {
      const s = await readSession(req);
      await revokeLocalSession(req, res);
      if (s) await authRequest("/logout?scope=local", { method: "POST", accessToken: s.payload.accessToken });
      return { ok: true };
    }
    case "recover":
      await authRequest("/recover", { method: "POST", body: { email: a.email } });
      return { ok: true };
    case "resend":
      await authRequest("/resend", { method: "POST", body: { email: a.email, type: "signup" } });
      return { ok: true };
    case "verify": {
      const tokens = await authRequest<SupabaseTokens>("/verify",
        { method: "POST", body: { token_hash: a.token, type: a.tokenType } });
      if (a.tokenType === "recovery") await establishSession(req, res, tokens, true);
      else await authRequest("/logout?scope=local", { method: "POST", accessToken: tokens.access_token });
      return { ok: true };
    }
    case "reset-password": {
      const s = await needSession(req, true);
      if (!s.payload.recovery || Date.now() - s.payload.created > 15 * 60000)
        throw new HttpError(401, "Open a fresh password recovery link.");
      await authRequest("/user", { method: "PUT", accessToken: s.payload.accessToken, body: { password: a.password } });
      await logoutAll(s, req, res);
      return { ok: true };
    }
    case "change-password": {
      const s = await needSession(req);
      if (hasVerifiedFactor(s.user) && !s.aal2) throw new HttpError(403, "Complete MFA before changing your password.");
      await reauthenticate(s, a.currentPassword);
      await authRequest("/user", { method: "PUT", accessToken: s.payload.accessToken, body: { password: a.password } });
      await logoutAll(s, req, res);
      return { ok: true };
    }
    case "mfa-enroll": {
      const s = await needSession(req);
      await reauthenticate(s, a.currentPassword);
      if (hasVerifiedFactor(s.user) && !s.aal2) throw new HttpError(403, "Verify the existing authenticator first.");
      const factor = await authRequest<{ id: string; totp: { qr_code: string; secret: string; uri: string } }>("/factors",
        { method: "POST", accessToken: s.payload.accessToken, body: { factor_type: "totp", friendly_name: "VYNOX LAYER", issuer: "VYNOX LAYER" } });
      return { ok: true, factorId: factor.id, qrCode: factor.totp.qr_code, secret: factor.totp.secret, totpUri: factor.totp.uri };
    }
    case "mfa-verify": {
      const s = await needSession(req);
      await totp(s, a.code, a.factorId);
      return { ok: true };
    }
    case "mfa-remove": {
      const s = await needSession(req);
      if (!s.aal2) throw new HttpError(403, "Complete MFA before removing the authenticator.");
      await reauthenticate(s, a.currentPassword);
      await totp(s, a.code, a.factorId);
      await authRequest(`/factors/${a.factorId}`, { method: "DELETE", accessToken: s.payload.accessToken });
      await logoutAll(s, req, res);
      return { ok: true };
    }
    case "link-existing": {
      const s = await needSession(req);
      await linkExisting(req, s);
      await revokeLocalSession(req, res);
      return { ok: true, linked: true };
    }
  }
}

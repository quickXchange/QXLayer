import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { authSupportPool as pool } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { developmentSupabaseAuth, supabaseAuthConfiguration } from "./config";
import { authRequest, type SupabaseUser } from "./provider";
import { clearSessionCookie, hasVerifiedFactor, reauthenticate, type AuthSession } from "./session";

export function requireDevelopmentRecovery() {
  if (!developmentSupabaseAuth()) throw new HttpError(404, "Development recovery is not enabled.");
  // Also validates the runtime, origin, isolated project and independent server credentials.
  supabaseAuthConfiguration();
}
export function factorFingerprint(user: SupabaseUser) {
  return createHash("sha256").update(
    (user.factors ?? []).filter(f => f.status === "verified").map(f => f.id).sort().join("\0")
  ).digest("hex");
}
export function recoveryDigest(subject: string, code: string) {
  const normalized = code.replace(/[\s-]/g, "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalized)) throw new HttpError(400, "Use a complete unused recovery code.");
  return createHash("sha256").update(`${subject}\0${normalized}`).digest("hex");
}
export function newRecoveryCodes() {
  return Array.from({ length: 10 }, () => randomBytes(16).toString("hex").match(/.{8}/g)!.join("-"));
}
export async function recoveryCodeCount(s: AuthSession) {
  requireDevelopmentRecovery();
  if (!s.aal2 || s.payload.recovery || !hasVerifiedFactor(s.user)) return 0;
  const r = await pool.query(`SELECT count(*)::int AS count FROM vynox_supabase_auth.recovery_codes
    WHERE subject=$1 AND used_at IS NULL AND factor_fingerprint=$2`, [s.user.id, factorFingerprint(s.user)]);
  return r.rows[0].count as number;
}
/** Called only after password reauthentication AND fresh TOTP verification. */
export async function generateRecoveryCodes(s: AuthSession) {
  requireDevelopmentRecovery();
  if (!s.aal2 || s.payload.recovery || !hasVerifiedFactor(s.user))
    throw new HttpError(403, "Verified two-factor authentication is required.");
  const codes = newRecoveryCodes();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`dev-mfa-recovery:${s.user.id}`]);
    await c.query("DELETE FROM vynox_supabase_auth.recovery_codes WHERE subject=$1", [s.user.id]);
    for (const code of codes) await c.query(`INSERT INTO vynox_supabase_auth.recovery_codes
      (subject,digest,factor_fingerprint) VALUES($1,$2,$3)`,
    [s.user.id, recoveryDigest(s.user.id, code), factorFingerprint(s.user)]);
    await c.query(`INSERT INTO vynox_supabase_auth.recovery_events(id,subject,operation,outcome)
      VALUES($1,$2,'generate','complete')`, [randomUUID(), s.user.id]);
    await c.query("COMMIT");
    return codes;
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); }
}
export async function recoverAuthenticator(s: AuthSession, password: string, code: string, _req: Request, res: Response) {
  requireDevelopmentRecovery();
  if (s.payload.recovery || !hasVerifiedFactor(s.user))
    throw new HttpError(403, "Sign in with your password to recover an existing authenticator.");
  if (s.user.factors?.some(f => f.status === "verified" && f.factor_type !== "totp"))
    throw new HttpError(409, "Other factor types require a separate recovery review.");
  const digest = recoveryDigest(s.user.id, code);
  await reauthenticate(s, password);
  const event = randomUUID();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`dev-mfa-recovery:${s.user.id}`]);
    const consumed = await c.query(`UPDATE vynox_supabase_auth.recovery_codes SET used_at=now()
      WHERE subject=$1 AND digest=$2 AND used_at IS NULL AND factor_fingerprint=$3 RETURNING subject`,
    [s.user.id, digest, factorFingerprint(s.user)]);
    if (consumed.rowCount !== 1) throw new HttpError(403, "Recovery code is invalid, already used, or belongs to an earlier authenticator.");
    await c.query("DELETE FROM vynox_supabase_auth.sessions WHERE subject=$1", [s.user.id]);
    await c.query(`INSERT INTO vynox_supabase_auth.recovery_events(id,subject,operation,outcome)
      VALUES($1,$2,'recover','consumed')`, [event, s.user.id]);
    // Consume once and revoke every local session BEFORE destructive provider operations.
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); }
  clearSessionCookie(res);
  try {
    await authRequest("/logout?scope=global", { method: "POST", accessToken: s.payload.accessToken });
    const cfg = supabaseAuthConfiguration();
    for (const factor of s.user.factors!.filter(f => f.status === "verified" && f.factor_type === "totp")) {
      if (!/^[a-f0-9-]{36}$/i.test(s.user.id) || !/^[a-f0-9-]{36}$/i.test(factor.id))
        throw new Error("Invalid provider identity");
      const r = await fetch(`${cfg.providerOrigin}/auth/v1/admin/users/${s.user.id}/factors/${factor.id}`, {
        method: "DELETE", headers: { apikey: cfg.apiKey }, redirect: "error", signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error("Provider recovery failed");
    }
    await pool.query("DELETE FROM vynox_supabase_auth.recovery_codes WHERE subject=$1", [s.user.id]);
    await pool.query("UPDATE vynox_supabase_auth.recovery_events SET outcome='complete' WHERE id=$1", [event]);
  } catch {
    await pool.query("UPDATE vynox_supabase_auth.recovery_events SET outcome='failed' WHERE id=$1", [event]);
    throw new HttpError(503, "Recovery could not be confirmed. Sessions were revoked and this code was consumed. Sign in again and check Account Security before retrying with another unused code.");
  }
}

import { authSupportPool as pool } from "@workspace/db";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/errors";
import { developmentSupabaseAuth, supabaseAuthConfiguration } from "./config";
import { authRequest, type SupabaseTokens } from "./provider";
import { clearSessionCookie, readSession } from "./session";
import { limitAction } from "./actions";

/** Development only: a fresh, verified native Clerk proof transfers identity, not roles. */
export async function enrollDevelopmentIdentity(req: Request, res: Response,
  proof: { businessId: string; subject: string; email: string; name: string }, password: string) {
  if (!developmentSupabaseAuth()) throw new HttpError(404, "Development migration is not enabled.");
  const cfg = supabaseAuthConfiguration();
  await limitAction(req, "enroll-existing");
  if (await readSession(req)) throw new HttpError(409, "You already have a new sign-in. Use Link Existing Account instead.");
  const client = await pool.connect();
  let subject: string | undefined;
  let committed = false;
  let committing = false;
  const admin = async (path: string, method: "POST" | "DELETE", body?: unknown) => {
    // Never accept an origin, provider subject or email from the caller.
    return fetch(`${cfg.providerOrigin}/auth/v1/admin/users${path}`, {
      method, redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [proof.businessId]);
    const owner = await client.query(
      "SELECT clerk_user_id FROM public.platform_admins WHERE clerk_user_id=$1 AND active=true FOR SHARE",
      [proof.businessId]);
    if (owner.rowCount !== 1)
      throw new HttpError(403, "The proven existing account does not own the existing Development Super Admin record. No account or permissions were changed.");
    const links = await client.query("SELECT subject FROM vynox_supabase_auth.identity_links WHERE business_id=$1", [proof.businessId]);
    if (links.rowCount) throw new HttpError(409, "This identity is already linked. Existing links cannot be replaced.");
    const result = await admin("", "POST", {
      email: proof.email, password, email_confirm: true,
      user_metadata: { name: proof.name },
      app_metadata: { enrollment: "development-native-clerk-proof" },
    });
    if (!result.ok) throw new HttpError(result.status === 422 ? 409 : 503,
      "Could not create the new sign-in. If you already registered, use Link Existing Account. Existing access is unchanged.");
    const user = await result.json() as { id?: string };
    if (!user.id || !/^[a-f0-9-]{36}$/i.test(user.id)) throw new HttpError(503, "Incomplete identity response. Operator review is required before retrying.");
    subject = user.id;
    // Verify the chosen password against the actual provider before linking.
    const tokens = await authRequest<SupabaseTokens>("/token?grant_type=password",
      { method: "POST", body: { email: proof.email, password } });
    if (tokens.user.id !== subject || !tokens.user.email_confirmed_at)
      throw new HttpError(403, "The new identity could not be verified.");
    await authRequest("/logout?scope=local", { method: "POST", accessToken: tokens.access_token });
    await client.query("INSERT INTO vynox_supabase_auth.identity_links(subject,business_id,proof_subject) VALUES($1,$2,$3)",
      [subject, proof.businessId, proof.subject]);
    committing = true;
    await client.query("COMMIT");
    committed = true;
    clearSessionCookie(res);
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* a disconnected transaction may need operator review */ }
    if (committing && !committed)
      throw new HttpError(503, "Enrollment commit could not be confirmed. Operator review is required before retrying; no existing permissions were changed.");
    if (subject && !committed) {
      // Only the exact identity created by this call; never delete an existing account.
      try {
        const removed = await admin(`/${subject}`, "DELETE");
        if (!removed.ok) throw new Error("cleanup");
      } catch {
        throw new HttpError(503, "Enrollment was not linked, but provider cleanup needs operator review before retrying. Existing permissions are unchanged.");
      }
    }
    throw error;
  } finally { client.release(); }
}

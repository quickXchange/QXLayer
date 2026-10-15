import { createHmac } from "node:crypto";
import { pool } from "@workspace/db";
import { HttpError } from "../../lib/errors";
import { supabaseEmailLoginEnabled, supabaseAuthConfiguration, supabaseSessionSecret } from "./config";

export function privateAuthKey(purpose: string, identifier: string) {
  return createHmac("sha256", supabaseSessionSecret()).update(`development-auth/${purpose}\0${identifier}`).digest("hex");
}
/** Account limits are independent of IP/session, so new browsers cannot reset them. */
export async function developmentLimit(purpose: string, identifier: string, seconds: number, maximum: number) {
  if (!supabaseEmailLoginEnabled()) throw new HttpError(404, "Email authentication method unavailable.");
  supabaseAuthConfiguration();
  const r = await pool.query(`INSERT INTO vynox_supabase_auth.rate_limits(key,hits,reset_at)
    VALUES($1,1,now()+make_interval(secs=>$2)) ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN vynox_supabase_auth.rate_limits.reset_at<=now() THEN 1 ELSE vynox_supabase_auth.rate_limits.hits+1 END,
    reset_at=CASE WHEN vynox_supabase_auth.rate_limits.reset_at<=now() THEN now()+make_interval(secs=>$2)
      ELSE vynox_supabase_auth.rate_limits.reset_at END
    RETURNING hits,GREATEST(1,ceil(extract(epoch FROM(reset_at-now()))))::int AS retry_after`,
    [privateAuthKey(purpose, identifier), seconds]);
  if (r.rows[0].hits > maximum) {
    const wait = Number(r.rows[0].retry_after) || seconds;
    throw new HttpError(429, `Please wait ${wait} seconds before trying again.`, wait);
  }
}
/** Native magic-link OTP and recovery share a mailbox cooldown, not independent limits. */
export async function developmentMailCooldown(email: string) {
  try { await developmentLimit("mailbox-send-minute", email, 60, 1); }
  catch (e) {
    if (e instanceof HttpError && e.status === 429) {
      const wait = e.retryAfterSeconds ?? 60;
      throw new HttpError(429, `For security, wait ${wait} seconds between email requests for this address.`, wait);
    }
    throw e;
  }
}

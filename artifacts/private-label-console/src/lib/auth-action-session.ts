import type { SupabaseActionInput, SupabaseSession } from "@workspace/api-client-react";

/** HTTP success is not proof that this browser retained the new authentication session. */
export function authActionSessionError(input: SupabaseActionInput, session: SupabaseSession): string | null {
  if (input.action === "login" || input.action === "login-email-verify") {
    if (!session.user || session.recovery ||
        session.user.email.toLowerCase() !== input.email?.trim().toLowerCase())
      return "The sign-in session was not retained in this browser. Open Development in one browser tab and sign in again. Allow its secure cookies.";
    if (input.action === "login-email-verify" && !session.mfaRequired)
      return "The required authenticator step could not be confirmed. Sign in again.";
  }
  if (input.action === "mfa-verify" || input.action === "mfa-email-verify") {
    if (!session.user)
      return "Your pending sign-in session is no longer available. Sign in again before entering a new code.";
    if (session.mfaRequired || (input.action === "mfa-email-verify" && session.recovery))
      return "Verification could not be confirmed for this browser session. Sign in again before continuing.";
  }
  return null;
}

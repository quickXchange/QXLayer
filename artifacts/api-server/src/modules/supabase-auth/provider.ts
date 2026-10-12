import { supabaseAuthConfiguration } from "./config";
import { HttpError } from "../../lib/errors";

export interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: { name?: string };
  factors?: { id: string; factor_type: string; status: string }[];
}
export interface SupabaseTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUser;
}

/** No Replit/Clerk calls, browser service-role keys, or caller-selected provider URLs. */
export async function authRequest<T>(path: string, options: {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  accessToken?: string;
} = {}, transport: typeof fetch = fetch): Promise<T> {
  const cfg = supabaseAuthConfiguration();
  if (!/^\/(?:(?:token|signup|recover|resend|verify|user|logout)(?:\?[a-zA-Z0-9_=&-]+)?|factors(?:\/[a-f0-9-]+(?:\/(?:challenge|verify))?)?)$/.test(path))
    throw new Error("Unsupported Supabase authentication endpoint.");
  let response: Response;
  try {
    response = await transport(`${cfg.providerOrigin}/auth/v1${path}`, {
      method: options.method ?? "GET",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        apikey: cfg.apiKey,
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        "Content-Type": "application/json",
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new HttpError(503, "Authentication provider is temporarily unavailable.");
  }
  if (!response.ok) {
    // Provider errors can echo private inputs. Never log them or forward raw bodies.
    const error = await response.json().catch(() => ({})) as { error_code?: string };
    const code = error.error_code;
    if (response.status === 429) throw new HttpError(429, "Too many attempts. Wait before trying again.");
    if (code === "email_not_confirmed") throw new HttpError(403, "EMAIL_NOT_VERIFIED: Verify your email before signing in.");
    if (code === "invalid_credentials") throw new HttpError(401, "Email or password is incorrect.");
    if (code === "otp_expired" || code === "flow_state_expired")
      throw new HttpError(400, "This confirmation link has expired. Request another.");
    if (code === "mfa_verification_failed") throw new HttpError(400, "The authenticator code is invalid.");
    throw new HttpError(response.status >= 500 ? 503 : 400, "Authentication request could not be completed.");
  }
  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

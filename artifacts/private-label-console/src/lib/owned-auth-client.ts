import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { supabaseFacade } from "@/lib/supabase-auth-client";

const provider = import.meta.env.VITE_QXLAYER_AUTH_PROVIDER;
const environment = import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT;
if (provider === "supabase" && environment !== "staging") {
  throw new Error("Supabase authentication is approved for Staging only, never Production.");
}
/** True only for the Supabase Staging provider. */
export const supabaseAuth = provider === "supabase" && environment === "staging";
/** Better Auth only. */
export const betterAuthOwned = provider === "owned";
/** Custom (non-Clerk) auth screens: Better Auth or Supabase. */
export const ownedAuth = betterAuthOwned || supabaseAuth;
if (betterAuthOwned && environment === "production") {
  throw new Error("Project-owned authentication is not approved for Production.");
}
const betterAuthClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/auth`,
  plugins: [twoFactorClient()],
});
/** Same call shape either way; Supabase mode implements only the methods the auth screens use. */
export const authClient = (supabaseAuth ? supabaseFacade : betterAuthClient) as unknown as typeof betterAuthClient;

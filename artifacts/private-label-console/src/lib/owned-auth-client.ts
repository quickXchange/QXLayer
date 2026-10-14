import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { supabaseFacade } from "@/lib/supabase-auth-client";

const provider = import.meta.env.VITE_QXLAYER_AUTH_PROVIDER;
const environment = import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT;
export const supabaseDevelopmentAuth = provider === "supabase" && environment === "development";
if (supabaseDevelopmentAuth && (!import.meta.env.DEV ||
    import.meta.env.VITE_QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF !== "nktstksmfpcsjnjbeqsk" ||
    !/^https:\/\/[a-z0-9.-]+\.replit\.dev$/.test(import.meta.env.VITE_QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL ?? ""))) {
  throw new Error("Development Supabase authentication requires its pinned project and exact Development preview origin.");
}
// Public rendering also works through the internal preview proxy. The server,
// not the rendering host, enforces the exact approved origin for auth mutations.
if (provider === "supabase" && environment !== "staging" && !supabaseDevelopmentAuth) {
  throw new Error("Supabase authentication is approved only for isolated Development and Staging, never Production.");
}
/** Explicitly isolated Supabase provider; Production remains prohibited. */
export const supabaseAuth = provider === "supabase" && (environment === "staging" || supabaseDevelopmentAuth);
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

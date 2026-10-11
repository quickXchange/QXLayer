import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const ownedAuth = import.meta.env.VITE_QXLAYER_AUTH_PROVIDER === "owned";
if (ownedAuth && import.meta.env.VITE_QXLAYER_EXTERNAL_ENVIRONMENT === "production") {
  throw new Error("Project-owned authentication is not approved for Production.");
}
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/auth`,
  plugins: [twoFactorClient()],
});

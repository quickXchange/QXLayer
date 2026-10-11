export function ownedAuthentication(env = process.env): boolean {
  if (env.QXLAYER_AUTH_PROVIDER !== "owned") return false;
  if (env.QXLAYER_EXTERNAL_ENVIRONMENT === "production" ||
      (env.QXLAYER_DATABASE_PROVIDER === "supabase" && env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging") ||
      (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" && !["development", "test"].includes(env.NODE_ENV ?? ""))) {
    throw new Error("Project-owned authentication is approved only for Development and Staging.");
  }
  return true;
}
export function authOrigin(env = process.env): string {
  // Development has an approved public marketing URL in shared configuration;
  // it must not override this isolated authentication origin.
  const value = env.QXLAYER_AUTH_URL ?? env.QXLAYER_PLATFORM_URL;
  if (!value) throw new Error("An explicit project-owned authentication origin is required.");
  const u = new URL(value);
  if (u.username || u.password || u.pathname !== "/" || u.search || u.hash ||
      (u.protocol !== "https:" && !(env.NODE_ENV === "test" && ["localhost", "127.0.0.1"].includes(u.hostname)))) {
    throw new Error("Invalid project-owned authentication origin.");
  }
  return u.origin;
}

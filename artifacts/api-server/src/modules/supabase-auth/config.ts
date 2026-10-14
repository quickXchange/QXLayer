// Explicitly scoped providers only; never activate authentication from storage settings.
// Never infer Supabase Auth from the database/storage provider.
export const STAGING_AUTH_PROJECT = "muvedavhbpgpdrrnjrih";
export const DEVELOPMENT_AUTH_PROJECT = "nktstksmfpcsjnjbeqsk";

export function developmentSupabaseAuth(env = process.env): boolean {
  return env.QXLAYER_EXTERNAL_ENVIRONMENT === "development" &&
    (env.QXLAYER_AUTH_PROVIDER === "supabase" || env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_TRIAL_ENABLED === "true");
}

export function supabaseAuthEnabled(env = process.env): boolean {
  const enabled = env.QXLAYER_AUTH_PROVIDER === "supabase" ||
    env.QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED === "true" ||
    env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_TRIAL_ENABLED === "true";
  if (!enabled) return false;
  if (developmentSupabaseAuth(env)) {
    if (!["development", "test"].includes(env.NODE_ENV ?? "") ||
        !["", "replit"].includes(env.QXLAYER_DATABASE_PROVIDER ?? "") ||
        !env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev"))
      throw new Error("Development Supabase Auth requires the Replit Development runtime and existing local business database.");
    return true;
  }
  if (env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_TRIAL_ENABLED === "true")
    throw new Error("Development authentication cannot be enabled outside Development.");
  if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging")
    throw new Error("Supabase authentication trials are Staging-only; Production cutover is not approved.");
  return true;
}

export function supabaseAuthConfiguration(env = process.env) {
  if (!supabaseAuthEnabled(env)) throw new Error("Supabase authentication trial is not enabled.");
  if (developmentSupabaseAuth(env)) {
    const origin = new URL(env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL ?? "");
    if (origin.origin !== `https://${env.REPLIT_DEV_DOMAIN}` || origin.pathname !== "/" ||
        origin.username || origin.password || origin.search || origin.hash)
      throw new Error("Development authentication requires the exact Replit Development HTTPS origin.");
    if (env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF !== DEVELOPMENT_AUTH_PROJECT)
      throw new Error("Development authentication must use its isolated pinned project, never Staging.");
    const apiKey = env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SERVER_KEY;
    if (!apiKey?.startsWith("sb_secret_"))
      throw new Error("Development authentication requires its server-only secret key, not a publishable or Staging key.");
    supabaseSessionSecret(env);
    return { origin: origin.origin, providerOrigin: `https://${DEVELOPMENT_AUTH_PROJECT}.supabase.co`,
      apiKey, mailReady: env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_MAIL_READY === "true" };
  }
  const url = new URL(env.QXLAYER_SUPABASE_AUTH_URL ?? "");
  if (url.protocol !== "https:" || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash)
    throw new Error("An exact HTTPS Staging authentication origin is required.");
  const project = env.QXLAYER_SUPABASE_AUTH_PROJECT_REF;
  if (project !== STAGING_AUTH_PROJECT)
    throw new Error("Supabase authentication must use the pinned Staging project.");
  const apiKey = env.QXLAYER_SUPABASE_AUTH_SERVER_KEY;
  if (!apiKey) throw new Error("A server-only Staging Supabase Auth key is required.");
  return {
    origin: url.origin,
    providerOrigin: `https://${project}.supabase.co`,
    apiKey,
    mailReady: env.QXLAYER_SUPABASE_AUTH_MAIL_READY === "true",
  };
}

export function supabaseSessionSecret(env = process.env): string {
  const development = developmentSupabaseAuth(env);
  const key = development ? env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SESSION_SECRET : env.QXLAYER_SUPABASE_AUTH_SESSION_SECRET;
  if (!key || (development && (key.length < 32 || key === env.QXLAYER_SUPABASE_AUTH_SESSION_SECRET || key === env.SESSION_SECRET)))
    throw new Error("Independent environment-scoped Supabase session encryption is required.");
  return key;
}

/** Parallel Staging trial cookies never replace the default Clerk provider. */
export function supabaseDefaultProvider(env = process.env) {
  return env.QXLAYER_AUTH_PROVIDER === "supabase" && supabaseAuthEnabled(env);
}

export function supabaseBusinessId(subject: string): string {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(subject))
    throw new Error("Invalid Supabase identity.");
  // Existing identities must be linked with explicit proof, never email matching.
  // This namespace cannot collide with existing Clerk or Better Auth business IDs.
  return `supabase:${subject.toLowerCase()}`;
}

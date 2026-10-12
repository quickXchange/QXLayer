// This provider remains dormant until an explicitly scoped Staging trial is enabled.
// Never infer Supabase Auth from the database/storage provider.
export const STAGING_AUTH_PROJECT = "muvedavhbpgpdrrnjrih";

export function supabaseAuthEnabled(env = process.env): boolean {
  const enabled = env.QXLAYER_AUTH_PROVIDER === "supabase" ||
    env.QXLAYER_SUPABASE_AUTH_TRIAL_ENABLED === "true";
  if (!enabled) return false;
  if (env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging")
    throw new Error("Supabase authentication trials are Staging-only; Production cutover is not approved.");
  return true;
}

export function supabaseAuthConfiguration(env = process.env) {
  if (!supabaseAuthEnabled(env)) throw new Error("Supabase authentication trial is not enabled.");
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

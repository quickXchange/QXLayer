/** External startup is opt-in; neither Replit runtime nor Production is switched. */
export function assertExternalEnvironment(env = process.env) {
  if (env.QXLAYER_DATABASE_PROVIDER !== "supabase") return;
  if (env.QXLAYER_EXTERNAL_STARTUP_APPROVED !== "true")
    throw new Error("External startup is disabled until the isolated target is approved.");
  for (const key of ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_AUTHORIZED_PARTIES",
    "CLERK_PROXY_PUBLIC_URL", "SESSION_SECRET", "PRODUCTION_ACCESS_CODE", "QXLAYER_PLATFORM_URL",
    "SUPABASE_STORAGE_URL", "SUPABASE_STORAGE_BUCKET", "SUPABASE_STORAGE_SERVICE_KEY"])
    if (!env[key]) throw new Error(`External configuration missing: ${key}.`);
  if (env.QXLAYER_STORAGE_PROVIDER !== "supabase" || env.QXLAYER_HEALTH_MONITOR_MODE !== "disabled" ||
      env.PRODUCTION_ACCESS_GATE_ENABLED !== "true")
    throw new Error("External API requires private storage, an enabled access gate and a separate worker.");
  const parties = env.CLERK_AUTHORIZED_PARTIES!.split(",").map(s => s.trim());
  const platform = new URL(env.QXLAYER_PLATFORM_URL!);
  let db: URL;
  try { db = new URL(env.DATABASE_URL!); }
  catch { throw new Error("Invalid external database configuration; credentials are not logged."); }
  const ref = db.hostname.startsWith("db.") ? db.hostname.split(".")[1] : decodeURIComponent(db.username).split(".")[1];
  if (!ref || env.SUPABASE_STORAGE_URL !== `https://${ref}.supabase.co`)
    throw new Error("Private storage must use the same pinned Supabase project as the database.");
  if (platform.protocol !== "https:" || parties.some(p => new URL(p).origin !== p || !p.startsWith("https://")) ||
      !parties.includes(platform.origin) ||
      env.CLERK_PROXY_PUBLIC_URL !== `${platform.origin}/api/__clerk`)
    throw new Error("External authentication origins must match the approved platform and fixed Clerk proxy.");
  if (env.NODE_ENV === "production" &&
      (!env.CLERK_PUBLISHABLE_KEY!.startsWith("pk_live_") || !env.CLERK_SECRET_KEY!.startsWith("sk_live_")))
    throw new Error("Production external hosting requires the retained Production Clerk instance.");
}

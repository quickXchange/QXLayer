import { createStaticHandler } from "./lib/production-access-gate/static-handler.mjs";
import { fileURLToPath } from "node:url";

/** Only the approved, database-disconnected Preview bootstrap uses this entrypoint. */
export function bootstrapEnvironment(env) {
  if (env.QXLAYER_PREVIEW_BOOTSTRAP !== "true" ||
      env.QXLAYER_EXTERNAL_ENVIRONMENT !== "staging" || env.VERCEL_ENV !== "preview" ||
      !/^qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL ?? "") ||
      !env.VITE_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ||
      !env.PRODUCTION_ACCESS_CODE || env.PRODUCTION_ACCESS_GATE_ENABLED !== "true" ||
      ["DATABASE_URL", "MIGRATION_DATABASE_URL", "CLERK_SECRET_KEY",
        "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_SERVICE_KEY"].some(key => env[key]))
    throw new Error("Isolated, gated Development-key Preview bootstrap configuration is required.");
  return {
    ...env,
    QXLAYER_PLATFORM_URL: `https://${env.VERCEL_URL}`,
    // This selects the gate's fixed-origin CSRF check, not a database connection.
    QXLAYER_DATABASE_PROVIDER: "supabase",
  };
}

let serve;
export default async function handler(req, res) {
  serve ??= createStaticHandler(
    fileURLToPath(new URL("./static/", import.meta.url)),
    bootstrapEnvironment(process.env),
  );
  if (/^\/api(?:\/|\?|$)/.test(req.url ?? "")) {
    res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ error: "API is disabled in this Preview-only bootstrap." }));
    return;
  }
  return serve(req, res);
}

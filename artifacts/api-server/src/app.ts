import express, { type Express, type ErrorRequestHandler } from "express";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { ZodError } from "zod";
import router from "./routes";
import { logger } from "./lib/logger";
import { HttpError } from "./lib/errors";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { createAccessGate } from "../../../lib/production-access-gate/index.mjs";
import { toNodeHandler } from "better-auth/node";
import { ownedAuthentication } from "./modules/owned-auth/config";
import { ownedAuthServer } from "./modules/owned-auth/service";
import { mailReady } from "./modules/owned-auth/mail";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0]?.replace(
            /^(\/api\/auth\/reset-password\/)[^/]+$/, "$1[redacted]",
          ),
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.disable("x-powered-by");
// Before body parsing, Clerk, proxying and application routes.
app.use(createAccessGate({ basePath: "/api", healthPath: "/api/healthz",
  deliveredSite: async slug => (await import("./modules/website/service")).deliveredPublicSite(slug) }));
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
if (ownedAuthentication()) {
  // Better Auth must receive the untouched stream before Express body parsing.
  app.all("/api/auth/*splat", (req, res) => {
    if (!mailReady() && ["/api/auth/sign-up/email", "/api/auth/request-password-reset",
      "/api/auth/send-verification-email"].includes(req.path.replace(/\/+$/, ""))) {
      res.status(503).json({ code: "MAIL_UNAVAILABLE", message: "Verification and recovery require a configured mail sender." });
      return;
    }
    return toNodeHandler(ownedAuthServer())(req, res);
  });
}
app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: true, limit: "128kb" }));
if (!ownedAuthentication()) app.use(clerkMiddleware((req) => ({
  publishableKey: process.env.QXLAYER_DATABASE_PROVIDER === "supabase"
    ? process.env.CLERK_PUBLISHABLE_KEY
    : publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
  ...(process.env.QXLAYER_DATABASE_PROVIDER === "supabase" ? {
    authorizedParties: (process.env.CLERK_AUTHORIZED_PARTIES ?? "").split(",").map(s => s.trim()).filter(Boolean),
  } : {}),
})));

app.use("/api", router);
const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (req.path === "/api/diagnostics/website-errors" && error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid safe diagnostic." }); return;
  }
  if (error?.type === "entity.too.large") { res.status(413).json({ error: "The upload or request exceeds its allowed size limit." }); return; }
  // The generated API validators and application validators can resolve distinct
  // Zod packages. Keep valid client mistakes at 400 rather than logging a 500.
  if (error instanceof ZodError || (error?.name === "ZodError" && Array.isArray(error.issues))) {
    res.status(400).json({ error: "Invalid input.", details: error.issues.map((i: { path: unknown; message: string }) => ({ path: i.path, message: i.message })) }); return;
  }
  if (error instanceof HttpError) {
    const authCode = req.path.startsWith("/api/supabase-auth") ? error.message.match(/^([A-Z_]+):/)?.[1] : undefined;
    res.status(error.status).json({ error: error.message, ...(authCode ? { code: authCode } : {}) }); return;
  }
  if (req.path.startsWith("/api/supabase-auth")) {
    // Auth SQL/network errors must never expose token envelopes or credential parameters.
    req.log.error({ code: typeof error?.code === "string" ? error.code : "AUTH_UNAVAILABLE" }, "Staging authentication unavailable");
    res.status(503).json({ error: "Authentication is temporarily unavailable." }); return;
  }
  const code = (error as { code?: string }).code;
  if (code === "23505") { res.status(409).json({ error: "This slug, domain, or unique configuration is already in use." }); return; }
  if (code === "23503") { res.status(400).json({ error: "Configuration references an unavailable catalog entry or a dependent record." }); return; }
  req.log.error({ err: error }, "Request failed");
  res.status(500).json({ error: "The operation could not be completed." });
};
app.use(errorHandler);

export default app;

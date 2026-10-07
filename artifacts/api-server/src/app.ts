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

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
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
app.use(createAccessGate({ basePath: "/api", healthPath: "/api/healthz" }));
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: true, limit: "128kb" }));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
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
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
  const code = (error as { code?: string }).code;
  if (code === "23505") { res.status(409).json({ error: "This slug, domain, or unique configuration is already in use." }); return; }
  if (code === "23503") { res.status(400).json({ error: "Configuration references an unavailable catalog entry or a dependent record." }); return; }
  req.log.error({ err: error }, "Request failed");
  res.status(500).json({ error: "The operation could not be completed." });
};
app.use(errorHandler);

export default app;

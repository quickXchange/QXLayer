import { Router } from "express";
import { sameOriginMutation } from "../middlewares/authentication";
import { logger } from "../lib/logger";
import { diagnosticLimiter, parseWebsiteDiagnostic } from "../modules/website/error-diagnostics";

const router = Router();
const accept = diagnosticLimiter();
router.post("/diagnostics/website-errors", sameOriginMutation, (req, res) => {
  if (!accept(req.ip ?? "unknown")) { res.status(429).json({ error: "Diagnostic rate limit reached." }); return; }
  const diagnostic = parseWebsiteDiagnostic(req.body);
  if (!diagnostic) { res.status(400).json({ error: "Invalid safe diagnostic." }); return; }
  // Explicit projection only. No body/request/error object, IP, URL, identity or stack.
  logger.warn({ event: "shared_website_error", component: "shared-site-boundary",
    errorId: diagnostic.errorId, category: diagnostic.category, buildId: diagnostic.buildId },
    "Shared customer website render failure");
  res.status(204).end();
});
export default router;

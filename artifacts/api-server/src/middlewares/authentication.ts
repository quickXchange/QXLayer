import { getAuth } from "@clerk/express";
import type { RequestHandler, Response } from "express";
import { resolvePrincipal, type Principal } from "../modules/authentication/service";
import { demoPrincipal, assertDemoRequest } from "../modules/demo/session";

export const requireAuthentication: RequestHandler = async (req, res, next): Promise<void> => {
  const demo = await demoPrincipal(req);
  if (demo) {
    assertDemoRequest(demo, req);
    res.locals.principal = demo;
    next();
    return;
  }
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  res.locals.principal = await resolvePrincipal(userId);
  next();
};

export function principalFrom(res: Response): Principal {
  return res.locals.principal as Principal;
}

// Cookie-authenticated mutations must originate from this app. No wildcard credentialed CORS.
export const sameOriginMutation: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  const canonicalHost = process.env.QXLAYER_DATABASE_PROVIDER === "supabase"
    ? new URL(process.env.QXLAYER_PLATFORM_URL!).host
    : req.get("x-forwarded-host")?.split(",")[0]?.trim() ?? req.get("host");
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite === "cross-site") { res.status(403).json({ error: "Cross-site mutation denied." }); return; }
  try {
    if (!origin || new URL(origin).host !== canonicalHost) {
      res.status(403).json({ error: "Same-origin request required." });
      return;
    }
  } catch {
    res.status(403).json({ error: "Invalid request origin." });
    return;
  }
  next();
};
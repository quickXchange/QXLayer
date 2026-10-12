import { getAuth } from "@clerk/express";
import type { RequestHandler, Response } from "express";
import { resolvePrincipal, type Principal } from "../modules/authentication/service";
import { demoPrincipal, assertDemoRequest } from "../modules/demo/session";
import { applicationUserId } from "../../../../lib/external-clerk/index.mjs";
import { ownedAuthentication, authOrigin } from "../modules/owned-auth/config";
import { ownedSession, ownedBusinessId } from "../modules/owned-auth/service";
import { HttpError } from "../lib/errors";
import { supabaseAuthEnabled, supabaseDefaultProvider, supabaseAuthConfiguration } from "../modules/supabase-auth/config";
import { sessionCookie, readSession, businessId, hasVerifiedFactor, assertAuthOrigin } from "../modules/supabase-auth/session";

export const requireAuthentication: RequestHandler = async (req, res, next): Promise<void> => {
  const demo = await demoPrincipal(req);
  if (demo) {
    assertDemoRequest(demo, req);
    res.locals.principal = demo;
    next();
    return;
  }
  if (ownedAuthentication()) {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      let allowed = false;
      sameOriginMutation(req, res, () => { allowed = true; });
      if (!allowed) return;
    }
    const own = await ownedSession(req);
    if (!own) { res.status(401).json({ error: "Sign-in required." }); return; }
    const principal = await resolvePrincipal(await ownedBusinessId(own.user.id));
    if (principal.role === "super_admin" && !own.user.twoFactorEnabled)
      throw new HttpError(428, "MFA_REQUIRED: Enable two-factor authentication in Account Security.");
    res.locals.principal = principal;
    next();
    return;
  }
  if (supabaseAuthEnabled() && (supabaseDefaultProvider() || sessionCookie(req))) {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) assertAuthOrigin(req);
    const s = await readSession(req);
    if (!s || s.payload.recovery) throw new HttpError(401, "Sign-in required.");
    if (hasVerifiedFactor(s.user) && !s.aal2) throw new HttpError(428, "MFA_REQUIRED: Complete two-factor verification.");
    const principal = await resolvePrincipal(await businessId(s.user.id));
    principal.authenticationProvider = "supabase";
    if (principal.role === "super_admin" && (!hasVerifiedFactor(s.user) || !s.aal2))
      throw new HttpError(428, "MFA_REQUIRED: Enable and verify two-factor authentication in Account Security.");
    res.locals.principal = principal;
    next();
    return;
  }
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Sign-in required." });
    return;
  }
  const actorId = applicationUserId(userId);
  if (!actorId) {
    res.status(403).json({ error: "An approved Staging identity binding is required." });
    return;
  }
  res.locals.principal = await resolvePrincipal(actorId);
  next();
};

export function principalFrom(res: Response): Principal {
  return res.locals.principal as Principal;
}

// Cookie-authenticated mutations must originate from this app. No wildcard credentialed CORS.
export const sameOriginMutation: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  if (supabaseAuthEnabled() && (supabaseDefaultProvider() || sessionCookie(req))) {
    if (origin !== supabaseAuthConfiguration().origin || req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Same-origin request required." }); return;
    }
    next(); return;
  }
  if (ownedAuthentication()) {
    try {
      if (!origin || new URL(origin).origin !== authOrigin() || req.get("sec-fetch-site") === "cross-site") {
        res.status(403).json({ error: "Same-origin request required." }); return;
      }
    } catch { res.status(403).json({ error: "Invalid request origin." }); return; }
    next(); return;
  }
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
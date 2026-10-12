import { Router } from "express";
import { GetSupabaseAuthStatusResponse, GetSupabaseAuthSessionResponse,
  PerformSupabaseAuthActionBody, PerformSupabaseAuthActionResponse } from "@workspace/api-zod";
import { supabaseAuthEnabled, supabaseAuthConfiguration } from "../modules/supabase-auth/config";
import { readSession, publicUser, hasVerifiedFactor, assertAuthOrigin } from "../modules/supabase-auth/session";
import { performAction } from "../modules/supabase-auth/actions";

const router = Router();
router.use("/supabase-auth", (_req, res, next) => {
  res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  next();
});
router.get("/supabase-auth/status", (_req, res) => {
  const enabled = supabaseAuthEnabled();
  res.json(GetSupabaseAuthStatusResponse.parse({ enabled, provider: "supabase",
    mailReady: enabled && supabaseAuthConfiguration().mailReady }));
});
router.use("/supabase-auth", (_req, res, next) => {
  if (!supabaseAuthEnabled()) { res.status(404).json({ error: "Supabase authentication trial is not enabled." }); return; }
  next();
});
router.get("/supabase-auth/session", async (req, res): Promise<void> => {
  const s = await readSession(req);
  res.json(GetSupabaseAuthSessionResponse.parse({ user: s ? publicUser(s.user) : null,
    mfaRequired: !!s && !s.payload.recovery && hasVerifiedFactor(s.user) && !s.aal2,
    recovery: s?.payload.recovery ?? false }));
});
router.post("/supabase-auth/action", async (req, res): Promise<void> => {
  assertAuthOrigin(req);
  // Parse original body again so unknown role, subject and redirect fields cannot be stripped into acceptance.
  PerformSupabaseAuthActionBody.parse(req.body);
  res.json(PerformSupabaseAuthActionResponse.parse(await performAction(req.body, req, res)));
});
export default router;

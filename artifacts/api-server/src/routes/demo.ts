import { Router } from "express";
import { StartDemoSessionBody, GetDemoSessionResponse } from "@workspace/api-zod";
import { sameOriginMutation } from "../middlewares/authentication";
import { demoEnabled, demoPrincipal, startDemo, endDemo } from "../modules/demo/session";
import { HttpError } from "../lib/errors";
const router = Router();
router.use("/demo", (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!demoEnabled()) { res.status(503).json({ error: "Secure demo sessions are unavailable." }); return; }
  next();
});
router.get("/demo/session", async (req, res) => {
  const principal = await demoPrincipal(req);
  res.json(GetDemoSessionResponse.parse({ active: !!principal, tenantId: principal?.memberships[0].tenantId ?? null, readOnly: true }));
});
router.post("/demo/session", sameOriginMutation, async (req, res) => {
  if (Object.keys(req.body ?? {}).length) throw new HttpError(400, "Demo entry takes no credentials, role or tenant selection.");
  StartDemoSessionBody.parse(req.body ?? {});
  res.json(GetDemoSessionResponse.parse(await startDemo(req, res)));
});
router.delete("/demo/session", sameOriginMutation, (req, res) => {
  res.json(GetDemoSessionResponse.parse(endDemo(req, res)));
});
export default router;

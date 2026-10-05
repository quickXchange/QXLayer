import { Router } from "express";
import { StartDemoSessionBody, GetDemoSessionResponse } from "@workspace/api-zod";
import { sameOriginMutation } from "../middlewares/authentication";
import { demoEnabled, demoPrincipal, startDemo, endDemo } from "../modules/demo/session";
const router = Router();
router.use("/demo", (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!demoEnabled()) { res.status(404).json({ error: "Development demo sessions are unavailable here." }); return; }
  next();
});
router.get("/demo/session", async (req, res) => {
  const principal = await demoPrincipal(req);
  res.json(GetDemoSessionResponse.parse({ active: !!principal, tenantId: principal?.memberships[0].tenantId ?? null, readOnly: true }));
});
router.post("/demo/session", sameOriginMutation, async (req, res) => {
  const input = StartDemoSessionBody.parse(req.body);
  res.json(GetDemoSessionResponse.parse(await startDemo(req, res, input.username, input.password)));
});
router.delete("/demo/session", sameOriginMutation, (req, res) => {
  res.json(GetDemoSessionResponse.parse(endDemo(req, res)));
});
export default router;

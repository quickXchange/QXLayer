import { Router } from "express";
import { GetPublicSiteParams, GetPublicSiteResponse, GetPublicCapabilityParams, GetPublicCapabilityResponse } from "@workspace/api-zod";
import { getPublicSite } from "../modules/website/service";

const router = Router();
router.use("/public/sites", (_req, res, next) => {
  res.set("Cache-Control", "no-store"); // Suspension/entitlement changes must not serve stale access.
  next();
});
router.get("/public/sites/:slug", async (req, res) => {
  const { slug } = GetPublicSiteParams.parse(req.params);
  res.json(GetPublicSiteResponse.parse(await getPublicSite(slug)));
});
router.get("/public/sites/:slug/capabilities/:feature", async (req, res) => {
  const { slug, feature } = GetPublicCapabilityParams.parse(req.params);
  res.json(GetPublicCapabilityResponse.parse(await getPublicSite(slug, feature)));
});
export default router;
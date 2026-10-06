import { Router } from "express";
import { GetPublicSiteParams, GetPublicSiteResponse, GetPublicCapabilityParams, GetPublicCapabilityResponse } from "@workspace/api-zod";
import { getPublicSite } from "../modules/website/service";
import { ResolvePublicDomainParams, ResolvePublicDomainResponse } from "@workspace/api-zod";
import { resolvePublicDomain } from "../modules/domains/service";
import { publicBrandingFile } from "../modules/website/branding-files";

const router = Router();
router.get("/public/domains/:hostname", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(ResolvePublicDomainResponse.parse(await resolvePublicDomain(ResolvePublicDomainParams.parse(req.params).hostname)));
});
router.use("/public/sites", (_req, res, next) => {
  res.set("Cache-Control", "no-store"); // Suspension/entitlement changes must not serve stale access.
  next();
});
router.get("/public/sites/:slug", async (req, res) => {
  const { slug } = GetPublicSiteParams.parse(req.params);
  res.json(GetPublicSiteResponse.parse(await getPublicSite(slug)));
});
router.get("/public/sites/:slug/branding/:kind", async (req, res) => {
  const { file, contentType } = await publicBrandingFile(req.params.slug, req.params.kind);
  res.set({ "Content-Type": contentType, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'", "Cache-Control": "no-store" });
  file.createReadStream().on("error", () => { if (!res.headersSent) res.status(404).end(); else res.destroy(); }).pipe(res);
});
router.get("/public/sites/:slug/capabilities/:feature", async (req, res) => {
  const { slug, feature } = GetPublicCapabilityParams.parse(req.params);
  res.json(GetPublicCapabilityResponse.parse(await getPublicSite(slug, feature)));
});
export default router;
import { Router } from "express";
import { GetGlobalExchangeCatalogResponse, PatchGlobalExchangeCatalogBody, PatchGlobalExchangeCatalogResponse } from "@workspace/api-zod";
import { principalFrom, requireAuthentication, sameOriginMutation } from "../middlewares/authentication";
import { globalCatalog } from "../products/exchange/global-catalog";
const router = Router();
router.get("/exchange/catalog", requireAuthentication, async (_req,res) => {
  res.json(GetGlobalExchangeCatalogResponse.parse(await globalCatalog(principalFrom(res))));
});
router.post("/operator/exchange/catalog", requireAuthentication, sameOriginMutation, async (req,res) => {
  res.json(PatchGlobalExchangeCatalogResponse.parse(await globalCatalog(principalFrom(res),PatchGlobalExchangeCatalogBody.parse(req.body))));
});
export default router;

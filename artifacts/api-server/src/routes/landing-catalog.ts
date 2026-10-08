import { Router } from "express";
import * as v from "@workspace/api-zod";
import { principalFrom, requireAuthentication, sameOriginMutation } from "../middlewares/authentication";
import { publicProductCatalog, listProducts, saveProduct } from "../modules/landing-catalog/service";

const router = Router();
router.get("/public/product-catalog", async (_req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const catalog = await publicProductCatalog();
  res.set("X-QX-Catalog-Source", catalog.source);
  res.json(v.GetPublicProductCatalogResponse.parse(catalog.products));
});
router.get("/landing-products", requireAuthentication, async (_req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  res.json(v.ListLandingProductsResponse.parse(await listProducts(principalFrom(res))));
});
router.put("/landing-products/:productKey", requireAuthentication, sameOriginMutation, async (req, res): Promise<void> => {
  const { productKey } = v.UpdateLandingProductParams.parse(req.params);
  res.json(v.UpdateLandingProductResponse.parse(await saveProduct(principalFrom(res), productKey, v.UpdateLandingProductBody.parse(req.body))));
});
export default router;
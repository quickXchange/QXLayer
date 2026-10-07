import { Router, type IRouter } from "express";
import healthRouter from "./health";
import demoRouter from "./demo";
import catalogRouter from "./catalog";
import platformRouter from "./platform";
import tenantsRouter from "./tenants";
import plansRouter from "./plans";
import websiteRouter from "./website";
import landingCatalogRouter from "./landing-catalog";
import exchangeRouter from "./exchange";
import providerFoundationRouter from "./provider-foundation";
import customerRouter from "./customer";
import orderFilesRouter from "./order-files";
import { requireAuthentication, principalFrom } from "../middlewares/authentication";
import { assertDeliveredExchangeAccess } from "../modules/customer/service";
import { GetTenantParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.use(healthRouter);
router.use(demoRouter);
router.use(landingCatalogRouter);
router.use(websiteRouter);
router.use(customerRouter);
router.use(orderFilesRouter);
router.use("/tenants/:tenantId", requireAuthentication, async (req, res, next) => {
  await assertDeliveredExchangeAccess(principalFrom(res), GetTenantParams.parse(req.params).tenantId);
  next();
});
router.use(exchangeRouter);
router.use(providerFoundationRouter);
router.use(catalogRouter);
router.use(tenantsRouter);
router.use(platformRouter);
router.use(plansRouter);

export default router;

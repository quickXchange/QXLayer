import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import platformRouter from "./platform";
import tenantsRouter from "./tenants";
import plansRouter from "./plans";
import websiteRouter from "./website";

const router: IRouter = Router();

router.use(healthRouter);
router.use(websiteRouter);
router.use(catalogRouter);
router.use(tenantsRouter);
router.use(platformRouter);
router.use(plansRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import platformRouter from "./platform";
import tenantsRouter from "./tenants";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(tenantsRouter);
router.use(platformRouter);

export default router;

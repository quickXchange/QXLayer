import { Router } from "express";
import { z } from "zod/v4";
import { principalFrom, requireAuthentication, sameOriginMutation } from "../middlewares/authentication";
import { integrationBundle, saveIntegration, testIntegration } from "../modules/integrations/service";
import { miniLanguages, publicMiniConfig, receiveTelegramUpdate, registerWebhook } from "../modules/integrations/telegram";
const router = Router();
router.use(["/integrations/runtime", "/tenants/:tenantId/integrations"], requireAuthentication, sameOriginMutation,
  (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const params = z.object({ tenantId: z.uuid(), providerKey: z.string() });
router.get("/integrations/runtime", async (_req, res) => res.json(await integrationBundle(principalFrom(res))));
router.get("/tenants/:tenantId/integrations", async (req, res) => res.json(await integrationBundle(principalFrom(res), z.uuid().parse(req.params.tenantId))));
router.put("/tenants/:tenantId/integrations/:providerKey", async (req, res) => {
  const p = params.parse(req.params); res.json(await saveIntegration(principalFrom(res), p.tenantId, p.providerKey, req.body));
});
router.post("/tenants/:tenantId/integrations/:providerKey/test", async (req, res) => {
  const p = params.parse(req.params); res.json(await testIntegration(principalFrom(res), p.tenantId, p.providerKey, req.body));
});
router.post("/tenants/:tenantId/integrations/telegram_bot/webhook", async (req, res) =>
  res.json(await registerWebhook(principalFrom(res), z.uuid().parse(req.params.tenantId), req.body)));
router.get("/public/sites/:slug/telegram/config", async (req, res) => {
  res.set("Cache-Control", "no-store"); res.json(await publicMiniConfig(req.params.slug));
});
router.get("/public/sites/:slug/telegram/languages", async (req, res) => {
  res.set("Cache-Control", "no-store"); res.json(await miniLanguages(req.params.slug));
});
router.get("/public/sites/:slug/telegram/languages/dictionaries/:code", async (req, res) => {
  res.set("Cache-Control", "no-store"); res.json(await miniLanguages(req.params.slug, req.params.code));
});
router.post("/public/sites/:slug/telegram/webhook", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await receiveTelegramUpdate(req.params.slug, req.get("X-Telegram-Bot-Api-Secret-Token") ?? "", req.body));
});
export default router;

import { Router } from "express";
import { guardPublicDemo } from "../modules/demo/public-sandbox";
import {
  GetExchangeConfigurationParams, GetExchangeConfigurationResponse,
  SaveExchangeConfigurationBody, SaveExchangeConfigurationResponse,
  GetPublicExchangeParams, GetPublicExchangeResponse,
  CreateSandboxQuoteBody, CreateSandboxQuoteResponse,
  CreateSandboxOrderBody, CreateSandboxOrderResponse,
  TrackSandboxOrderParams, TrackSandboxOrderResponse,
  GetExchangeDashboardResponse, GetExchangeOrderParams, GetExchangeOrderResponse,
  UpdateExchangeOrderStatusBody, UpdateExchangeOrderStatusResponse,
  ListExchangeOrdersQueryParams, ListExchangeOrdersResponse,
  ListExchangeAuditQueryParams, ListExchangeAuditResponse,
} from "@workspace/api-zod";
import { requireAuthentication, principalFrom, sameOriginMutation } from "../middlewares/authentication";
import { exchangeAudit, exchangeConfiguration, exchangeDashboard, publicExchange, sandboxOrder, sandboxQuote, tenantOrder, tenantOrders, trackOrder } from "../products/exchange/service";
import { HttpError } from "../lib/errors";

const router = Router();
// Short-lived process-local rate limiting adds an outer abuse guard. Quota admission
// and idempotency still use database locks, so they stay correct across processes.
const buckets = new Map<string, { until: number; used: number }>();
router.use("/public/sites/:slug/exchange", sameOriginMutation, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.method === "POST") {
    const now = Date.now(), key = `${req.ip}:${req.params.slug}`;
    const b = buckets.get(key);
    if (!b || b.until < now) buckets.set(key, { until: now + 60000, used: 1 });
    else if (++b.used > 60) { res.set("Retry-After", "60"); throw new HttpError(429, "Too many sandbox requests. Try again in a minute."); }
    if (buckets.size > 10000) for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  }
  next();
});
router.get("/public/sites/:slug/exchange", async (req, res) => res.json(GetPublicExchangeResponse.parse(await publicExchange(GetPublicExchangeParams.parse(req.params).slug))));
router.post("/public/sites/:slug/exchange/quotes", guardPublicDemo, async (req, res) => res.json(CreateSandboxQuoteResponse.parse(await sandboxQuote(GetPublicExchangeParams.parse(req.params).slug, CreateSandboxQuoteBody.parse(req.body)))));
router.post("/public/sites/:slug/exchange/orders", guardPublicDemo, async (req, res) => res.status(201).json(CreateSandboxOrderResponse.parse(await sandboxOrder(GetPublicExchangeParams.parse(req.params).slug, CreateSandboxOrderBody.parse(req.body)))));
router.get("/public/sites/:slug/exchange/orders/:orderId", async (req, res) => {
  const { slug, orderId } = TrackSandboxOrderParams.parse(req.params);
  res.json(TrackSandboxOrderResponse.parse(await trackOrder(slug, orderId, req.get("trackingToken") ?? "")));
});
router.use("/tenants/:tenantId/exchange", requireAuthentication, sameOriginMutation, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/tenants/:tenantId/exchange", async (req, res) => res.json(GetExchangeConfigurationResponse.parse(await exchangeConfiguration(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId))));
router.put("/tenants/:tenantId/exchange", async (req, res) => res.json(SaveExchangeConfigurationResponse.parse(await exchangeConfiguration(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId, SaveExchangeConfigurationBody.parse(req.body)))));
router.get("/tenants/:tenantId/exchange/dashboard", async (req, res) => res.json(GetExchangeDashboardResponse.parse(await exchangeDashboard(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId))));
router.get("/tenants/:tenantId/exchange/audit", async (req, res) => res.json(ListExchangeAuditResponse.parse(await exchangeAudit(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId, ListExchangeAuditQueryParams.parse(req.query).page))));
router.get("/tenants/:tenantId/exchange/orders", async (req, res) => res.json(ListExchangeOrdersResponse.parse(await tenantOrders(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId, ListExchangeOrdersQueryParams.parse(req.query)))));
router.get("/tenants/:tenantId/exchange/orders/:orderId", async (req, res) => {
  const { tenantId, orderId } = GetExchangeOrderParams.parse(req.params);
  res.json(GetExchangeOrderResponse.parse(await tenantOrder(principalFrom(res), tenantId, orderId)));
});
router.put("/tenants/:tenantId/exchange/orders/:orderId", async (req, res) => {
  const { tenantId, orderId } = GetExchangeOrderParams.parse(req.params);
  res.json(UpdateExchangeOrderStatusResponse.parse(await tenantOrder(principalFrom(res), tenantId, orderId, UpdateExchangeOrderStatusBody.parse(req.body))));
});
export default router;
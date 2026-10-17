import { Router } from "express";
import { guardPublicDemo } from "../modules/demo/public-sandbox";
import {
  GetExchangeConfigurationParams, GetExchangeConfigurationResponse,
  SaveExchangeConfigurationBody, SaveExchangeConfigurationResponse,
  GetPublicExchangeParams, GetPublicExchangeResponse,
  CreateSandboxQuoteBody, CreateSandboxQuoteResponse,
  CreateSandboxOrderBody, CreateSandboxOrderResponse,
  ReviewSandboxOrderBody,ReviewSandboxOrderResponse,
  TrackSandboxOrderParams, TrackSandboxOrderResponse,
  GetExchangeDashboardResponse, GetExchangeOrderParams, GetExchangeOrderResponse,
  UpdateExchangeOrderStatusBody, UpdateExchangeOrderStatusResponse,
  ListExchangeOrdersQueryParams, ListExchangeOrdersResponse,
  ListExchangeAuditQueryParams, ListExchangeAuditResponse,
  ListExchangeCustomersResponse,
  GetExchangeVisualCatalogResponse,
} from "@workspace/api-zod";
import { requireAuthentication, principalFrom, sameOriginMutation } from "../middlewares/authentication";
import { exchangeAudit, exchangeConfiguration, exchangeCustomers, exchangeDashboard, publicExchange, sandboxOrder, sandboxQuote, tenantOrder, tenantOrders, trackOrder } from "../products/exchange/service";
import { containsCredential } from "../products/exchange/providers";
import { HttpError } from "../lib/errors";
import { visualCatalog, visualFile } from "../products/exchange/visual-assets";
import { authorizedWebsitePreview } from "../modules/website/operator-preview";
import { assertMiniAction } from "../modules/integrations/telegram";
import { sandboxInvoice } from "../products/exchange/invoice";
import { notifications, updateCustomer } from "../products/exchange/customer-management";
import {
  UpdateExchangeCustomerParams, UpdateExchangeCustomerBody, UpdateExchangeCustomerResponse,
  GetExchangeNotificationsResponse, SaveExchangeNotificationPreferencesBody,
} from "@workspace/api-zod";

const router = Router();
router.get("/exchange/visual-catalog", (_req, res) => {
  res.set("Cache-Control", "public,max-age=300");
  res.json(GetExchangeVisualCatalogResponse.parse(visualCatalog));
});
router.get("/exchange/visual-assets/:filename", async (req, res) => {
  const filename = String(req.params.filename);
  const entry = (visualCatalog.blobs as { filename: string; contentType: string }[]).find(b => b.filename === filename);
  if (!entry) throw new HttpError(404, "Visual asset not found.");
  const file = visualFile(entry.filename);
  if (!(await file.exists())[0]) throw new HttpError(404, "Visual asset is unavailable.");
  res.set({
    "Content-Type": entry.contentType,
    "Cache-Control": "public,max-age=31536000,immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
  });
  const stream = file.createReadStream();
  stream.on("error", error => { req.log.error({ err: error }, "Visual asset stream failed"); res.destroy(); });
  stream.pipe(res);
});
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
router.use("/public/sites/:slug/exchange", async (req, _res, next) => {
  if (req.get("X-QX-Channel") === "telegram") {
    const action = req.method === "POST" ? req.body?.action :
      req.path.startsWith("/orders/") ? "tracking" : undefined;
    await assertMiniAction(String(req.params.slug), typeof action === "string" ? action : undefined);
  }
  next();
});
router.get("/public/sites/:slug/exchange", async (req, res) => {
  const { slug } = GetPublicExchangeParams.parse(req.params);
  res.json(GetPublicExchangeResponse.parse(await publicExchange(slug, await authorizedWebsitePreview(req, slug))));
});
router.post("/public/sites/:slug/exchange/quotes", guardPublicDemo, async (req, res) => res.json(CreateSandboxQuoteResponse.parse(await sandboxQuote(GetPublicExchangeParams.parse(req.params).slug, CreateSandboxQuoteBody.parse(req.body), req.get("X-QX-Channel") === "telegram" ? "telegram" : undefined))));
router.post("/public/sites/:slug/exchange/orders", guardPublicDemo, async (req, res) => res.status(201).json(CreateSandboxOrderResponse.parse(await sandboxOrder(GetPublicExchangeParams.parse(req.params).slug, CreateSandboxOrderBody.parse(req.body), req.get("X-QX-Channel") === "telegram" ? "telegram" : undefined))));
router.post("/public/sites/:slug/exchange/review",guardPublicDemo,async(req,res)=>{
  const {reviewOrder}=await import("../products/exchange/service");
  res.json(ReviewSandboxOrderResponse.parse(await reviewOrder(GetPublicExchangeParams.parse(req.params).slug,ReviewSandboxOrderBody.parse(req.body))));
});
router.get("/public/sites/:slug/exchange/orders/:orderId", async (req, res) => {
  const { slug, orderId } = TrackSandboxOrderParams.parse(req.params);
  res.json(TrackSandboxOrderResponse.parse(await trackOrder(slug, orderId, req.get("trackingToken") ?? "")));
});
router.get("/public/sites/:slug/exchange/orders/:orderId/invoice", async (req, res) => {
  const { slug, orderId } = TrackSandboxOrderParams.parse(req.params);
  const bytes = await sandboxInvoice(slug, orderId, req.get("trackingToken") ?? "");
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="sandbox-invoice-${orderId}.pdf"`,
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.send(Buffer.from(bytes));
});
router.use("/tenants/:tenantId/exchange", requireAuthentication, sameOriginMutation, (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/tenants/:tenantId/exchange", async (req, res) => res.json(GetExchangeConfigurationResponse.parse(await exchangeConfiguration(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId))));
router.post("/tenants/:tenantId/exchange/test-quote",async(req,res)=>{
  const tenantId=GetExchangeConfigurationParams.parse(req.params).tenantId;
  const principal=principalFrom(res);
  await exchangeConfiguration(principal,tenantId);
  const {withDatabase}=await import("@workspace/db");
  const {contextFor}=await import("../modules/authentication/service");
  const slug=await withDatabase(contextFor(principal,tenantId),async c=>(await c.query("SELECT slug FROM tenants WHERE id=$1",[tenantId])).rows[0]?.slug);
  if(!slug)throw new Error("Tenant not found");
  res.json(CreateSandboxQuoteResponse.parse(await sandboxQuote(slug,CreateSandboxQuoteBody.parse(req.body))));
});
router.put("/tenants/:tenantId/exchange", async (req, res) => {
  // Check before Zod strips unknown keys: never accept credentials as configuration metadata.
  if (containsCredential(req.body)) throw new HttpError(400, "Provider credentials are not supported. Do not submit API keys or secrets.");
  res.json(SaveExchangeConfigurationResponse.parse(await exchangeConfiguration(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId, SaveExchangeConfigurationBody.parse(req.body))));
});
router.get("/tenants/:tenantId/exchange/dashboard", async (req, res) => res.json(GetExchangeDashboardResponse.parse(await exchangeDashboard(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId))));
router.get("/tenants/:tenantId/exchange/customers", async (req, res) => res.json(ListExchangeCustomersResponse.parse(await exchangeCustomers(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId))));
router.patch("/tenants/:tenantId/exchange/customers/:customerId", async (req, res) => {
  const { tenantId, customerId } = UpdateExchangeCustomerParams.parse(req.params);
  res.json(UpdateExchangeCustomerResponse.parse(await updateCustomer(principalFrom(res), tenantId, customerId, UpdateExchangeCustomerBody.parse(req.body))));
});
router.get("/tenants/:tenantId/exchange/notifications", async (req, res) => {
  res.json(GetExchangeNotificationsResponse.parse(await notifications(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId)));
});
router.put("/tenants/:tenantId/exchange/notifications", async (req, res) => {
  res.json(GetExchangeNotificationsResponse.parse(await notifications(principalFrom(res), GetExchangeConfigurationParams.parse(req.params).tenantId, SaveExchangeNotificationPreferencesBody.parse(req.body))));
});
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
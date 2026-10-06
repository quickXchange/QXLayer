import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { withDatabase, type DatabaseClient } from "@workspace/db";
import { CreateSandboxQuoteBody, SaveExchangeConfigurationBody, type ExchangeQuoteInput, type ExchangeSettings, type ExchangeOrderInput, type ExchangeStatusInput, type ExchangeOrder } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { contextFor, type Principal } from "../../modules/authentication/service";
import { consumeMonthlyUsage, enforceLimit, lockTenant, requireFeature, resolveEntitlements, type EffectiveEntitlements } from "../../modules/entitlements/resolver";
import { decimal, decimalString } from "../../modules/entitlements/decimal";
import { publicTenantId } from "../../modules/website/service";
import { ACTIONS, emptySettings, readExchange, validateExchange } from "./settings";
import { calculateQuote } from "./calculation";

const hash = (v: string) => createHash("sha256").update(v).digest("hex");
function sign(v: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new HttpError(503, "Sandbox quote signing is not configured.");
  return createHmac("sha256", secret).update(`exchange-sandbox-v1:${v}`).digest("base64url");
}
function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function issue(tenantId: string, input: ExchangeQuoteInput, s: ExchangeSettings, planCurrency: string) {
  const expiresAt = new Date(Date.now() + 90000).toISOString();
  const body = Buffer.from(JSON.stringify({ tenantId, input, settingsHash: hash(JSON.stringify(s)), planCurrency, expiresAt })).toString("base64url");
  return { token: `${body}.${sign(body)}`, expiresAt };
}
function verify(token: string, tenantId: string, settings: ExchangeSettings, planCurrency: string) {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra || !equal(signature, sign(body))) throw new HttpError(400, "Invalid sandbox quote.");
  let value;
  try { value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new HttpError(400, "Invalid sandbox quote."); }
  if (value.tenantId !== tenantId) throw new HttpError(404, "Sandbox quote not found.");
  if (value.planCurrency !== planCurrency) throw new HttpError(409, "Plan currency changed. Request a fresh sandbox quote.");
  if (!Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()) throw new HttpError(409, "Quote expired. Request a fresh quote.");
  if (value.settingsHash !== hash(JSON.stringify(settings))) throw new HttpError(409, "Exchange configuration changed. Request a fresh quote.");
  return CreateSandboxQuoteBody.parse(value.input);
}
function guard(e: EffectiveEntitlements, action?: string) {
  if (e.tenantStatus !== "active") throw new HttpError(404, "Exchange website is not active.");
  requireFeature(e, "website");
  requireFeature(e, "crypto_exchange");
  if (action) requireFeature(e, action);
}
export function exchangeConfiguration(principal: Principal, tenantId: string, input?: ExchangeSettings) {
  return withDatabase(contextFor(principal, tenantId, input !== undefined, "configuration.manage"), async client => {
    if (input) await lockTenant(client, tenantId);
    const e = await resolveEntitlements(client, tenantId);
    const result = await readExchange(client, tenantId);
    if (input) {
      requireFeature(e, "crypto_exchange");
      const s = validateExchange(input, e, result.catalog);
      const previousIds = result.configuration.paymentMethods.map(m => m.id);
      const existing = await client.query("SELECT id,label FROM tenant_payment_methods WHERE tenant_id=$1", [tenantId]);
      const total = new Set([...existing.rows.map(m => m.id).filter(id => !previousIds.includes(id) || s.paymentMethods.some(m => m.id === id)), ...s.paymentMethods.map(m => m.id)]).size;
      enforceLimit(e, "max_payment_methods", String(total));
      // Only exchange-owned labels are reconciled; other product configuration is untouched.
      for (const m of s.paymentMethods) {
        const saved = await client.query("INSERT INTO tenant_payment_methods (id,tenant_id,label) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label WHERE tenant_payment_methods.tenant_id=EXCLUDED.tenant_id", [m.id, tenantId, m.label.trim()]);
        if (!saved.rowCount) throw new HttpError(400, "Payment method identifier belongs to another tenant.");
      }
      const removed = previousIds.filter(id => !s.paymentMethods.some(m => m.id === id));
      if (removed.length) await client.query("DELETE FROM tenant_payment_methods WHERE tenant_id=$1 AND id=ANY($2::uuid[])", [tenantId, removed]);
      // Materialize the existing pricing-rule foundation. Historical rule rows stay
      // available for existing orders; each order also keeps immutable quote values.
      for (const r of s.routes) {
        const saved = await client.query(
          "INSERT INTO pricing_rules (id,tenant_id,name,fee_bps) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,fee_bps=EXCLUDED.fee_bps WHERE pricing_rules.tenant_id=EXCLUDED.tenant_id",
          [r.id, tenantId, `Sandbox ${r.action}: ${r.source} → ${r.destination}`, r.feeBps.toString()]);
        if (!saved.rowCount) throw new HttpError(400, "Route identifier belongs to another tenant.");
      }
      await client.query(`INSERT INTO tenant_product_configuration (tenant_id,module_key,configuration) VALUES ($1,'crypto_exchange',$2)
        ON CONFLICT (tenant_id,module_key) DO UPDATE SET configuration=EXCLUDED.configuration ||
          CASE WHEN tenant_product_configuration.configuration ? 'optionalIntegrations'
            THEN jsonb_build_object('optionalIntegrations',tenant_product_configuration.configuration->'optionalIntegrations')
            ELSE '{}'::jsonb END,updated_at=now()`, [tenantId, JSON.stringify({ ...s, referenceCurrency: e.plan?.currency })]);
      await client.query("UPDATE tenant_configuration SET exchange_enabled=$2 WHERE tenant_id=$1", [tenantId, s.enabled]);
      await client.query("UPDATE tenants SET completed_steps=CASE WHEN 'configuration'=ANY(completed_steps) THEN completed_steps ELSE array_append(completed_steps,'configuration') END,updated_at=now() WHERE id=$1", [tenantId]);
      await audit(client, principal, tenantId, "exchange.configuration.saved", "Updated White Label Exchange sandbox settings", { routes: s.routes.length, enabled: s.enabled });
      for (const key of ["assets", "networks", "routes", "paymentMethods", "providers"] as const) {
        const before = (result.configuration[key] ?? []) as unknown as Record<string, unknown>[], after = (s[key] ?? []) as unknown as Record<string, unknown>[];
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          const identify = (v: Record<string, unknown>) => v.id ?? v.assetId ?? v.assetNetworkId ?? v.providerId;
          const prior = new Map(before.map(v => [identify(v), v]));
          const changed = after.filter(v => JSON.stringify(prior.get(identify(v))) !== JSON.stringify(v)).length +
            before.filter(v => !after.some(a => identify(a) === identify(v))).length;
          await audit(client, principal, tenantId, `exchange.${key}.changed`, `Updated sandbox exchange ${key}`, { beforeCount: before.length, afterCount: after.length, changedCount: changed });
          if (changed > 1) await audit(client, principal, tenantId, "exchange.bulk.changed", `Applied changes to ${changed} ${key}`, { section: key, changedCount: changed });
        }
      }
      const price = (r: ExchangeSettings["routes"][number]) => [r.id, r.rate, r.feeBps, r.fixedFee, r.spreadBps, r.minimum, r.maximum];
      if (JSON.stringify(result.configuration.routes.map(price)) !== JSON.stringify(s.routes.map(price))) await audit(client, principal, tenantId, "exchange.pricing.changed", "Updated sandbox route pricing, fees or limits", {});
      result.configuration = s;
    }
    const legacy = await client.query("SELECT exchange_enabled FROM tenant_configuration WHERE tenant_id=$1", [tenantId]);
    return { ...result, effectiveEnabled: result.configuration.enabled && legacy.rows[0]?.exchange_enabled === true && e.features.crypto_exchange === true && e.features.website === true && e.tenantStatus === "active" && e.status === "active" && !e.overLimit };
  });
}
export async function publicExchange(slug: string) {
  const tenantId = await publicTenantId(slug);
  return withDatabase({ actorId: "sandbox-visitor", tenantId }, async client => {
    const e = await resolveEntitlements(client, tenantId); guard(e);
    const { configuration: s, catalog } = await readExchange(client, tenantId);
    const legacy = await client.query("SELECT exchange_enabled FROM tenant_configuration WHERE tenant_id=$1", [tenantId]);
    const enabled = s.enabled && legacy.rows[0]?.exchange_enabled === true && !e.overLimit;
    const assets = catalog.flatMap(c => {
      const a = s.assets.find(a => a.assetId === c.assetId && a.enabled);
      const n = s.networks.find(n => n.assetNetworkId === c.assetNetworkId && n.enabled && n.available);
      return a && n ? [{ assetNetworkId: c.assetNetworkId, assetId: c.assetId, symbol: a.symbol, name: c.name, networkId: c.networkId, networkName: c.networkName, testnet: c.testnet, logoUrl: a.logoUrl, decimals: a.decimals }] : [];
    }).sort((a, b) => (s.assets.find(x => x.assetId === a.assetId)?.displayOrder ?? 0) - (s.assets.find(x => x.assetId === b.assetId)?.displayOrder ?? 0));
    const actions = ACTIONS.filter(a => enabled && s.actions[a] && e.features[a]);
    const endpointEnabled = (id: string) => id === `fiat:${s.fiatCurrency}` || catalog.some(c => c.assetNetworkId === id && assets.some(a => a.assetId === c.assetId && a.networkId === c.networkId));
    return { enabled, defaultAction: s.defaultAction, actions, assets, routes: s.routes.filter(r => r.enabled && actions.includes(r.action) && endpointEnabled(r.source) && endpointEnabled(r.destination)),
      // Keep administrator-only reserve metadata out of the unchanged public view.
      paymentMethods: s.paymentMethods.filter(m => m.enabled).map(({ reserve: _reserve, ...method }) => method), fiatCurrency: s.fiatCurrency, publicNote: s.publicNote };
  });
}
function quoteAdmission(e: EffectiveEntitlements, volume: string) {
  const used = Object.fromEntries(e.usage.map(u => [u.key, u.used]));
  enforceLimit(e, "max_monthly_transactions", decimalString(decimal(used.max_monthly_transactions ?? "0") + decimal("1")));
  enforceLimit(e, "max_monthly_volume", decimalString(decimal(used.max_monthly_volume ?? "0") + decimal(volume)));
}
async function operationalExchange(client: DatabaseClient, tenantId: string, action?: string) {
  const e = await resolveEntitlements(client, tenantId); guard(e, action);
  if (e.overLimit) throw new HttpError(409, "Resolve the tenant's over-limit resource usage before creating sandbox quotes or orders.");
  const legacy = await client.query("SELECT exchange_enabled FROM tenant_configuration WHERE tenant_id=$1", [tenantId]);
  if (!legacy.rows[0]?.exchange_enabled) throw new HttpError(409, "The tenant exchange is paused.");
  const reference = await client.query("SELECT configuration->>'referenceCurrency' AS currency FROM tenant_product_configuration WHERE tenant_id=$1 AND module_key='crypto_exchange'", [tenantId]);
  if (reference.rows[0]?.currency !== e.plan?.currency) throw new HttpError(409, "The plan currency changed. Review and save the sandbox reference rates in Exchange Admin before requesting quotes.");
  return e;
}
export async function sandboxQuote(slug: string, input: ExchangeQuoteInput) {
  const tenantId = await publicTenantId(slug);
  return withDatabase({ actorId: "sandbox-visitor", tenantId }, async client => {
    const e = await operationalExchange(client, tenantId, input.action);
    const { configuration: s, catalog } = await readExchange(client, tenantId);
    const { quote, volume } = calculateQuote(s, catalog, input);
    quoteAdmission(e, volume);
    return { ...quote, ...issue(tenantId, input, s, e.plan!.currency) };
  });
}
type StoredRequest = ReturnType<typeof calculateQuote>["quote"] & {
  product: "crypto_exchange"; quoteHash: string; idempotencyHash: string;
  paymentMethod: string | null; paymentMethodId?: string | null; volume: string; history: { status: string; at: string; note: string }[];
};
interface OrderRow { id: string; status: string; request: StoredRequest; created_at: Date }
function serializeOrder(row: OrderRow): ExchangeOrder {
  const r = row.request;
  return { id: row.id, status: row.status, action: r.action, source: r.source, destination: r.destination,
    sourceSymbol: r.sourceSymbol, destinationSymbol: r.destinationSymbol, inputAmount: r.inputAmount,
    outputAmount: r.outputAmount, rate: r.rate, fee: r.fee, destinationFee: r.destinationFee ?? "0", spreadBps: r.spreadBps,
    paymentMethod: r.paymentMethod, paymentMethodId: r.paymentMethodId ?? null, createdAt: row.created_at,
    updatedAt: new Date(r.history.at(-1)?.at ?? row.created_at), customerName: null, customerEmail: null,
    history: r.history.map(h => ({ ...h, at: new Date(h.at) })), sandboxOnly: true };
}
async function orderRow(client: DatabaseClient, tenantId: string, id: string, lock = false) {
  const r = await client.query<OrderRow>(`SELECT id,status,request,created_at FROM exchange_orders WHERE tenant_id=$1 AND id=$2 AND request->>'product'='crypto_exchange'${lock ? " FOR UPDATE" : ""}`, [tenantId, id]);
  if (!r.rowCount) throw new HttpError(404, "Sandbox order not found.");
  return r.rows[0];
}
export async function sandboxOrder(slug: string, input: ExchangeOrderInput) {
  const tenantId = await publicTenantId(slug);
  return withDatabase({ actorId: "sandbox-visitor", tenantId, canWrite: true }, async client => {
    await lockTenant(client, tenantId);
    const e = await operationalExchange(client, tenantId);
    const old = await client.query<OrderRow>("SELECT id,status,request,created_at FROM exchange_orders WHERE tenant_id=$1 AND request->>'product'='crypto_exchange' AND request->>'idempotencyHash'=$2", [tenantId, hash(input.idempotencyKey)]);
    if (old.rowCount) {
      if (old.rows[0].request.quoteHash !== hash(input.quoteToken)) throw new HttpError(409, "This idempotency key belongs to another request.");
      return { order: serializeOrder(old.rows[0]), trackingToken: sign(`track:${tenantId}:${old.rows[0].id}`) };
    }
    const { configuration: s, catalog } = await readExchange(client, tenantId);
    const request = verify(input.quoteToken, tenantId, s, e.plan!.currency);
    guard(e, request.action);
    const { quote, volume, paymentMethod } = calculateQuote(s, catalog, request);
    await consumeMonthlyUsage(client, tenantId, "crypto_exchange", volume);
    const id = randomUUID();
    const stored: StoredRequest = { ...quote, product: "crypto_exchange", paymentMethod, paymentMethodId: request.paymentMethodId ?? null, volume,
      quoteHash: hash(input.quoteToken), idempotencyHash: hash(input.idempotencyKey),
      history: [{ status: "pending", at: new Date().toISOString(), note: "Sandbox order created. No funds, wallets, deposit addresses or payments exist." }] };
    const result = await client.query<OrderRow>("INSERT INTO exchange_orders (id,tenant_id,pricing_rule_id,status,request) VALUES ($1,$2,$3,'pending',$4) RETURNING id,status,request,created_at", [id, tenantId, quote.routeId, JSON.stringify(stored)]);
    await audit(client, { userId: "sandbox-visitor", role: "unassigned", memberships: [] }, tenantId, "exchange.order.created", "Created a simulated exchange order", { orderId: id, action: request.action });
    return { order: serializeOrder(result.rows[0]), trackingToken: sign(`track:${tenantId}:${id}`) };
  });
}
export async function trackOrder(slug: string, id: string, token: string) {
  const tenantId = await publicTenantId(slug);
  if (!equal(token, sign(`track:${tenantId}:${id}`))) throw new HttpError(404, "Sandbox order not found.");
  return withDatabase({ actorId: "sandbox-visitor", tenantId }, async client => {
    // Pausing trading does not erase access to existing order tracking.
    guard(await resolveEntitlements(client, tenantId));
    return serializeOrder(await orderRow(client, tenantId, id));
  });
}
export function tenantOrder(principal: Principal, tenantId: string, id: string, input?: ExchangeStatusInput) {
  return withDatabase(contextFor(principal, tenantId, !!input, "configuration.manage"), async client => {
    if (input) { await lockTenant(client, tenantId); requireFeature(await resolveEntitlements(client, tenantId), "crypto_exchange"); }
    const row = await orderRow(client, tenantId, id, !!input);
    if (input) {
      if (input.expectedStatus !== undefined && input.expectedStatus !== row.status) throw new HttpError(409, "This order changed after review. Refresh its details and review again.");
      const next: Record<string, string[]> = { pending: ["processing", "cancelled", "failed"], processing: ["completed", "cancelled", "failed"], completed: [], cancelled: [], failed: [] };
      if (!(next[row.status] ?? []).includes(input.status)) throw new HttpError(409, "This sandbox status transition is not allowed. Terminal orders cannot be reopened.");
      row.request.history.push({ status: input.status, at: new Date().toISOString(), note: input.note || "Status updated by tenant administrator (simulation only)." });
      await client.query("UPDATE exchange_orders SET status=$3,request=$4 WHERE tenant_id=$1 AND id=$2", [tenantId, id, input.status, JSON.stringify(row.request)]);
      await audit(client, principal, tenantId, "exchange.order.status_changed", "Changed simulated exchange order status", { orderId: id, from: row.status, to: input.status });
      if (input.note.startsWith("Bulk:")) await audit(client, principal, tenantId, "exchange.orders.bulk_item", "Applied bulk workflow to a simulated order", { orderId: id, from: row.status, to: input.status });
      row.status = input.status;
    }
    return serializeOrder(row);
  });
}
export function tenantOrders(principal: Principal, tenantId: string, query: { search?: string; status?: string; action?: string; page?: number; from?: string; to?: string; customer?: string }) {
  return withDatabase(contextFor(principal, tenantId), async client => {
    for (const date of [query.from, query.to]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new HttpError(400, "Use valid calendar dates in YYYY-MM-DD format.");
    if (query.from && query.to && query.from > query.to) throw new HttpError(400, "Start date must not be after end date.");
    if (query.customer && query.customer !== "anonymous") throw new HttpError(400, "Sandbox orders do not collect customer identity.");
    const page = query.page ?? 1, pageSize = 25;
    const filter = "tenant_id=$1 AND request->>'product'='crypto_exchange' AND ($2='' OR status=$2) AND ($3='' OR request->>'action'=$3) AND ($4='' OR id::text ILIKE '%'||$4||'%' OR request->>'sourceSymbol' ILIKE '%'||$4||'%' OR request->>'destinationSymbol' ILIKE '%'||$4||'%') AND ($5::timestamptz IS NULL OR created_at >= $5::timestamptz) AND ($6::timestamptz IS NULL OR created_at < $6::timestamptz + interval '1 day')";
    const args = [tenantId, query.status ?? "", query.action ?? "", query.search ?? "", query.from ? `${query.from}T00:00:00Z` : null, query.to ? `${query.to}T00:00:00Z` : null];
    const count = await client.query(`SELECT count(*)::int AS total FROM exchange_orders WHERE ${filter}`, args);
    const rows = await client.query<OrderRow>(`SELECT id,status,request,created_at FROM exchange_orders WHERE ${filter} ORDER BY created_at DESC,id DESC LIMIT $7 OFFSET $8`, [...args, pageSize, (page - 1) * pageSize]);
    return { orders: rows.rows.map(serializeOrder), total: count.rows[0].total as number, page, pageSize };
  });
}
export function exchangeDashboard(principal: Principal, tenantId: string) {
  return withDatabase(contextFor(principal, tenantId), async client => {
    const e = await resolveEntitlements(client, tenantId);
    const { configuration: s, catalog } = await readExchange(client, tenantId);
    const stats = await client.query("SELECT status,count(*)::int AS count FROM exchange_orders WHERE tenant_id=$1 AND request->>'product'='crypto_exchange' GROUP BY status", [tenantId]);
    const counts: Record<string, number> = Object.fromEntries(stats.rows.map(r => [r.status, r.count]));
    // Never sum different crypto units or claim simulated volume as real money.
    const volume = await client.query("SELECT request->>'sourceSymbol' AS symbol,sum((request->>'inputAmount')::numeric)::text AS amount FROM exchange_orders WHERE tenant_id=$1 AND request->>'product'='crypto_exchange' AND status NOT IN ('cancelled','failed') GROUP BY request->>'sourceSymbol'", [tenantId]);
    const recent = await client.query<OrderRow>("SELECT id,status,request,created_at FROM exchange_orders WHERE tenant_id=$1 AND request->>'product'='crypto_exchange' ORDER BY created_at DESC,id DESC LIMIT 8", [tenantId]);
    const enabledNetworks = s.networks.filter(n => n.enabled && n.available && catalog.some(c => c.assetNetworkId === n.assetNetworkId && s.assets.some(a => a.assetId === c.assetId && a.enabled)));
    const legacy = await client.query("SELECT exchange_enabled FROM tenant_configuration WHERE tenant_id=$1", [tenantId]);
    return { enabled: s.enabled && legacy.rows[0]?.exchange_enabled === true && e.features.crypto_exchange === true && e.features.website === true && e.tenantStatus === "active" && e.status === "active" && !e.overLimit, total: Object.values(counts).reduce((a, b) => a + b, 0),
      pending: counts.pending ?? 0, processing: counts.processing ?? 0, completed: counts.completed ?? 0, cancelled: counts.cancelled ?? 0, failed: counts.failed ?? 0,
      assets: s.assets.filter(a => a.enabled && catalog.some(c => c.assetId === a.assetId)).length,
      networks: new Set(enabledNetworks.map(n => catalog.find(c => c.assetNetworkId === n.assetNetworkId)!.networkId)).size,
      customers: 0, paymentMethods: s.paymentMethods.filter(m => m.enabled && (m.buy || m.sell)).length,
      routes: s.routes.filter(r => r.enabled).length, volume: volume.rows, recentOrders: recent.rows.map(serializeOrder) };
  });
}
export function exchangeCustomers(principal: Principal, tenantId: string) {
  return withDatabase(contextFor(principal, tenantId), async client => {
    // No identity is collected by the current sandbox. Never fabricate names, emails,
    // accounts or a count of unique people from anonymous order records.
    const r = await client.query("SELECT count(*)::int AS orders, max(COALESCE((request->'history'->-1->>'at')::timestamptz,created_at)) AS last FROM exchange_orders WHERE tenant_id=$1 AND request->>'product'='crypto_exchange'", [tenantId]);
    return r.rows[0].orders ? [{ id: "anonymous", name: "Anonymous sandbox visitors", email: null,
      orders: r.rows[0].orders as number, lastActivity: r.rows[0].last as Date, status: "unidentified" as const }] : [];
  });
}
export function exchangeAudit(principal: Principal, tenantId: string, page = 1) {
  return withDatabase(contextFor(principal, tenantId), async client => {
    const total = await client.query("SELECT count(*)::int AS n FROM audit_events WHERE tenant_id=$1", [tenantId]);
    const result = await client.query(
      `SELECT id,tenant_id AS "tenantId",event_type AS "eventType",description,actor_id AS "actorId",created_at AS "createdAt"
       FROM audit_events WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $2`, [tenantId, (page - 1) * 50]);
    return { events: result.rows, total: total.rows[0].n as number, page, pageSize: 50 };
  });
}
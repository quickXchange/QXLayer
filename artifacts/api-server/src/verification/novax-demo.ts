import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import type { Principal } from "../modules/authentication/service";
import { createTenant, getTenant, saveAssets, saveBrand, saveWebsiteSettings, saveDomain, saveConfiguration, activateTenant } from "../modules/tenants/service";
import { savePlan } from "../modules/entitlements/catalog";
import { createResource } from "../modules/entitlements/resources";
import { websiteSettings } from "../modules/website/settings";
import { exchangeConfiguration, sandboxQuote, sandboxOrder, tenantOrder } from "../products/exchange/service";
import { planFixture } from "./plans";
import { DEMO_SLUG, DEMO_PLAN_NAME, DEMO_USER_ID, DEMO_SEED_KEYS } from "../modules/demo/identity";
import { completeDemoRoutes } from "../modules/demo/routes";

if (process.env.NODE_ENV !== "development") throw new Error("Demo provisioning requires explicit development mode.");
const operator: Principal = { userId: "development-novax-provisioner", role: "super_admin", memberships: [] };
try {
  const existing = await pool.query("SELECT id,name,status FROM tenants WHERE slug=$1", [DEMO_SLUG]);
  if (existing.rowCount && existing.rows[0].name !== "NovaX Exchange") throw new Error("Demo slug belongs to another tenant; refusing changes.");
  if (existing.rowCount) {
    const protectedTenant = await pool.query(`SELECT
      EXISTS(SELECT 1 FROM white_label_requests WHERE tenant_id=$1)
      OR EXISTS(SELECT 1 FROM tenant_memberships WHERE tenant_id=$1 AND clerk_user_id<>$2) AS protected_customer`, [existing.rows[0].id, DEMO_USER_ID]);
    if (protectedTenant.rows[0].protected_customer) throw new Error("Refusing to repurpose a delivered or customer-assigned tenant.");
  }
  const assignments = await pool.query("SELECT tenant_id FROM tenant_memberships WHERE clerk_user_id=$1 UNION ALL SELECT NULL::uuid FROM platform_admins WHERE clerk_user_id=$1", [DEMO_USER_ID]);
  if (assignments.rows.some(r => r.tenant_id !== existing.rows[0]?.id)) throw new Error("Reserved demo identity has unexpected assignments; refusing changes.");
  if (existing.rows[0]?.status === "active") {
    await completeDemoRoutes(operator, existing.rows[0].id);
    console.log(JSON.stringify({ tenantId: existing.rows[0].id, slug: DEMO_SLUG, existing: true }));
  } else {
    const plan = planFixture(DEMO_PLAN_NAME, { website: true, crypto_exchange: true, swap: true, convert: true, buy: true, sell: true,
      api_keys: false, merchant_api: false, webhooks: false, crypto_payments: false });
    plan.description = "Dedicated development sandbox demonstration. No financial execution.";
    plan.billingLabel = "Sandbox demonstration · no billing";
    const quotas: Record<string, string> = { max_supported_assets: "3", max_supported_networks: "3", max_payment_methods: "2", max_staff: "1", max_api_keys: "0", max_webhooks: "0", max_monthly_transactions: "1000000", max_monthly_volume: "1000000000000" };
    plan.entitlements = plan.entitlements.map(e => typeof e.value === "boolean" ? e : { ...e, value: quotas[e.key] ?? e.value });
    const t = existing.rowCount ? await getTenant(operator, existing.rows[0].id) : await createTenant(operator, { name: "NovaX Exchange", slug: DEMO_SLUG, planId: (await savePlan(operator, plan)).id });
    await saveBrand(operator, t.id, { brandName: "NovaX Exchange", logoUrl: null, primaryColor: "#18263c", accentColor: "#5b7df6", themeMode: "system", defaultLanguage: "en", supportedLanguages: ["en"] });
    await saveDomain(operator, t.id, null);
    await saveConfiguration(operator, t.id, { environment: "sandbox", exchangeEnabled: true, paymentsEnabled: false, allowGuestCheckout: false });
    const ids = ["btc:bitcoin-testnet", "eth:ethereum-sepolia", "usdt:ethereum-sepolia"];
    const pairs = (await pool.query("SELECT c.id,c.asset_id,a.symbol FROM asset_network_catalog c JOIN asset_catalog a ON a.id=c.asset_id WHERE c.id=ANY($1::text[])", [ids])).rows;
    if (pairs.length !== 3) throw new Error("Expected sandbox asset/network catalog entries are missing.");
    await saveAssets(operator, t.id, ids);
    const methods = [randomUUID(), randomUUID()];
    const endpoints = { swap: [ids[0], ids[2]], convert: [ids[2], ids[1]], buy: ["fiat:USD", ids[0]], sell: [ids[1], "fiat:USD"] };
    const rates = { swap: "60000", convert: "0.000333333333333333", buy: "0.000016666666666666", sell: "3000" };
    await exchangeConfiguration(operator, t.id, {
      enabled: true, defaultAction: "swap", publicNote: "Sandbox Demo · Illustrative rates only. No real funds, wallets, payments or provider connections.",
      fiatCurrency: "USD", fiatPlanRate: "1", actions: { swap: true, convert: true, buy: true, sell: true },
      assets: pairs.map((p, i) => ({ assetId: p.asset_id, symbol: p.symbol, decimals: p.symbol === "USDT" ? 6 : 8, displayOrder: i, enabled: true, logoUrl: null, sandboxPlanRate: p.symbol === "BTC" ? "60000" : p.symbol === "ETH" ? "3000" : "1" })),
      networks: pairs.map(p => ({ assetNetworkId: p.id, enabled: true, available: true, minimum: "0.00001", maximum: "100000", fee: "0", information: "Sandbox test network. No deposit addresses or blockchain execution." })),
      routes: (["swap", "convert", "buy", "sell"] as const).map(action => ({ id: randomUUID(), action, source: endpoints[action][0], destination: endpoints[action][1],
        enabled: true, rate: rates[action], minimum: action === "buy" ? "20" : action === "convert" ? "25" : "0.0001",
        maximum: action === "buy" ? "5000" : action === "convert" ? "10000" : "10", feeBps: 35, spreadBps: 50, fixedFee: "0",
        paymentMethodIds: ["buy", "sell"].includes(action) ? methods : [] })),
      paymentMethods: methods.map((id, i) => ({ id, label: i ? "Sandbox card simulation" : "Sandbox bank transfer", currency: "USD", enabled: true, buy: true, sell: true })),
    });
    await saveWebsiteSettings(operator, t.id, websiteSettings("NovaX Exchange", {
      sandboxLabel: "Sandbox Demo",
      heroTitle: "Your next exchange starts here.",
      heroSubtitle: "Swap, convert, buy and sell in the NovaX sandbox. Explore a fully configured exchange without moving real funds.",
      footerText: "NovaX Exchange · Sandbox Demo. No funds, wallets, blockchain transactions or real payments.",
      supportDetails: "Public sandbox demonstration. Do not send funds or enter personal/payment credentials.",
      termsContent: "Sandbox Demo only. All rates, orders and payment methods are simulations. No funds are accepted or transferred.",
      privacyContent: "This sandbox does not require customer registration. Do not enter personal information or real financial credentials.",
      faq: [{ question: "Are these real transactions?", answer: "No. NovaX is a Sandbox Demo with simulated orders and illustrative pricing." },
        { question: "Can I track an order?", answer: "Yes. Create a sandbox order, then open its private tracking link. No login is required." }],
    }));
    if (!assignments.rowCount) await createResource(operator, t.id, "staff", { label: "NovaX public read-only demo", reference: DEMO_USER_ID });
    await activateTenant(operator, t.id);
    for (const [i, action] of (["swap", "convert", "buy", "sell"] as const).entries()) {
      const q = await sandboxQuote(DEMO_SLUG, { action, source: endpoints[action][0], destination: endpoints[action][1],
        amount: action === "buy" ? "250" : action === "convert" ? "300" : "0.025", ...(["buy", "sell"].includes(action) ? { paymentMethodId: methods[0] } : {}) });
      const order = await sandboxOrder(DEMO_SLUG, { quoteToken: q.token, idempotencyKey: DEMO_SEED_KEYS[i] });
      if (i === 0) {
        await tenantOrder(operator, t.id, order.order.id, { status: "processing", note: "Sandbox simulation in progress." });
        await tenantOrder(operator, t.id, order.order.id, { status: "completed", note: "Sandbox simulation complete. No real funds moved." });
      } else if (i === 1) await tenantOrder(operator, t.id, order.order.id, { status: "processing", note: "Simulated conversion processing." });
      else if (i === 3) await tenantOrder(operator, t.id, order.order.id, { status: "cancelled", note: "Example cancelled sandbox order." });
    }
    await completeDemoRoutes(operator, t.id);
    console.log(JSON.stringify({ tenantId: t.id, slug: DEMO_SLUG, sandboxOnly: true, readOnlyDemo: true }));
  }
} finally { await pool.end(); }

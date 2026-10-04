import { pool } from "@workspace/db";
import { randomUUID } from "node:crypto";
import type { Principal } from "../modules/authentication/service";
import { createTenant, getTenant, saveAssets, saveBrand, saveDomain, saveWebsiteSettings, activateTenant } from "../modules/tenants/service";
import { savePlan } from "../modules/entitlements/catalog";
import { websiteSettings } from "../modules/website/settings";
import { exchangeConfiguration, sandboxQuote, sandboxOrder } from "../products/exchange/service";
import { planFixture } from "./plans";

// Explicit development-only sample, never called during startup or deployment.
// Manual illustrative rates are persisted configuration, NOT market prices.
if (process.env.NODE_ENV === "production") throw new Error("Development sample refused in production.");
const operator: Principal = { userId: "development-exchange-sample", role: "super_admin", memberships: [] };
const slug = "exchange-sandbox";
try {
  const existing = await pool.query("SELECT id,status,name FROM tenants WHERE slug=$1", [slug]);
  if (existing.rowCount && existing.rows[0].name !== "White Label Exchange Sandbox") throw new Error("This sample slug belongs to another client; refusing changes.");
  if (existing.rowCount && existing.rows[0].status === "active") {
    console.log(JSON.stringify({ tenantId: existing.rows[0].id, slug, existing: true }));
  } else {
    const fixture = planFixture("White Label Exchange Sandbox Demo", { website: true, crypto_exchange: true, swap: true, convert: true, buy: true, sell: true, merchant_api: true, api_keys: true });
    const quota: Record<string, string> = { max_supported_assets: "10", max_supported_networks: "10", max_payment_methods: "5", max_staff: "5", max_api_keys: "5", max_webhooks: "0", max_monthly_transactions: "1000", max_monthly_volume: "1000000" };
    fixture.entitlements = fixture.entitlements.map(e => typeof e.value === "boolean" ? e : { ...e, value: quota[e.key] });
    const tenant = existing.rowCount ? await getTenant(operator, existing.rows[0].id) : await createTenant(operator, { name: "White Label Exchange Sandbox", slug, planId: (await savePlan(operator, fixture)).id });
    await saveBrand(operator, tenant.id, { brandName: "Exchange Sandbox", logoUrl: null, primaryColor: "#102C36", accentColor: "#44D7C4", themeMode: "system", defaultLanguage: "en", supportedLanguages: ["en"] });
    await saveDomain(operator, tenant.id, null);
    const pairs = (await pool.query("SELECT c.id,c.asset_id,a.symbol FROM asset_network_catalog c JOIN asset_catalog a ON a.id=c.asset_id WHERE c.id=ANY($1::text[]) ORDER BY a.symbol", [["btc:bitcoin-testnet", "eth:ethereum-sepolia"]])).rows;
    if (pairs.length !== 2) throw new Error("The expected BTC and ETH sandbox catalog selections are missing.");
    await saveAssets(operator, tenant.id, pairs.map(p => p.id));
    const btc = pairs.find(p => p.symbol === "BTC")!.id, eth = pairs.find(p => p.symbol === "ETH")!.id, method = randomUUID();
    await exchangeConfiguration(operator, tenant.id, {
      enabled: true, defaultAction: "swap", publicNote: "Development demonstration with manually configured illustrative sandbox rates. These are not live market prices.",
      fiatCurrency: "USD", fiatPlanRate: "1", actions: { swap: true, convert: true, buy: true, sell: true },
      assets: pairs.map((p, i) => ({ assetId: p.asset_id, symbol: p.symbol, decimals: 8, displayOrder: i, enabled: true, logoUrl: null, sandboxPlanRate: p.symbol === "BTC" ? "60000" : "3000" })),
      networks: pairs.map(p => ({ assetNetworkId: p.id, enabled: true, available: true, minimum: "0.00001", maximum: "100", fee: p.symbol === "BTC" ? "0.00001" : "0.0001", information: "Simulation only. No blockchain monitoring or deposit addresses." })),
      routes: (["swap", "convert", "buy", "sell"] as const).map(action => ({
        id: randomUUID(), action, source: action === "buy" ? "fiat:USD" : btc, destination: action === "sell" ? "fiat:USD" : eth,
        enabled: true, rate: action === "buy" ? "0.000333333333333333" : action === "sell" ? "60000" : "20",
        minimum: action === "buy" ? "10" : "0.0001", maximum: action === "buy" ? "100000" : "10",
        feeBps: 25, spreadBps: 50, fixedFee: "0", paymentMethodIds: ["buy", "sell"].includes(action) ? [method] : [],
      })),
      paymentMethods: [{ id: method, label: "Simulated bank transfer", currency: "USD", enabled: true, buy: true, sell: true }],
    });
    await saveWebsiteSettings(operator, tenant.id, websiteSettings("Exchange Sandbox", {
      heroTitle: "Your exchange. Your identity.", heroSubtitle: "A working White Label Exchange sandbox. Test Swap, Convert, Buy and Sell with manually configured demo rates—never real funds.",
      footerText: "Sandbox only. Demo rates are illustrative, not market quotes. No funds, wallets, payments or blockchain execution.",
    }));
    await activateTenant(operator, tenant.id);
    for (const action of ["swap", "convert", "buy", "sell"] as const) {
      const quote = await sandboxQuote(slug, { action, source: action === "buy" ? "fiat:USD" : btc, destination: action === "sell" ? "fiat:USD" : eth, amount: action === "buy" ? "100" : "0.01", ...(["buy", "sell"].includes(action) ? { paymentMethodId: method } : {}) });
      await sandboxOrder(slug, { quoteToken: quote.token, idempotencyKey: randomUUID() });
    }
    console.log(JSON.stringify({ tenantId: tenant.id, slug, manualDemoRates: true }));
  }
} finally { await pool.end(); }
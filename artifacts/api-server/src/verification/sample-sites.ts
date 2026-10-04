import { pool } from "@workspace/db";
import type { Principal } from "../modules/authentication/service";
import { savePlan, saveAddon } from "../modules/entitlements/catalog";
import { setTenantAddons, setTenantOverrides } from "../modules/entitlements/subscriptions";
import { activateTenant, createTenant, saveAssets, saveBrand, saveConfiguration, saveDomain, saveWebsiteSettings } from "../modules/tenants/service";
import { websiteSettings } from "../modules/website/settings";
import { planFixture } from "./plans";

// Explicit development demonstration, NEVER startup seed or a published migration.
// This actor is not a Clerk identity and receives no persisted administrator role.
if (process.env.NODE_ENV === "production") throw new Error("Sandbox samples refused in production.");
const operator: Principal = { userId: "development-sample-setup", role: "super_admin", memberships: [] };
const samples = [
  { slug: "aster-sandbox", name: "Aster Sandbox", planName: "Sample Plan A", primary: "#146E68", accent: "#A06C30", secondary: "#16423E", theme: "light" as const, font: "manrope" as const,
    title: "Your exchange. Your identity.", subtitle: "Aster's private-label sandbox demonstrates an exchange website with Swap enabled. All product execution remains deferred.",
    features: { website: true, crypto_exchange: true, swap: true, convert: false, buy: false, sell: false, crypto_payments: false, merchant_api: false, api_keys: false, webhooks: false },
    pairs: ["eth:ethereum-sepolia"] },
  { slug: "nexa-sandbox", name: "Nexa Sandbox", planName: "Sample Plan B", primary: "#8C70ED", accent: "#E7B16B", secondary: "#292344", theme: "dark" as const, font: "space-grotesk" as const,
    title: "A different brand. More capabilities.", subtitle: "Nexa's sandbox demonstrates Convert, payment and developer entitlements on the same shared template. No payments or wallet connections are available.",
    features: { website: true, crypto_exchange: true, swap: false, convert: true, buy: false, sell: false, crypto_payments: true, merchant_api: true, api_keys: true, webhooks: true },
    pairs: ["btc:bitcoin-testnet", "eth:ethereum-sepolia", "usdt:bsc-testnet"] },
];
try {
  for (const [i, sample] of samples.entries()) {
    const existing = await pool.query("SELECT id FROM tenants WHERE slug=$1", [sample.slug]);
    if (existing.rowCount) { process.stdout.write(`${sample.slug}: existing tenant left unchanged.\n`); continue; }
    const input = planFixture(sample.planName, sample.features);
    input.description = "Development phase demonstration only. Editable database plan, not a built-in tier.";
    input.billingLabel = "Sandbox demonstration · no billing";
    input.displayOrder = i;
    input.entitlements = input.entitlements.map((e) => e.key.startsWith("max_")
      ? { ...e, value: e.key === "max_monthly_volume" ? (i ? "10000" : "1000") : e.key === "max_monthly_transactions" ? (i ? "100" : "10") : (i ? "3" : "1") }
      : e);
    const plan = await savePlan(operator, input);
    const tenant = await createTenant(operator, { name: sample.name, slug: sample.slug, planId: plan.id });
    await saveBrand(operator, tenant.id, { brandName: sample.name, logoUrl: null, primaryColor: sample.primary, accentColor: sample.accent, themeMode: sample.theme, defaultLanguage: "en", supportedLanguages: ["en"] });
    await saveDomain(operator, tenant.id, `${sample.slug}.example`);
    await saveWebsiteSettings(operator, tenant.id, { ...websiteSettings(sample.name, {}),
      secondaryColor: sample.secondary, fontKey: sample.font, heroTitle: sample.title, heroSubtitle: sample.subtitle,
      supportDetails: `${sample.name} demonstration support. This is not a live financial service.`,
      footerText: `${sample.name} · Development demonstration only. No live exchange, payments or blockchain connections.`,
      termsContent: `${sample.name}: This website is a sandbox demonstration. All transaction execution is deferred. Do not send funds or submit wallet credentials.`,
      privacyContent: `${sample.name}: No end-user financial transaction or wallet data is collected by this sandbox website. Operator authentication uses the separate administration console.`,
    });
    await saveAssets(operator, tenant.id, sample.pairs);
    await saveConfiguration(operator, tenant.id, { environment: "sandbox", exchangeEnabled: true, paymentsEnabled: i === 1, allowGuestCheckout: false });
    if (i === 0) await setTenantOverrides(operator, tenant.id, [{ key: "max_staff", value: "2", reason: "Development demonstration: tenant-only limit replacement" }]);
    else {
      const addon = await saveAddon(operator, { name: "Sample developer capacity add-on", description: "Development demonstration only", enabled: true, entitlements: [{ key: "max_api_keys", value: "1" }] });
      await setTenantAddons(operator, tenant.id, [addon.id]);
    }
    await activateTenant(operator, tenant.id);
    process.stdout.write(`${sample.slug}: sandbox tenant on ${sample.planName} created. No administrator membership assigned.\n`);
  }
} finally { await pool.end(); }
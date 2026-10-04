import { pool } from "@workspace/db";
import { getTenant, saveBrand, saveWebsiteSettings } from "../modules/tenants/service";
import type { Principal } from "../modules/authentication/service";
if (process.env.NODE_ENV === "production") throw new Error("Development-only sample styling.");
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error("Development domain required for sample brand assets.");
const operator: Principal = { userId: "development-sample-styling", role: "super_admin", memberships: [] };
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}/private-label-website/brands`;
const identities = [
  { slug: "aster-sandbox", name: "Aster Sandbox", mark: "aster-mark.svg", primary: "#146E68", accent: "#9A6630", secondary: "#113831", glow: "#4CA99A", font: "manrope" as const, theme: "light" as const, surface: "solid" as const, radius: "sharp" as const,
    title: "Your next move.\nA clearer direction.",
    subtitle: "A focused digital-asset experience, designed around clarity. Explore Aster's configured Swap interface in a safe, non-executing sandbox.",
    faq: [
      { question: "Can I move funds through Aster Sandbox?", answer: "No. This is a configuration and interface sandbox. Quotes, transactions, deposits and wallet connections are not available." },
      { question: "Which assets and networks can I explore?", answer: "Only the asset/network combinations shown on this website are configured for Aster. The current configuration has one pair, so a two-asset exchange cannot be prepared." },
      { question: "Are crypto payments available here?", answer: "No. Aster's current subscription includes the exchange and Swap capabilities, not crypto payments or merchant API capabilities." },
    ] },
  { slug: "nexa-sandbox", name: "Nexa Sandbox", mark: "nexa-mark.svg", primary: "#8C70ED", accent: "#80D6D4", secondary: "#171F38", glow: "#9D7DF9", font: "space-grotesk" as const, theme: "dark" as const, surface: "glass" as const, radius: "rounded" as const,
    title: "Digital finance.\nDistinctly yours.",
    subtitle: "A connected experience for conversion, payment configuration and merchant capabilities. Discover Nexa in non-executing test mode, without moving real funds.",
    faq: [
      { question: "Does selecting Convert execute a trade?", answer: "No. You can explore configured assets and enter amounts, but rates, fees and transaction execution depend on a financial engine that remains deferred." },
      { question: "Can I use the payment links or QR previews?", answer: "The payment section is a product illustration only. No payable payment links, scannable funding addresses or live payment collection are created." },
      { question: "Are the developer features connected?", answer: "Merchant API, sandbox key and webhook entitlements are configured. Product execution, webhook delivery and live integrations are not connected." },
      { question: "Where can I read Nexa's sandbox terms?", answer: "Use the Terms and Privacy links in the footer. They show Nexa's configured legal text, separate from any other tenant's website." },
    ] },
];
try {
  for (const identity of identities) {
    const row = await pool.query("SELECT id,name FROM tenants WHERE slug=$1", [identity.slug]);
    if (!row.rowCount || row.rows[0].name !== identity.name) throw new Error(`Expected existing ${identity.name} demonstration; no other tenant will be changed.`);
    const tenant = await getTenant(operator, row.rows[0].id);
    const logoUrl = `${origin}/${identity.mark}`;
    await saveBrand(operator, tenant.id, { brandName: tenant.brandName, logoUrl, primaryColor: identity.primary, accentColor: identity.accent, themeMode: identity.theme, defaultLanguage: tenant.defaultLanguage, supportedLanguages: tenant.supportedLanguages });
    await saveWebsiteSettings(operator, tenant.id, { ...tenant.websiteSettings, faviconUrl: logoUrl, secondaryColor: identity.secondary, glowColor: identity.glow,
      fontKey: identity.font, surfaceStyle: identity.surface, borderRadius: identity.radius, heroTitle: identity.title, heroSubtitle: identity.subtitle, faq: identity.faq });
    process.stdout.write(`${identity.name}: configured original logo, favicon, palette/glow, font, surfaces, radius and FAQ. Subscription/resources unchanged.\n`);
  }
} finally { await pool.end(); }
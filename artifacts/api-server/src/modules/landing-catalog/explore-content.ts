import type { LandingProductInput } from "./service";
import { HttpError } from "../../lib/errors";
type ProductExploreContent = NonNullable<LandingProductInput["explore"]>;

const point = (title: string, body: string) => ({ title, body });
type Profile = { headline: string; focus: string; features: string[]; audience: string[]; integration: string[] };
const profiles: Record<string, Profile> = {
  crypto_exchange: { headline: "Your brand. Your exchange. One powerful foundation.", focus: "a branded exchange customer journey", features: ["Swap / Convert / Buy & Sell", "Branded customer website", "Operator Admin Panel", "Order tracking & invoices", "Plan-controlled service access", "Customer reviews"], audience: ["Exchange entrepreneurs", "OTC & regional operators", "Fintech communities"], integration: ["Quickex · licensed configuration", "WhiteBIT · licensed configuration", "Operator-managed payment methods"] },
  crypto_payments: { headline: "A better checkout starts with your brand.", focus: "a merchant-first crypto payment experience", features: ["Branded payment checkout", "Invoice lifecycle", "Merchant workspace", "Settlement preferences", "Payment event design", "Customer receipts"], audience: ["Online merchants", "SaaS platforms", "Marketplaces"], integration: ["Merchant API concept", "Checkout integrations", "Payment event webhooks"] },
  crypto_card: { headline: "A card experience that belongs to your brand.", focus: "a branded cardholder experience", features: ["Virtual card concept", "Cardholder app", "Spending controls", "Transaction timeline", "Card design", "Program administration"], audience: ["Fintech teams", "Wallet brands", "Member communities"], integration: ["Future issuing partner", "Cardholder identity workflows", "Future wallet integration"] },
  crypto_engine: { headline: "One orchestration layer. A connected ecosystem.", focus: "a modular infrastructure control plane", features: ["Service orchestration", "Routing policies", "Provider boundaries", "Event observability", "Tenant configuration", "Execution safeguards"], audience: ["Platform builders", "Infrastructure teams", "Multi-product operators"], integration: ["Product registry", "Scoped provider adapters", "Future event pipelines"] },
  ios_app: { headline: "Your ecosystem. Beautifully at home on iPhone.", focus: "a native iOS customer experience", features: ["Branded app shell", "Native navigation", "Customer account design", "Order activity", "Notification concept", "Accessible mobile flows"], audience: ["Exchange brands", "Fintech startups", "Membership platforms"], integration: ["Shared account architecture", "Future iOS notifications", "App Store release planning"] },
  android_app: { headline: "Your brand, ready for an Android-first audience.", focus: "an Android customer experience", features: ["Adaptive mobile interface", "Branded home screen", "Account journeys", "Activity tracking", "Notification concept", "Device-friendly layouts"], audience: ["Mobile-first brands", "Regional operators", "Growing communities"], integration: ["Shared platform configuration", "Future Android notifications", "Google Play release planning"] },
  staking: { headline: "Design a clearer staking experience.", focus: "a transparent staking interface", features: ["Validator discovery concept", "Position overview", "Reward schedule design", "Unstaking journey", "Risk disclosures", "Developer API concept"], audience: ["Wallet builders", "Validator communities", "Infrastructure teams"], integration: ["Future validator adapters", "Operator-controlled chain access", "Future position API"] },
  earn: { headline: "An earn experience built around clarity.", focus: "a responsible earning-product interface", features: ["Product discovery", "Position summaries", "Term visibility", "Risk-first disclosures", "Activity statements", "API-first design"], audience: ["Fintech builders", "Wallet platforms", "Digital asset teams"], integration: ["Future product adapters", "Risk disclosure workflows", "Future position reporting"] },
  dex: { headline: "A decentralized interface. An unmistakable brand.", focus: "a branded decentralized-trading concept", features: ["Token pair discovery", "Swap interface concept", "Route comparison", "Liquidity views", "Slippage controls", "Transaction review"], audience: ["Web3 communities", "Wallet builders", "Trading-interface teams"], integration: ["Future wallet connectors", "Future liquidity routing", "Operator-managed RPC configuration"] },
  articles: { headline: "Give your ecosystem a voice.", focus: "a branded knowledge and publishing experience", features: ["Editorial workspace concept", "Article collections", "Learning paths", "Author profiles", "Content discovery", "Brand-consistent publishing"], audience: ["Education teams", "Exchange brands", "Community publishers"], integration: ["Future content API", "Brand website", "Future editorial workflows"] },
  telegram_bot: { headline: "Meet your customers in the conversation.", focus: "a branded Telegram conversational experience", features: ["Guided conversation", "Service discovery", "Account handoff", "Order update concept", "Command navigation", "Operator-controlled access"], audience: ["Telegram communities", "Exchange brands", "Support teams"], integration: ["Future Telegram Bot API", "Shared tenant entitlements", "Future notification adapter"] },
  telegram_mini_app: { headline: "A complete brand experience, inside Telegram.", focus: "a compact Telegram Mini App", features: ["Mini App home", "Branded service navigation", "Account handoff", "Order journey design", "Mobile-first interactions", "Shared plan access"], audience: ["Community founders", "Exchange operators", "Mobile-first teams"], integration: ["Future Telegram Web App SDK", "Shared customer architecture", "Tenant brand configuration"] },
  whatsapp_bot: { headline: "Bring your service closer to the conversation.", focus: "a branded WhatsApp customer touchpoint", features: ["Guided service menus", "Customer support handoff", "Order notification concept", "Consent-aware messaging", "Account linking design", "Brand tone controls"], audience: ["Regional operators", "Customer service teams", "Community brands"], integration: ["Future WhatsApp Business provider", "Consent workflows", "Future notification adapter"] },
  rpc_nodes: { headline: "The infrastructure layer stays under your control.", focus: "an operator-managed blockchain connectivity workspace", features: ["Node inventory concept", "Network visibility", "Endpoint access policies", "Health presentation", "Usage reporting design", "Central credential custody"], audience: ["Infrastructure operators", "Protocol teams", "Platform administrators"], integration: ["Future node providers", "Super Admin endpoint custody", "Future network monitoring"] },
  cloud_mining: { headline: "A clearer view of a future mining workspace.", focus: "a transparent mining-product concept", features: ["Capacity overview concept", "Hardware allocation design", "Activity reporting", "Contract disclosure", "Operator controls", "Risk visibility"], audience: ["Infrastructure teams", "Mining operators", "Reporting platforms"], integration: ["Future hardware telemetry", "Operator-managed infrastructure", "Future reporting API"] },
};

/** Defaults are editable presentation, never execution or entitlement declarations. */
export function defaultExploreContent(key: string, name: string, description: string): ProductExploreContent {
  const p = profiles[key] ?? { headline: `Build ${name} around your brand.`, focus: `${name.toLowerCase()} in your ecosystem`, features: ["Brand presentation", "Shared tenant foundation", "Controlled service access", "Customer journey design"], audience: ["Platform builders", "Growing brands", "Product teams"], integration: ["Shared product registry", "Plan entitlements", "Future reviewed adapters"] };
  const exchange = key === "crypto_exchange";
  return {
    eyebrow: exchange ? "THE WHITE LABEL EXCHANGE" : "THE VYNOX LAYER ECOSYSTEM",
    headline: p.headline, summary: description, heroImageUrl: "",
    customerExperience: exchange
      ? "A customer arrives on your branded domain, chooses an enabled exchange action, reviews a sandbox quote, creates an illustrative order and follows its status through payment instructions, completion and a branded invoice. This preview never moves funds."
      : `Explore ${p.focus} with your identity, consistent navigation and clear service states. These interface previews describe a planned experience, not a delivered live service.`,
    features: p.features.map(title => point(title, exchange ? `${title} is presented in the branded Exchange sandbox. Availability is governed by the assigned plan and operator configuration; live financial execution remains disabled.` : `${title} is part of the planned ${name} experience. The interface is illustrative; delivery and integration are subject to implementation and operator review.`)),
    benefits: [
      point("One recognizable brand", `Present ${p.focus} with a consistent identity instead of disconnected tools.`),
      point("A shared foundation", "Reuse the product registry, customer accounts and tenant-scoped configuration rather than creating separate customer databases."),
      point("Clear commercial boundaries", "Plan-controlled modules, explicit readiness labels and operator-reviewed pricing keep expectations clear."),
    ],
    steps: [
      point("Explore the experience", `Review the ${name} interface previews, intended capabilities and current readiness.`),
      point("Define your configuration", "Choose your brand identity and review which modules, limits and integrations your plan should include."),
      point("Review with the operator", exchange ? "Submit the existing White Label Exchange request. Pricing, payment verification and delivery remain operator-controlled." : "Discuss delivery scope with the operator. This planned service cannot currently be bought or activated."),
      point("Receive what is approved", exchange ? "The operator prepares the sandbox and delivers the authorized Admin Panel to your existing account." : "A future implementation must be reviewed and explicitly released before operational access can be delivered."),
    ],
    integrations: p.integration.map(title => point(title, key === "rpc_nodes" || title.toLowerCase().includes("rpc") ? "Infrastructure endpoints and master credentials are controlled by Super Admin only. No live node access is advertised." : "Configuration and licensing are not proof of an active connection. Availability depends on implemented adapters, assigned entitlements and operator approval.")),
    useCases: p.audience.map(title => point(title, `Explore how ${p.focus} could fit your customer experience, with your brand and operator-defined service scope.`)),
    faqs: [
      { question: "Is this service operational today?", answer: exchange ? "The White Label Exchange is a non-executing sandbox. It demonstrates the customer and administration journeys; no live exchange, payout or blockchain execution is enabled." : `${name} is Coming Soon. Screens and descriptions are product previews, not a promise of an operational service or a purchasable integration.` },
      { question: "Can I use my own logo, colors and domain?", answer: "White Label configuration separates each customer's brand from VYNOX LAYER. The examples on this page are illustrative. Domain verification and delivery still follow operator review." },
      { question: "Who controls plans and integration access?", answer: "Super Admin manages existing plans, feature entitlements, limits, add-ons and service availability. RPC infrastructure and master credentials remain Super Admin only." },
      { question: "How do pricing and ordering work?", answer: "Approved offers come from the published pricing snapshot. Unpublished proposals are not purchasable. A verified payment method and operator approval are required; a preview does not start a subscription." },
    ],
    gallery: [],
    ...(exchange ? { landingHeadline: "One layer for every crypto product you brand.",
      landingSummary: "Exchange, payments, cards, staking, nodes, bots and apps on a single white-label foundation. Explore your future ecosystem through distinctive product previews, with service readiness clearly stated.",
      pricingTiers: [{ label: "Basic", planId: null }, { label: "Premium", planId: null }, { label: "Pro", planId: null }] } : {}),
  };
}

export function assertPublicArtworkUrl(value: string) {
  if (!value) return;
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(400, "Artwork must use a public HTTPS URL."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || host === "localhost" ||
    host.endsWith(".local") || host.endsWith(".internal") || host.includes(":") ||
    /^(127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))
    throw new HttpError(400, "Use public HTTPS artwork without credentials or private network addresses.");
}

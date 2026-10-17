# Premium marketplace editing and safety

The public landing page and `/products/:productKey` reuse the existing product
registry and `landing_products`. No new catalog, tenant database, price store,
execution adapter, or authentication system is introduced.

## Super Admin

Use **Landing products → Edit** for names, card descriptions, status, visibility,
order and existing marketing fields. **Explore content** edits the page hero,
introduction, public artwork URLs, feature/benefit lists, How It Works,
integrations, customer experience, use cases, gallery and FAQ. Lists can be
added, removed and reordered. Empty artwork uses the product-specific authored
interface; public HTTPS artwork overrides appear on the card and detail page.

The public content is isolated in the existing registry's
`definition.publicMarketing` namespace. Reads explicitly project that namespace;
runtime feature definitions and private provider configuration are not returned.
Only Super Admin may update it, using the existing transaction-scoped RLS context.

Exchange's **Pricing tiers** selects three existing plans and editable display
labels. Initial Development references use the existing unapproved EUR plans:
Basic €39/month, Premium €99/month, Pro €249/month. No existing plan or price was
changed. These are preliminary proposals, not commercial offers.

Edit actual plan prices, limits, feature entitlements and modules in **Plans**;
use existing add-on controls for optional additions. Publish reviewed pricing
through the existing publication panel. A published snapshot always supersedes
proposals, and draft price changes never silently alter an existing publication.
Only disabled, unconfigured EUR plans explicitly referenced by the CMS are
eligible for the non-purchasable preliminary preview.

The cards show actual published offers after publication, and Get Started keeps
the selected public plan through the existing request configuration route.
Provisional Get Started creates an account only; it cannot create a purchase.
Approved payment configuration and matching currency remain required.

## Availability and future products

Exchange is a non-executing sandbox. Other services are Coming Soon / Preview.
Product status does not grant runtime access. Selecting a module on a plan is
not evidence that a provider, node or financial engine is connected. RPC endpoints
and master credentials remain Super Admin only.

New product registrations receive an initially hidden, editable marketing entry
and the shared Explore template. Super Admin must explicitly make them visible.
Unknown or hidden product URLs do not render a different product's page.

All branding, order, payment, invoice, timeline and review examples are local
illustrations. Logo files in the branding demonstration stay in browser memory
and are not uploaded. They do not modify a tenant's brand, order or configuration.

Development changes are not a public release. No Production data, deployed
services, DNS, worker state or financial execution was changed for this upgrade.

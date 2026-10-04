# Main platform product catalog

This is the platform's public marketing surface, not a tenant website or an executing financial product. The main platform preview and public root `/` open the landing page for both signed-out and signed-in visitors. Operators use `/admin` for administration and `/catalog-preview` for the protected preview. Super Admins edit it at `/landing-products` through the **Landing catalog** console navigation.

The preview destinations are labeled **QXLayer Main Platform** and **White Label Client Sites**. Tenant sites retain `/private-label-website/{slug}`. The client-site root `/private-label-website/` forwards to the main landing page; its Site Finder is only a sandbox/development utility at `/private-label-website/sandbox/site-finder`. The landing page's sandbox Live Demo link opens the existing `/private-label-website/nexa-sandbox` tenant, without enabling live execution.

## Presentation

The platform landing page reuses the pre-catalog customer website's actual hero, shell, Exchange widget, atmosphere, styles and theme implementation. It does not use the replacement beige/green catalog layout. Products, prices and the ecosystem map are additional below-hero sections in the approved visual language.

The user's original website recording is the master visual reference. The matching saved hero composition keeps title, subtitle and actions together before the widget on stacked layouts, with the original two-column desktop composition. Floating decorative crypto coins extend the original lighting and network atmosphere.

Catalog artwork is selected by immutable product key, independent of editable icons. Thirteen major products each have a large alternating showcase with layered dashboard/interface compositions; only secondary products use smaller cards. Mobile presents product copy, pricing and CTA before the visual. Each product appears once, in database display order, including consecutive secondary groups. Public product-index links point to each showcase or secondary card.

Showcases use compact rows with a three-line description excerpt; full descriptions and readiness notes remain in the detail modal. Pricing and configured setup fees are inline alongside the CTA, not inside large pricing boxes. Mobile renders are capped at 280px high. BTC, ETH, USDT, USDC, SOL and BNB marks are illustrative marketing examples only, not live asset-support claims. Desktop floating layers, card tilt, reflections and network motion are reduced on mobile/coarse pointers and disabled with reduced-motion preferences.

Preview scenes combine static HTML/CSS interfaces, card/phone materials and schematic infrastructure. They are visibly labeled illustrative and planned/unimplemented or sandbox-not-live, and contain no real balances, quotes, yields or executing services. Product-specific lighting stays within the original purple/teal palette. Pointer parallax, touch glow and floating layers respect reduced motion.

Platform branding is presentation-only and is not a tenant or an entitlement configuration. The platform Exchange form has no configured assets, quote source or enabled transaction execution; its original controls and rate rows remain visible with unavailable rates and a disabled submission button. Existing tenant pages retain their own branding, configured assets, capabilities and original empty-state behavior. No platform catalog is added to tenant pages.

This restoration edited current frontend source directly. It did not restore a checkpoint, roll back the project, change backend code or modify catalog records or migrations.

## Content and pricing

All sixteen products are stored in `landing_products` and read from `/api/public/product-catalog`. Product names, descriptions, icons, starting prices, optional setup fees, three-letter currencies, billing periods, availability labels, CTA labels, visibility and ordering are database-backed. Only visible rows reach the public API. The editor includes hidden rows.

Initial prices and setup fees are null because no approved amounts were supplied. Null prices display “Pricing on request”; this is not zero or a fabricated quote. Numeric amounts are exact decimal strings, up to two decimal places. Billing periods support monthly, yearly, one-time and on-request. No payment checkout, invoicing or automatic billing is introduced.

Icons use a safe, editable preset library, not executable SVG/HTML uploads. Product keys are stable registry references. Featured visual treatments use these keys; changing marketing copy does not change identity or execution.

## Safety boundaries

The catalog is independent of Plans, Add-ons, tenant subscriptions and entitlements. Showing a product, editing its price or setting its commercial status to “Available” does not grant access or activate implementation.

Execution readiness is server-owned, excluded from admin inputs, and shown independently of the editable marketing status. Exchange is a non-executing sandbox; all other listed products remain planned/unimplemented. Product CTAs expose actual catalog information and readiness notices, not fake financial demos or dashboards. Ecosystem connections are conceptual, not live activity.

Admin mutations require verified authentication, Super Admin authorization and same-origin checks. They run under the existing restricted NOBYPASSRLS role, are audited atomically, and are additionally protected by FORCE RLS. Public SELECT can only see visible products. Hidden rows and all writes require Super Admin context.

## Development installation and verification

```sh
pnpm --filter @workspace/scripts run catalog:upgrade:dev
pnpm run typecheck
pnpm --filter @workspace/api-server run verify:catalog
pnpm --filter @workspace/api-server run verify:foundation
```

The additive upgrade inserts initial products only when absent; rerunning it preserves edits and does not change tenants, plans, add-ons or registry manifests. The permission helper reapplies explicit catalog RLS predicates after schema pushes.

No automatic startup migration or production setup is included. Nothing is published, no live service integrations are added, and QuickXchange remains untouched.

## Verification performed

- Workspace typecheck and frontend production bundle build passed. The standalone bundle command needs the artifact's configured `PORT` and `BASE_PATH`, which managed workflows normally provide. Existing bundle-size and source-map warnings are non-blocking.
- Catalog verification passed for exact decimal pricing/setup fees, currency/billing persistence, public projection, hidden-row RLS, rejection of non-Super-Admin edits, validation, immutable readiness and transactional audit.
- Existing foundation verification passed: entitlement resolution, tenant isolation, quotas/concurrency, scoped roles, domain ownership and all existing safeguards. There are now 30 FORCE RLS tables including the marketing catalog.
- A signed-in browser pass used only a disposable catalog fixture and operator grant. It verified all editable fields across save/reload, public pricing/CTA details, fixed planned-service notices despite editable Available status, hide/show persistence and negative-price rejection.
- Dark mode persisted across reload; the 390px page and dialog had no horizontal overflow. Desktop and mobile public-page captures were inspected. Temporary catalog/module/operator/audit rows were removed; no existing products, tenants or plans were edited.
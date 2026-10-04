# Shared customer website

## Scope and architecture

The existing `private-label-website` artifact is the only customer frontend.
There are no Aster/Nexa component branches or tenant forks. Brand values and
effective capability flags come from `GET /api/public/sites/:slug`.
Administration screens, plans, limits, add-ons, overrides and RLS were not redesigned.
No database schema migration was needed; additional settings use existing branding JSON.

The original visual system uses layered brand-tinted surfaces, SVG network
patterns, controlled lighting, accessible color tokens and CSS micro-interactions.
No QuickXchange assets, components or identity were used.

## Page structure

- Sticky logo/name header, capability-derived navigation, theme and support controls;
  compact mobile menu with its own CTA.
- Tenant-authored hero and non-executing exchange widget.
- Actual configured asset/network/service counts, not financial activity metrics.
- Configured asset cards and network filter.
- Four-step intended product flow, explicitly marked as deferred execution.
- Conditional payment, Telegram Bot/Mini App, and developer product illustrations.
- Factual sandbox/trust information, tenant FAQ accordion and service-aware final CTA.
- Footer with tenant support/social/legal content, and separate Terms/Privacy pages.
- Neutral entry, unavailable/loading, and unknown-route states.

Components are split into shell, hero, widget, asset picker, ambient/reveal helpers
and individual below-the-fold sections. Below-the-fold content is a lazy chunk.
Public queries refresh every 30 seconds and on focus/reconnection.
Direct capability pages still require the server's entitlement check.

## Visual refinement and approval

The customer-only visual upgrade adds a stronger tenant-colored atmosphere,
flowing SVG network paths, soft particles, a larger illuminated widget, internal
CTA lighting, more prominent asset controls, and redesigned product showcases.
Configured counts are integrated into Supported Assets and animate only when
visible; mobile uses a shorter count duration. Reduced-motion changes stop the
count animation and decorative motion. Mobile keeps both hero actions on one row
and brings the widget into view earlier.

Customer styles are divided into base, atmosphere, widget, sections and showcase
stylesheets, with a final instrument layer for deeper widget surfaces, traveling
edge illumination, desktop pointer highlights and recessed input panels. Large
atmospheric orbs stay static; mobile disables the widget sheen and pointer light.
The hero now places the widget directly after the headline on mobile; descriptive
copy and secondary actions follow it. Desktop gives the widget a wider column.
At 390px width, Nexa's widget starts around 212px from the top, is 366px wide, and
its preview button fits within the first 844px viewport. Mobile rate details use
a compact two-column layout without hiding labels or notices. Branded SVG light
ribbons and small animated comets give the background a more visible atmosphere,
with lighter mobile effects and reduced-motion support. Additional checks at
320px and 768px found no horizontal overflow, and real pointer clicks confirmed
that the picker and non-executing preview action still work.
Capability logic, routing, theme preference behavior, backend,
shared contracts and admin sources remain unchanged.

Five approval screenshots are in `screenshots/customer-visual-upgrade/`:
Nexa Desktop Dark, Nexa Mobile Dark, Nexa Light, Aster Desktop and Aster Mobile.
The light screenshot uses the real theme switch, not a changed tenant default.
Browser checks found no horizontal overflow, confirmed the mobile selector fits,
observed no financial POST requests or browser exceptions, and confirmed no active
animations with reduced motion. Protected API/admin/shared source checksums match
their pre-redesign values. Wait for explicit user visual approval before any new
backend phase; approval does not itself request that next phase.

## Tenant identities

| Setting | Aster Sandbox | Nexa Sandbox |
|---|---|---|
| Logo/favicon | Original geometric A mark | Original geometric N mark |
| Primary | `#146E68` teal | `#8C70ED` violet |
| Accent | `#9A6630` warm metal | `#80D6D4` cyan |
| Secondary | `#113831` petrol | `#171F38` midnight |
| Glow | `#4CA99A` muted teal | `#9D7DF9` soft violet |
| Font | Manrope | Space Grotesk |
| Default | Light, solid, sharp | Dark, glass, rounded |
| Exchange tab | Swap | Convert |
| Configured assets/networks | ETH / Ethereum Sepolia | BTC / Bitcoin Testnet; ETH / Ethereum Sepolia; USDT / BSC Testnet |
| Product sections | Exchange; no payments/developers/Telegram | Exchange, payments, developers; no Telegram |

Aster has only one distinct asset. Its widget explains that no valid two-asset
pair exists instead of inventing another asset. Nexa's positive amount action
reports that no quote was requested, no order created and nothing sent.
Neither site contains invented rates, balances, fees or successful transactions.

## Branding configuration

Existing controls remain brand name/logo, primary/accent, theme default, secondary,
favicon, approved font key, hero, support, social and legal content.
The authenticated `PUT /api/tenants/:tenantId/website-settings` contract additionally
supports:

| New field | Validation |
|---|---|
| `glowColor` | Optional six-digit hex color; absent glow inherits accent in the frontend |
| `surfaceStyle` | `solid` or `glass` |
| `borderRadius` | `sharp`, `soft` or `rounded`; maps to fixed tokens, not arbitrary CSS |
| `faq` | Up to 16 question/answer pairs; non-whitespace text; `[]` explicitly clears |

Send these with the complete existing settings object through the existing
authenticated configuration API. The admin UI was intentionally left unchanged;
new inputs were not added to its forms. Saves from its older form preserve omitted
newer fields. No public configuration-write endpoint or arbitrary-CSS editor exists.

Text/link tokens are adjusted to at least 4.5:1 on all standard page/card surfaces.
Filled actions choose black or white against their configured color. Decorative
glow colors are not used as text. Theme preferences are keyed by tenant slug, and
tenant fonts/favicon/metadata are restored when leaving a tenant.

## Performance observations

Final production build (not published):

| Asset | Minified | Gzip |
|---|---:|---:|
| Initial JavaScript | 382.11 kB | 123.01 kB |
| Lazy below-fold JavaScript | 17.19 kB | 6.23 kB |
| CSS | 145.88 kB | 24.41 kB |
| HTML | 1.21 kB | 0.47 kB |

Initial JavaScript + CSS: **147.42 kB gzip**; all JavaScript + CSS: **153.65 kB gzip**.
Build took 3.71 seconds in the development container. These exclude font responses,
transport headers and logos. Only the configured tenant font is loaded; SVG marks
and coin glyphs do not require large media or additional coin-image requests.

The earlier foundation's unthrottled development-browser navigation measured FCP **1288 ms**,
DOMContentLoaded **1275.5 ms**, and load **1311.8 ms**. This is not a production
benchmark or a mobile-throttled Core Web Vitals result, and was not remeasured for the visual refinement.

Backgrounds use CSS/SVG rather than video/canvas/animation dependencies. Desktop
cursor lighting is removed on smaller screens, mobile blur/orb effects are reduced,
and reduced motion disables decorative motion, reveals and smooth scrolling.
The build emits a non-fatal sourcemap diagnostic from the existing tooltip component;
the production build and type checks succeed.

## Verification

- Workspace typecheck and final website production build passed.
- Existing foundation regression passed: feature denial, all eight quota boundaries,
  concurrent admission, exact decimal/current-month accounting, add-on/override
  resolution, tenant isolation, non-bypass runtime role and 27 live FORCE RLS tables.
- Website configuration regression passed: validation, legacy-form preservation,
  explicit FAQ clearing, whitespace rejection and unsafe CSS-value rejection.
- Pure frontend regression passed: 2,048 light/dark palettes, 4.5:1 text/fill contrast,
  exact capability keys, disabled parent gating, guessed aliases denied, and distinct
  asset/network counts.
- Real public-browser exploration covered both samples, selectors/search/empty
  results, direction switch, zero/empty/positive input, FAQ keyboard interaction,
  per-tenant themes/fonts/favicons, unavailable capability routes and unknown tenants.
- Viewports: desktop 1440×1000, laptop 1280×800, tablet 768×1024,
  mobile 390×844 and narrow mobile 320×844. No document horizontal overflow.
- Reduced motion produced automatic scrolling and no active decorative animations.
- Positive sandbox input caused no POST, quote, order or financial request.
- Two browser-discovered display/navigation issues were corrected: desktop menu
  hiding at the proper cascade specificity and scroll restoration/real route anchors.
- The focused recheck passed: desktop menu hidden, mobile brand/controls contained,
  legal pages at scroll zero with visible headings, legal-to-home section anchors,
  and Aster FAQ-to-exchange navigation after smooth scrolling settled.

Commands:

```sh
pnpm run typecheck
pnpm --filter @workspace/api-server run verify:foundation
pnpm --filter @workspace/api-server exec tsx src/verification/website-branding.ts
pnpm --filter @workspace/api-server exec tsx ../private-label-website/scripts/verify-branding.ts
PORT=24270 BASE_PATH=/private-label-website/ NODE_ENV=production \
  pnpm --filter @workspace/private-label-website run build
```

Screenshots are saved in `screenshots/customer-website/` for both tenants,
desktop and mobile. No production publication, wallets, deposits, blockchain,
billing, Telegram connection or financial execution was performed.
# Exchange rebuild: responsibilities and acceptance boundary

## Findings

The previous system had several individually working pieces but no coherent end-to-end workflow:

- Manual Swap pricing returned before the provider branch. Configured route rates therefore appeared where actual automatic market references were required.
- Rule selectors existed but had no explicit market/manual state, block behavior, per-rule ranges or route restrictions.
- The public widget created an order in one step; contact and direction-specific payout details were optional.
- Order status transitions existed without an explicit recorded deposit-verification and completion-confirmation workflow.
- Administrative notes could enter the customer-visible history.
- Fees, routes, rules, settings and widget defaults were spread across overlapping editors.

No schema reset, business-data import or identity migration is part of this work.

## Responsibility map

| Boundary | Responsibility |
| --- | --- |
| Global Catalog | Existing verified currency/payment and asset/network relationships, logos and coverage. Catalog presence is not trading permission. |
| Tenant Configuration | Enabled and assigned assets/networks, payment methods, routes, rules, wallets and independent widget defaults. |
| Route Resolver | Only explicitly enabled compatible tenant routes; Swap is Crypto/Fiat, Convert is Crypto/Crypto. Payment-method identity is part of Swap selection. |
| Pricing Rule Matcher | Directional network, asset-wide and typed wildcard selectors, method restriction, route restriction, state, precedence and priority. |
| Market Rate Service | Actual timestamped market references, explicit symbol/provider mappings, coalesced caches, cross rates and fail-closed freshness checks. |
| Quote Service | Entitlements, capacity, exact fixed-point calculation, rule snapshot, source disclosure and signed short-lived accepted reference. |
| Three-Step Widget | Exchange → Customer Details → Review. Review is a read-only backend operation; only Create Order persists an order. |
| Order Creation | Required contact/consent and direction-specific receiving data, semantic idempotency, immutable accepted calculation and payment snapshots. |
| Order Tracking | Private tracking token; customer-safe history and transaction data. Never internal notes, assignment or provider secrets. |
| Order Management | Tenant-authorized list/search/filter/bulk operations and responsive View Order drawer. Explicit recorded Sandbox operator actions. |
| Provider Adapters | Independent tenant credential custody and verified provider coverage/connectivity. Market references are not executable provider quotes. |

The shared approved website shell remains shared. There are no tenant-specific frontend forks and no main Landing Page redesign.

## Rule matching

Only admitted routes and payment methods can be quoted. A rule never creates or enables a route.

Selector weights: exact network/fiat endpoint **4**, asset across networks **2**, typed group (`crypto:*`, `fiat:*`) **1**, unrestricted Any **0**. A payment-method restriction adds **1**. Highest specificity wins, then highest numeric priority. An equally ranked overlapping match is an error, not an arbitrary selection.

- `crypto:* → fiat:EUR` is one rule for eligible EUR payout methods across configured crypto routes.
- `fiat:EUR → crypto:*` is independent. The forward rule is never inverted or silently reused.
- Exact USDT/TRON + SEPA can override the generic direction.
- Optional route restrictions restrict applicability; another eligible fallback may match outside those routes.
- A selected Blocked rule refuses the quote; Disabled rules do not match.
- Rule ranges can narrow, never widen, route limits. Network, payment-method and plan capacity still apply.
- A tenant using the new market-rule framework needs a matching market or explicit manual rule for each Swap direction. A missing reverse rule does not silently inherit the forward rule.
- Existing entirely legacy manual configurations remain readable and explicitly identified as manual. Historical Buy/Sell records remain; new product admission is Swap/Convert only.

## Market data and calculations

Automatic references use the tenant's valid configured 1Forge connection for supported Forex pairs, otherwise the authorized Sandbox Frankfurter/ECB daily fallback. Crypto uses explicitly mapped CoinGecko Public identities with provider timestamps. USDT/USDC are fetched, never assumed to equal USD.

One coalesced CoinGecko request covers the explicit supported identity bundle; cached crypto references expire after at most 60 seconds and must independently remain under the 180-second provider-age limit. Forex is cached for five minutes; ECB daily references allow weekends/holidays but expire after four days. Missing, stale, unsupported, malformed or denied responses fail quoting. There is no manufactured fallback price.

Cross rate:

`source/destination = source USD price ÷ destination USD price`

All monetary calculation uses 18-place integer fixed-point arithmetic, not binary floating-point. Provider numeric JSON is converted from its decimal spelling, including bounded scientific notation, without `toFixed()` binary artifacts.

The source-denominated service fee, fixed fee, source network fee and applicable incoming payment fee are deducted once. The spread adjusts the base exchange rate once. Destination network and outgoing method fees are deducted once in destination units. Output rounds down to destination precision.

The customer sees the base/reference rate, after-spread rate, separate source/destination fees, actual output and calculation. Frankfurter is labelled daily indicative data, not intraday execution. CoinGecko attribution is visible.

Changing the saved fee changes the next public quote immediately: rules and fees are not cached with market prices. The signed quote binds tenant, full configuration, plan currency, selected reference and expiry. Configuration changes or expiry invalidate it. Creation reuses the accepted reference, not a fresh potentially different market rate.

## Order and privacy boundary

New orders require full name, email, consent and receiving bank/account or wallet/memo details appropriate to the chosen direction. IBAN requirements and network memo requirements are provided to the form as non-sensitive booleans; operator account values stay out of the anonymous directory.

The read-only Review endpoint validates the complete customer input and signed quote before returning the relevant payment snapshot. Crypto funding instructions use only enabled customer-purpose source wallets. Global RPC/monitoring wallets never become customer funding addresses. No configured source wallet means no invented address or QR code.

Creation stores customer details, the accepted rule/rate/calculation, payment instructions and configured public address/memo. Idempotent replay compares normalized details semantically because PostgreSQL JSONB can reorder keys.

New-order Sandbox workflow:

1. Created / pending, payment unverified.
2. Operator may review, then record synthetic Sandbox deposit verification with a reference/hash.
3. Processing requires that recorded verification.
4. Completion requires processing, explicit confirmation and a payout reference. This acknowledges a Sandbox event only; it does not transfer funds.

Cancelled and failed are terminal. Bulk operations cannot bypass individual completion confirmation or verification requirements. Internal notes and assignment are stored separately from sanitized public history.

Completed tracking uses the customer's own branding and configured review link. Download and Print use the existing branded PDF service.

## Administrative organization

Dedicated sections: Currencies, Crypto Assets, Crypto Networks, Payment Methods/Banks, Pricing Rules with Test Rule, Widget Defaults, Routes and Wallets. Settings link to the single currencies/defaults editors. The old Fees URL aliases Pricing Rules; there is no second fees table on that screen. Route values are labelled legacy fallback, not a competing automatic pricing engine.

Customer API Integrations points to its entitled tenant integration surface. Global infrastructure and RPC monitoring remain Super Admin only. Retired Buy/Sell features are not selectable active plan options.

## Verification and limitations

Automated coverage includes exact arithmetic, selector precedence/direction, asset groups, route restrictions, ranges, stale/missing data, coalesced provider calls, required details, monitoring-wallet exclusion, public-history privacy and existing integration/entitlement policies.

Protected Solara verification records actual public references, the three forward pairs, independent reverse rule, specific override, immediate 1%→2% change, review, immutable creation/replay, status gates, private tracking, tenant isolation, historical-order digests and branded PDF. Native browser results are recorded separately rather than inferred from service tests.

This is a protected fictional Sandbox. There are no real deposits/payouts, automated bank settlement, live financial execution, DNS changes or production cutover. Unsupported market coverage fails closed. Executable/fixed/floating Convert capability requires a configured, entitled provider with verified actual support; an indicative market Convert quote does not establish that capability.

# QuickXchange package integration — protected candidate

## Source and boundaries

The uploaded source-only migration package was extracted into an isolated temporary
directory, not over the workspace. README.md, documentation/MIGRATION_GUIDE.md,
MULTITENANCY_ADAPTATION.md, ADMIN_WORKFLOWS.md and FEATURE_INVENTORY.md were reviewed.
Its verifier passed: 2,116 files, 264 catalog assets and 149 migration slots.
Archive SHA-256: `9adc384897f2715d7d59d2c36d592167a4b49acce4651917df0edcddf83588d8`.

This is selective adaptation into the existing VYNOX tenant architecture, **not**
installation of the source application's single-company schema/runtime. No source
database, identities, provider credentials, bots, operational wallet rows, settings
or financial records were imported. No archive migrations were applied. The large
ZIP stays available in attached_assets but is excluded from Git/deployment payloads.

## Implemented batches

1. **Pricing:** Adapted immutable selector/Any-side specificity semantics from
   manual-desk-pricing to tenant Exchange configuration. Added Any→Any,
   Any→endpoint, endpoint→Any, exact and payment-specific rules, explicit
   priority, overlap rejection, optional manual rates, exact fixed-point fee/spread
   calculation, Super Admin/customer Admin CRUD, filtered bulk controls and audits.
   Rules never add or enable executable routes. The entire configuration remains
   bound into the existing expiring signed quote; orders retain matched rule IDs.
   Explicit manual-rule rates do not require a provider request. Missing manual
   rate preserves the configured route/provider rate.
2. **Wallets and observations:** Reused imported EVM, Bitcoin, TRON and Solana
   adapters/normalizers. Added tenant public-address configuration with explicit
   native/token identity, token contract/mint, memo, provider assignment, CRUD,
   filtered bulk controls, copies, and on-demand read-only scans. Scans verify the
   current network, exact provider asset/network assignment and configuration
   revision; filter unrelated evidence; retain integer amounts; evaluate canonical
   confirmation status; cap each scan to the last five blocks and 100 observations.
   Neither enabled configuration nor an observation constitutes deposit activation.
3. **Order payment details:** Added optional operator payment instructions, frozen
   into new admitted orders. Admin View Order and private customer tracking display
   and copy that saved value; later method edits/deletion cannot rewrite history.
   Instructions/reserves are excluded from the anonymous method directory. Existing
   status timelines, optimistic status transitions and responsive views are reused.
4. **Regression/release wiring:** Added migration:test to the existing release:test
   chain used by automatic external CI; no GitHub workflow was changed.

## Reused capability versus activation

| System | Actual state |
| --- | --- |
| Swap / Convert / Buy / Sell | Functional simulated quotes/orders/tracking and idempotency; no financial execution |
| Any-to-Any / manual pricing | Implemented against existing tenant routes; no imported prices or automatic new routes |
| Quickex | Existing tenant-context read-only quote/auth adapter reused; Convert only; order creation remains deliberately blocked |
| 1Forge / WhiteBIT | Existing tenant-context rate/auth adapters reused; optional assignments now cover all four sandbox actions if the provider supports the exact pair |
| RPC / blockchain | Existing adapters reused for explicit read-only observations; independent endpoint/account and exact chain mappings required |
| Telegram Bot / Mini App | Existing tenant bot identity, webhook registration/authentication, duplicate handling, initData checks, branding and shared sandbox APIs retained |
| Continuous chain indexing, settlement / payouts | Not implemented by the new bounded scanner; requires durable cursors/leases, reconciled evidence and separately approved financial execution |
| Provider credentials | Existing authenticated tenant/provider/environment-bound vault and role-controlled masked configuration retained; real setup/connectivity is separate from code tests |

No real account connectivity, webhook delivery, deposit support or provider
permissions are asserted from synthetic adapter tests. Independent credentials,
fresh per-route checks and a provisioned environment-specific vault key are required.
Do not reuse QuickXchange credentials or bot identities. Do not add server keys to
VITE configuration or source. Protected Vercel SSO also blocks ordinary Telegram
webhook delivery; do not weaken that protection to make a bot test pass.

## Verification

- Package integrity: passed.
- migration:test: 55 tests passed after final implementation changes.
- Full workspace typecheck: passed after final implementation changes.
- Existing release and external regressions: passed during implementation.
- Development native read-only Admin Demo browser check: passed on desktop and
  390px mobile for Pricing and Wallet Addresses. No React errors; disabled controls
  preserved. No customer/Owner/configuration/role data was changed.
- Anonymous wallet scan: HTTP 403, no observations returned.
- Native customer/administrator write-save-reload testing was not performed against
  existing customer data. Browser coverage is not a write-flow acceptance claim.
- Real provider/Telegram network tests: not performed without independent credentials.

## Protected release and final Live gate

Use the existing automatic main-branch candidate pipeline, which builds/tests,
deploys the exact pushed revision to held Render and protected Vercel Preview,
verifies revision/runtime boundaries, and updates only the protected acceptance
alias. Keep candidate execution disabled and Public Live/DNS unchanged.

For final Live preparation, retain a backup/rollback plan; independently configure
the environment vault and tenant credentials; verify exact asset/network mappings,
SMTP/bot origins and provider permissions; complete isolated native write-flow and
cross-tenant acceptance tests; and explicitly approve any financial-execution
implementation/activation and eventual Live cutover. Code deployment alone is not
authorization to enable deposits, payouts, trades, workers or public business writes.

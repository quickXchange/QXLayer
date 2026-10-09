# Tenant Integration runtime: delivery and verification

## Implemented in Development

- Tenant-scoped configuration for 1Forge, WhiteBIT, Quickex, Alchemy/RPC Node, Telegram Bot and Telegram Mini App; configurable credential-management authority and masked responses.
- Scope-bound AES-256-GCM credential storage, credential-identity uniqueness, explicit missing-vault errors, and read-only connection diagnostics. Quickex credentials use isolated async contexts and never global credential fallbacks.
- Opt-in read-only health monitoring. It does not start without the provider vault.
- Explicit Telegram webhook/menu registration with readback, tenant-bound webhook authentication, receipt deduplication, and private-chat links to allowed tenant Mini App actions.
- The tenant Mini App uses the existing Sandbox widget, private order tracking, real copied logo/rate/theme utilities and tenant language dictionaries.
- New approval provisions an isolated shared-master website and same-account Admin access without copying demo configurations or pretending financial setup/custom design is complete.
- Suspension blocks public website, new orders and customer Admin access. Authorized Super Admin can process existing Sandbox orders without restoring customer access.

## Verified

- Backend, website and console type checks.
- 80 copied Mini core tests; 15 original blockchain adapter tests; five vault/permission/endpoint/credential-context/financial-execution tests.
- Disposable service lifecycle checks for tenant isolation, permissions, missing vault, Mini action gates, idempotency, private tracking, automatic approval and suspension.
- Updated customer lifecycle regression checks.
- One signed-in browser pass: configuration persistence, mobile Mini branding/menu, real Sandbox quote/order creation, private tracking, invalid-token rejection and module disable/re-enable.
- The browser-found disabled-page issue was fixed and verified with a phone-sized screenshot showing the explicit unavailable screen.

## External dependencies and limitations

`PROVIDER_VAULT_KEY_V1` must be securely provisioned before credential operations.
Independent tenant credentials and verified public HTTPS channel URLs are not supplied.
Real provider authentication, Telegram webhook delivery and native Telegram-client behavior are therefore **not externally verified**.

Provider selection/diagnostics do not enable provider-backed financial execution. Quotes and orders remain the existing manually configured Sandbox engine. RPC monitoring here is read-only connection/head health, not live deposit/address processing. Real Quickex order creation is explicitly disabled.

The Development database role bypasses PostgreSQL row policies. Policy presence and FORCE RLS were checked, and application-level tenant isolation was verified separately. Database isolation must also be verified with the actual non-bypassing runtime role before any later Production release.

Only additive Development storage was prepared. No Production database changes, publishing, QuickXchange data imports or credential sharing were performed.

## Verification commands

```sh
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/private-label-website run typecheck
pnpm --filter @workspace/private-label-console run typecheck
pnpm --filter @workspace/quickxchange-mini-core test
pnpm --filter @workspace/api-server exec tsx --test src/modules/integrations/runtime.test.ts
pnpm --filter @workspace/api-server run verify:customer
pnpm --filter @workspace/api-server exec tsx src/verification/integration-runtime.ts
```

Runtime verification cleans its disposable fixtures by default. Only use `--keep` when a browser pass requires them, then run the same script with `--cleanup`. The persistent QA manifest defines the exact cleanup scope; do not remove existing customer fixtures or accounts.

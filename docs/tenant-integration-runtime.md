# Tenant Integration runtime: delivery and verification

## Implemented in Development

- Tenant-scoped configuration for 1Forge, WhiteBIT, Quickex, Alchemy/RPC Node, Telegram Bot and Telegram Mini App; configurable credential-management authority and masked responses.
- Scope-bound AES-256-GCM credential storage, credential-identity uniqueness, explicit missing-vault errors, and read-only connection diagnostics. Quickex credentials use isolated async contexts and never global credential fallbacks.
- Authorized 1Forge/WhiteBIT/Quickex read-only indicative pricing can feed Sandbox quotes. Super Admin assigns one provider per action and the route asset/networks; Quickex is Convert-only. An explicit manual fallback is disclosed, never represented as a successful provider quote.
- Signed quotes retain the provider rate and integration revision. Sandbox creation uses that exact snapshot and rejects changed provider authorization/configuration rather than fetching another price.
- Super Admin may separately permit customer activation of an already authorized integration. Customers cannot change assignment or credential-management policy.
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
- An additional focused Development browser pass verified the persisted Super Admin pricing/activation policy, actual API role warning, unavailable vault/not-connected state, mobile disclosed 1Forge fallback and matching quote/order/private-tracking values. This was Sandbox fixture evidence, not external provider or Live acceptance.
- The browser-found disabled-page issue was fixed and verified with a phone-sized screenshot showing the explicit unavailable screen.
- Approved security pass: signed-in Super Admin UI reports `pg_database_owner` with no bypass; required assignments remained intact. Delivered-only metadata and unauthenticated webhook rejection passed. Same-tab invalid tracking-token changes hide previously loaded financial details. A new delivered fixture correctly showed Mini unavailable while disabled; after explicit fixture-only authorization its branded tracking Mini rendered at phone width. No automatic customer channel activation was introduced.

## External dependencies and limitations

`PROVIDER_VAULT_KEY_V1` must be securely provisioned before credential operations.
Independent tenant credentials and verified public HTTPS channel URLs are not supplied.
Real provider authentication, Telegram webhook delivery and native Telegram-client behavior are therefore **not externally verified**.

Provider selection/diagnostics do not enable financial execution. Quotes may use a remotely fetched indicative rate, or a disclosed explicitly configured manual fallback, but all orders remain simulated. RPC monitoring here is read-only connection/head health, not live deposit/address processing. Real Quickex order creation is explicitly disabled.

The earlier Development API used privileged `postgres` transactions and failed an unscoped cross-tenant read. Following explicit Owner approval, request transactions now switch to built-in `pg_database_owner`, verify a non-superuser/non-BYPASSRLS role and complete policy/grant metadata, fix the search path, and apply transaction-local RLS context. All application schema tables declare read/write policies. Development setup enabled and forced RLS without changing table counts. Actual request-context checks hide cross-tenant reads across every tenant-owned table, deny wrong-tenant inserts and prevent cross-tenant updates/deletes. Server-side capability/membership/ownership checks remain in place.

Production's read-only SQL callback reports `neondb_owner` with BYPASSRLS; this is callback evidence, not proof of the deployed API's effective role. Production core tenant/order tables currently do not have RLS enabled. The Super Admin Integrations response now measures the actual API transaction role (`databaseRuntime`), so the published runtime can be checked directly after an approved release.

Development isolation is verified, not Production parity. The pool login remains privileged for explicit Development maintenance; transaction-role RLS is not protection against compromised server/database credentials. No custom roles or startup DDL were introduced. Incomplete/missing policies, extra unaudited policies or insufficient table privileges fail request transactions closed.

**Publishing is blocked by the native plan.** The current read-only native schema review contains RLS enablement and policy names, but omits policy USING/WITH CHECK conditions and built-in-role grants. It reports no structural data loss but possible backwards incompatibility. Applying that preview is not equivalent to the verified Development setup. The release preflight rejects it; runtime checks independently refuse incomplete metadata. Evidence is saved in `reports/database-security-release/native-schema-diff.json`. Do not manufacture a replacement Production script, add repair hooks, clear the guard, or publish until the supported native plan preserves predicates and permissions. Earlier source-bound commercial/provisioning reviews must also be refreshed against the final safe plan.

Agent prepared additive Development storage only and did not perform Production database writes, publish, import QuickXchange customer data or share credentials.

The deployment service identifies `https://www.quicklychan.xyz` as the published hostname; prior HTTPS liveness responded and the platform access gate was active. This is not verification of the new release. The approved gate change now admits delivered active customer site paths/public APIs, read-only minimal delivery metadata, and website assets while keeping platform/Admin routes protected. Verified custom hosts remain bound to their own tenant before slug-based delivery checks. Delivery authority is uncached, returns no drafts/private records and rejects suspended/undelivered sites.

Telegram callbacks still require the tenant-bound vault-derived proof before accepting an update. Missing/malformed/wrong proofs and cross-tenant reuse were rejected; synthetic accepted updates were deduplicated with external requests blocked. A delivered website does not auto-enable its Mini App or Bot. Disabled channels must show unavailable; the disposable enabled Mini uses the existing branding and Sandbox template. These are Development/service and HTTP-gate tests, not real Telegram network acceptance.

## Verification commands

```sh
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/private-label-website run typecheck
pnpm --filter @workspace/private-label-console run typecheck
pnpm --filter @workspace/quickxchange-mini-core test
pnpm --filter @workspace/api-server exec tsx --test src/modules/integrations/runtime.test.ts
pnpm --filter @workspace/api-server run verify:customer
pnpm --filter @workspace/api-server exec tsx src/verification/integration-runtime.ts
node --test lib/production-access-gate/*.test.mjs scripts/release/database-security-contract.test.mjs
pnpm --filter @workspace/api-server exec tsx --test ../../lib/db/src/context.test.ts
```

Runtime verification cleans its disposable fixtures by default. Only use `--keep` when a browser pass requires them, then run the same script with `--cleanup`. The persistent QA manifest defines the exact cleanup scope; do not remove existing customer fixtures or accounts.

`pnpm run release:check` currently **intentionally rejects** the unsafe native policy preview. A passing type check or Development test does not override this publishing hold.

## Exact external setup

1. **Vault:** Generate a fresh cryptographically random 32-byte key locally (for example, `openssl rand -hex 32`). Save the resulting 64 hexadecimal characters as the shared Replit Secret `PROVIDER_VAULT_KEY_V1` through the secure Secrets interface. Do not paste it into chat, reuse `SESSION_SECRET`, or rotate it casually: stored credentials depend on that key. Restart the API and confirm “Vault available.” Preserve a secure operational backup outside the repository.
2. **Tenant authorization:** Super Admin selects the customer tenant in **Integrations**, saves the permitted provider, chooses **Super Admin only / Customer only / Both**, assigns only that tenant's enabled asset/networks, and optionally allows customer activation. Assign Swap/Convert pricing here; the older Exchange provider preference does not grant runtime authority. Remove the previous action assignment before selecting another provider.
3. **Independent credentials:** An authorized customer opens that same tenant's Admin → Integrations. Enter 1Forge `apiKey`; WhiteBIT `apiKey` and `secretKey`; Quickex `apiKey` (its public key) and `secretKey`; RPC/Alchemy `rpcUrl` and optional `apiKey`; Telegram Bot `botToken`. Save and run **Test connection**. Do not place customer keys in shared environment variables or use the original QuickXchange account. Provider-side permissions must permit the diagnostic read; financial trade/withdrawal permissions are not needed for this Sandbox implementation.
4. **RPC:** Select the implemented EVM, TRON, Solana or Bitcoin adapter, its network code, confirmations and, for EVM, the expected chain ID. Use an HTTPS endpoint on the supported allowlist. A provider brand's REST endpoint is not automatically compatible with Bitcoin JSON-RPC; use the transport the adapter actually requires. TRON verification requires Mainnet. Enable opt-in monitoring only after a successful connection test. The displayed head is network health, not evidence of a customer deposit.
5. **Published HTTPS/DNS:** The deployment service's verified current hostname is `https://www.quicklychan.xyz`; its HTTPS health check responds. Do not use the Development `.replit.dev` hostname. For any new customer/custom hostname, add exactly the DNS records shown by Replit's Publishing domain panel, wait for verification and a valid HTTPS certificate, and retain the existing customer data. No DNS changes were performed by Agent.
6. **Telegram:** Create a separate customer bot in official `@BotFather`, set its customer name/description/photo and record its username. Configure the matching username and bot token in that tenant's Bot integration. For the verified platform hostname, set the webhook URL to `https://www.quicklychan.xyz/api/public/sites/<tenant-slug>/telegram/webhook` and the Mini App URL to `https://www.quicklychan.xyz/private-label-website/<tenant-slug>/telegram`. Configure the tenant logo/theme/menu in Mini App settings and explicitly authorize/enable the Bot and Mini. Verify the Bot, then register the webhook/menu through the protected Integrations action, which sets the scoped authentication proof and performs provider readback. In BotFather, use the same URL for separate main Mini App/launch configuration. The approved delivery-gate code must be safely published before claiming these URLs work on Live.
7. **External acceptance:** Open the published Mini App inside the actual Telegram client, `/start` the bot in a private chat, check webhook delivery and the receipt/readback evidence, and run a Sandbox quote/order/private-tracking flow. HTTPS access screens, network/DNS restrictions, provider account policy or unsupported pairs must be reported as blockers, not successes. A “configuration ready” state is not external verification.
8. **Release:** Resolve the native policy/grant omission first and refresh the source-bound release reviews. The user, not Agent, then triggers native Publish with Development-data overwrite disabled after reviewing preservation and rollout compatibility. Verify actual Live API role, permanent Owner/customer access, delivered websites, tenant separation, provider health, Telegram delivery and suspension/reactivation. Agent has not published or changed Production data.

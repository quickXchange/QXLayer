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

## External dependencies and limitations

`PROVIDER_VAULT_KEY_V1` must be securely provisioned before credential operations.
Independent tenant credentials and verified public HTTPS channel URLs are not supplied.
Real provider authentication, Telegram webhook delivery and native Telegram-client behavior are therefore **not externally verified**.

Provider selection/diagnostics do not enable financial execution. Quotes may use a remotely fetched indicative rate, or a disclosed explicitly configured manual fallback, but all orders remain simulated. RPC monitoring here is read-only connection/head health, not live deposit/address processing. Real Quickex order creation is explicitly disabled.

The actual Development API transaction connection was tested with an ordinary non-Super-Admin tenant context. Its `postgres` role is superuser/BYPASSRLS, and an intentionally unscoped read could see other tenants' integration records. Database-level isolation therefore **failed**, while application-scoped authorization tests passed.

Production's read-only SQL callback reports `neondb_owner` with BYPASSRLS; this is callback evidence, not proof of the deployed API's effective role. Production core tenant/order tables currently do not have RLS enabled. The Super Admin Integrations response now measures the actual API transaction role (`databaseRuntime`), so the published runtime can be checked directly after an approved release.

Do not label the release database-isolated or ready for live financial operation. A non-superuser, non-BYPASSRLS runtime role, correct policies on all tenant-owned tables, applicable FORCE RLS/table ownership, and actual-runtime cross-tenant read/write denial are required. Existing project instructions prohibit casually restoring custom-role ACLs: they previously broke managed publishing preparation. This requires an explicit, publishing-compatible database security change, not a key, UI toggle or `row_security=on`.

Agent prepared additive Development storage only and did not perform Production database writes, publish, import QuickXchange customer data or share credentials.

The deployment service currently identifies `https://www.quicklychan.xyz` as the published hostname. Its HTTPS liveness check passed; its unauthenticated public catalog request returned 403 “Production access required.” This is not verification of the new release. The current application access gate also needs an explicitly approved delivery policy for public tenant Mini Apps and authenticated noninteractive Telegram webhooks; do not weaken Clerk/Admin authorization or advertise webhook delivery through the gate as working.

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

## Exact external setup

1. **Vault:** Generate a fresh cryptographically random 32-byte key locally (for example, `openssl rand -hex 32`). Save the resulting 64 hexadecimal characters as the shared Replit Secret `PROVIDER_VAULT_KEY_V1` through the secure Secrets interface. Do not paste it into chat, reuse `SESSION_SECRET`, or rotate it casually: stored credentials depend on that key. Restart the API and confirm “Vault available.” Preserve a secure operational backup outside the repository.
2. **Tenant authorization:** Super Admin selects the customer tenant in **Integrations**, saves the permitted provider, chooses **Super Admin only / Customer only / Both**, assigns only that tenant's enabled asset/networks, and optionally allows customer activation. Assign Swap/Convert pricing here; the older Exchange provider preference does not grant runtime authority. Remove the previous action assignment before selecting another provider.
3. **Independent credentials:** An authorized customer opens that same tenant's Admin → Integrations. Enter 1Forge `apiKey`; WhiteBIT `apiKey` and `secretKey`; Quickex `apiKey` (its public key) and `secretKey`; RPC/Alchemy `rpcUrl` and optional `apiKey`; Telegram Bot `botToken`. Save and run **Test connection**. Do not place customer keys in shared environment variables or use the original QuickXchange account. Provider-side permissions must permit the diagnostic read; financial trade/withdrawal permissions are not needed for this Sandbox implementation.
4. **RPC:** Select the implemented EVM, TRON, Solana or Bitcoin adapter, its network code, confirmations and, for EVM, the expected chain ID. Use an HTTPS endpoint on the supported allowlist. A provider brand's REST endpoint is not automatically compatible with Bitcoin JSON-RPC; use the transport the adapter actually requires. TRON verification requires Mainnet. Enable opt-in monitoring only after a successful connection test. The displayed head is network health, not evidence of a customer deposit.
5. **Published HTTPS/DNS:** The deployment service's verified current hostname is `https://www.quicklychan.xyz`; its HTTPS health check responds. Do not use the Development `.replit.dev` hostname. For any new customer/custom hostname, add exactly the DNS records shown by Replit's Publishing domain panel, wait for verification and a valid HTTPS certificate, and retain the existing customer data. No DNS changes were performed by Agent.
6. **Telegram:** Create a separate customer bot in official `@BotFather`, set its customer name/description/photo and record its username. Configure the matching username and bot token in that tenant's Bot integration. For the verified platform hostname, set the webhook URL to `https://www.quicklychan.xyz/api/public/sites/<tenant-slug>/telegram/webhook` and the Mini App URL to `https://www.quicklychan.xyz/private-label-website/<tenant-slug>/telegram`. Configure the tenant logo/theme/menu in Mini App settings. Verify the Bot, then register the webhook/menu through the tenant's protected Integrations action; registration performs provider readback. In BotFather's bot settings, use the same Mini App URL for any separate main Mini App/launch configuration. The Production access-gate delivery blocker must be resolved before claiming these URLs work inside Telegram.
7. **External acceptance:** Open the published Mini App inside the actual Telegram client, `/start` the bot in a private chat, check webhook delivery and the receipt/readback evidence, and run a Sandbox quote/order/private-tracking flow. HTTPS access screens, network/DNS restrictions, provider account policy or unsupported pairs must be reported as blockers, not successes. A “configuration ready” state is not external verification.
8. **Release:** Resolve the database-isolation blocker first. The user, not Agent, triggers native Publish after reviewing the additive schema diff and preservation of existing Production records. Then verify actual API role, permanent Owner/customer access, delivered websites, tenant separation, provider health, Telegram delivery and suspended/reactivated behavior on Live. Publishing and Live verification have not been performed by Agent.

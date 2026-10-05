# QXLayer Crypto Platform — Foundation Report

## Scope and status

This is a NEW independent platform. It does not connect to, modify, migrate, or depend on QuickXchange.
Everything in this build is development/sandbox only. Nothing has been published to production.

## Implemented and persistent

- Clerk sign-in/sign-up with server-verified identity. Authentication is separate from authorization.
- Super administrators: view all clients, create draft clients, provision settings, and control module entitlements.
- Client administrators: view only assigned tenants, edit their branding/domain/assets/configuration, and activate completed sandbox configurations.
- Staff: read-only access to assigned tenants. Unassigned users receive no administrative data.
- Client provisioning: Client → Brand → Domain → Modules → Assets/Networks → Configuration, persisted step by step.
- Brand name, HTTPS logo reference, two brand colors, light/dark/system theme preference, default language, and supported languages.
- Domain hostname save/clear, global uniqueness, and unverified status. No DNS verification, custom-domain routing, TLS provisioning, or website serving.
- Six independent entitlement keys: `crypto_exchange`, `crypto_payments`, `telegram_bot`, `telegram_mini_app`, `website`, `merchant_api`.
- Tenant-scoped asset/network selection from sandbox catalogs: BTC/Bitcoin Testnet, ETH/Ethereum Sepolia, USDT/Ethereum Sepolia, SOL/Solana Devnet, BNB/BSC Testnet, USDT/BSC Testnet, USDT/TRON Nile.
- Sandbox configuration flags and activation checks. Enabling an entitlement does not create a working product.
- Overview counts and audit activity derived from database records, with no invented revenue or volume metrics.
- Parameterized database access, generated request/response validation, explicit role checks, same-origin mutation checks, and request-size limits.
- Server-side authorization and tenant/customer-scoped SQL protect private data; catalog mutations require explicit operator permission.
- Tenant-local compound foreign keys for order-to-pricing and wallet-to-asset references prevent cross-tenant references.

## Prepared, not implemented as products

Shared backend contracts exist for pricing, exchange orders, payment invoices, wallets, replaceable blockchain providers, API keys, webhooks, and notifications.

The pricing/order/payment/wallet/notification services fail explicitly with `501 foundation-only` rather than fabricating successful execution.
The only blockchain adapter is disconnected sandbox; there are no RPC calls, monitoring jobs, addresses, deposits, transfers, payouts, refunds, or real-wallet creation.
API-key hashing and constant-time matching helpers exist, but keys are not issued. Webhook signing/verification helpers exist, but no secret, endpoint delivery worker, or external transport is configured.

Database contracts for these future services exist with sandbox constraints. Their product screens and execution endpoints are intentionally absent.
Telegram integrations, merchant endpoints, branded end-user websites, website builder, financial ledger/accounting, pricing engines, and operational analytics are not built.
Logo uploads/SVG file processing and localized product interfaces are also deferred; this build stores branding references and language preferences.

## Architecture

```text
React administration console
         │
Generated OpenAPI React Query client
         │
Express API: Clerk identity → DB role/membership → tenant context → service
         │
PostgreSQL configured login + explicit service authorization + scoped SQL
         │
Shared tenant configuration and independent entitlement records
```

This is a modular monolith, not six copied backends. Future websites, Telegram channels, and merchant integrations must consume the same services and tenant configuration.

```text
artifacts/
  private-label-console/src/
    App.tsx                    Clerk routing and protected role boundary
    pages/                     Welcome, unassigned, overview, clients, wizard,
                               client detail, modules, activity
    components/app/            Shared admin shell and configuration sections
    lib/                       Principal, formatting, cache invalidation
  api-server/src/
    middlewares/               Clerk proxy, verified identity, same-origin checks
    routes/                    Health, catalogs, platform, tenant provisioning
    modules/
      authentication/          Server-resolved principals and tenant authorization
      tenants/                 Persistent provisioning and activation
      entitlements/            Independent module checks
      branding/                Shared branding boundary
      assets-networks/         Shared tenant catalog-selection boundary
      pricing/ orders/ payments/ wallets/
      blockchain/ api-keys/ webhooks/ notifications/
      shared/                  Sandbox service contracts
    verification/              Direct development service authorization checks
lib/
  db/src/schema/               Access, tenants, catalog, branding, commerce,
                               integrations, audit, and relational constraints
  db/src/context.ts            Restricted-role transaction helper
  db/migrations/               Development-only role and policy setup SQL
  api-spec/                    OpenAPI source of truth
  api-zod/                     Generated server validation
  api-client-react/            Generated frontend client and hooks
scripts/src/                   Development setup, catalog seed, explicit access
docs/                          Foundation and complete schema reports
```

## First operator access

No administrator has been auto-created or granted access.
Sign up in this app; the unassigned page displays the account's Clerk user ID.
An operator explicitly assigns access using:

```sh
pnpm --filter @workspace/scripts run access:assign:dev super_admin user_CLERKID
pnpm --filter @workspace/scripts run access:assign:dev client_admin user_CLERKID TENANT_UUID
pnpm --filter @workspace/scripts run access:assign:dev staff user_CLERKID TENANT_UUID
```

Replace the placeholders with the intended account and tenant. No passwords or tokens are passed to this command.
There is no public self-promotion endpoint and no first-signup privilege rule.

## Development setup on a fresh database

```sh
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run db:seed:dev
pnpm run typecheck
pnpm --filter @workspace/api-server run verify:foundation
```

Repeat the permission command after any development schema push. Nothing runs DDL at application startup.
These setup/access/verification commands explicitly refuse `NODE_ENV=production`.
No production migration script or deployment hook has been created.

Runtime requests use the configured PostgreSQL login. RLS and custom-role switching are not required. Server-side authorization and scoped SQL are the tenant/customer access boundary; read-only transactions reject accidental writes.
Before a future production launch, configure truly restricted runtime login credentials, validate role/policy readiness separately, and perform a security and deployment review. This development foundation is not a live-finance certification.

## Verification

Full workspace TypeScript checking passes.
Direct service/database verification covers persistent provisioning and activation, client/staff restrictions, denied unassigned access, independent entitlements, application cross-tenant denial, scoped activity, role escalation denial, read-only transactions, composite foreign keys, and sandbox-only constraints.
Verification creates only temporary named fixtures and removes its own records afterward.

No authenticated browser journey or real financial execution was tested. The first build does not use browser end-to-end tests or external provider calls.

## Recommended next work — not started

1. Add an operator-controlled invitation/assignment interface for client administrators and staff, including revocation and access audit events. Confirm signed-in role flows before extending finance.
2. Build ONE shared sandbox payment-invoice lifecycle first: idempotent creation, deterministic simulation, payment-state transitions, tenant isolation, scoped sandbox API access, and signed sandbox webhook events. No real deposits or provider secrets.
3. After that shared flow is stable, add one branded channel consuming it. Defer exchange execution, live wallets/providers, and other channels until explicitly approved.
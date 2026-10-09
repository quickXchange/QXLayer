# QXLayer Crypto Platform — Sandbox Foundation

An independent multi-tenant administration and provisioning foundation, not a live exchange or payment gateway.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run db:security:dev` — explicit Development-only policy/grant setup; preserves table counts. Legacy RLS removal is disabled.
- `pnpm --filter @workspace/scripts run db:seed:dev` — seed only sandbox catalogs
- `pnpm --filter @workspace/api-server run verify:foundation` — development-only provisioning and tenant-isolation checks
- `pnpm --filter @workspace/api-server run samples:plans:dev` — explicit development-only Aster/Nexa demonstrations; never an automatic startup seed
- `pnpm --filter @workspace/scripts run access:assign:dev super_admin user_CLERKID` — explicit operator assignment, never automatic
- For tenant roles, use `access:assign:dev client_admin user_CLERKID TENANT_UUID` or `staff`.
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: generated OpenAPI schemas use the root Zod namespace; Drizzle schemas use `drizzle-zod` with `zod/v4`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild API bundle, Vite frontend

## Where things live

- `artifacts/private-label-console` — React console, public welcome, Clerk sign-in, and role-protected admin views
- `artifacts/private-label-website` — one shared tenant website at `/private-label-website/:slug`
- `artifacts/api-server/src/modules` — shared modular backend and explicitly deferred product contracts
- `lib/db/src/schema` — Drizzle schema; `lib/db/src/context.ts` — transaction-local restricted-role access
- `lib/db/migrations/development-*.sql` — development-only role and policy setup; never startup/deployment hooks
- `lib/api-spec/openapi.yaml` — API source of truth; generated hooks and validators are in sibling libraries
- `docs/foundation.md` — implementation boundaries, project structure, and recommended next work
- `docs/database-schema.md` — full table/column/constraint inventory

## Architecture decisions

- Use one modular monolith and one shared backend; channels must reuse tenant branding, assets, entitlements, pricing, orders, payments, and provider boundaries.
- Administrator privileges are explicitly assigned by an operator, never inferred from sign-up order or browser-provided roles.
- Owner-approved database isolation: every request transaction uses PostgreSQL's built-in `pg_database_owner` role (not superuser/BYPASSRLS), verifies policies/permissions, and applies transaction-local RLS context. Retain server-side role, membership, ownership and explicitly tenant-scoped SQL checks. Runtime table access must use `withDatabase`, never raw `pool`/`db`. Read-only transactions reject writes. The pool login remains privileged for explicit Development maintenance only; this is not protection against compromised server/database credentials.
- Client administrators can edit their tenant configuration and manage staff grants; only super administrators assign Client Admins or manage plans, add-ons, subscriptions, overrides, suspension and registry registration. Staff default to read-only and may receive four narrowly scoped configuration grants; staff never manage memberships.
- Effective rights come from database plans → additive add-ons → replacing tenant overrides. Missing features deny and missing limits are zero. Direct legacy module writes cannot bypass this resolver.
- Disabling or archiving a plan/add-on blocks new assignments, but retains existing assignments. Tenant suspension denies capability access and configuration mutations.
- Plan prices are metadata only. Monthly usage guards are infrastructure for deferred engines, not evidence that financial execution exists.
- Sandbox activation activates configuration only. Domains start unverified and may pass DNS TXT ownership checks; ownership verification never connects hosting or TLS.

## Product

Permanent White Label Core: shared multi-tenant backend and console; a data-driven product registry, plans/add-ons/overrides, limits/usage, scoped roles, branding, navigation, DNS ownership and validated non-secret product metadata. Exchange remains the first non-executing sandbox product; no live product engines are integrated. Current architecture, registry, provisioning, security verification and first-client blockers: `docs/white-label-core.md`. Earlier plans/website phase documentation remains historical context.

The main platform landing page includes the editable marketing product catalog. Development installation: `pnpm --filter @workspace/scripts run catalog:upgrade:dev`; checks: `pnpm --filter @workspace/api-server run verify:catalog`. Setup, API, pricing and readiness boundaries: `docs/landing-product-catalog.md`.

The customer website uses an original shared visual system, not QuickXchange's
layout, widget or identity. Tenant differences must remain configuration-driven,
never frontend forks. See `docs/customer-website.md` for branding controls,
responsive behavior, sandbox boundaries and measured verification results.

## User preferences

- Do NOT connect to, modify, migrate, or depend on the existing QuickXchange project at this stage. This platform is independent; QuickXchange must remain untouched.
- Build the foundation only. Do not build all crypto products at once.
- Do not publish to production, connect real wallets/providers, accept real deposits, or request real provider secrets in this stage.
- Current product scope is defined in `.agents/memory/exchange-only-scope.md`. The reusable core remains the foundation; do not automatically start another crypto product.

## Gotchas

- Schema declarations include RLS policies. Review the native Publish plan for policy enablement and built-in-role table/schema/sequence privileges; no custom roles are required. Never put schema/policy/grant DDL in build, startup or deployment hooks. Missing isolation metadata fails request transactions closed.
- No public first-signup administrator endpoint exists. New accounts can use the customer workspace and submit Exchange requests immediately; tenant administrator access requires explicit Super Admin provisioning/ownership assignment.
- Use the Zod namespace matching a generated schema for inferred types and caught validation errors; see `.agents/memory/validation-compatibility.md`.
- Keep database credentials server-side. Do not provision custom runtime roles. No Production migration/build/startup DDL is provided here; the user triggers native Publish and must keep Development-data overwrite disabled.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

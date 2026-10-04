# Private Label Crypto Platform — Sandbox Foundation

An independent multi-tenant administration and provisioning foundation, not a live exchange or payment gateway.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run db:role:dev` — create restricted runtime role before the first schema push
- `pnpm --filter @workspace/scripts run db:permissions:dev` — materialize runtime grants, RLS predicates, and FORCE RLS after every schema push
- `pnpm --filter @workspace/scripts run db:seed:dev` — seed only sandbox catalogs
- `pnpm --filter @workspace/api-server run verify:foundation` — development-only provisioning and tenant-isolation checks
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
- `artifacts/api-server/src/modules` — shared modular backend and explicitly deferred product contracts
- `lib/db/src/schema` — Drizzle schema; `lib/db/src/context.ts` — transaction-local restricted-role access
- `lib/db/migrations/development-*.sql` — development-only role and policy setup; never startup/deployment hooks
- `lib/api-spec/openapi.yaml` — API source of truth; generated hooks and validators are in sibling libraries
- `docs/foundation.md` — implementation boundaries, project structure, and recommended next work
- `docs/database-schema.md` — full table/column/constraint inventory

## Architecture decisions

- Use one modular monolith and one shared backend; channels must reuse tenant branding, assets, entitlements, pricing, orders, payments, and provider boundaries.
- Administrator privileges are explicitly assigned by an operator, never inferred from sign-up order or browser-provided roles.
- The development database owner bypasses RLS. Runtime transactions must switch to the restricted NOLOGIN, NOBYPASSRLS role and use transaction-local verified actor/tenant context.
- Client administrators can edit their own brand/domain/assets/configuration; only super administrators change module entitlements. Staff are read-only.
- Sandbox activation activates configuration only. Domain values are unverified references, not DNS connections or deployed websites.

## Product

Super-admin and client-admin foundations; persistent Client → Brand → Domain → Modules → Assets/Networks → Configuration provisioning; independent entitlements for crypto_exchange, crypto_payments, telegram_bot, telegram_mini_app, website, and merchant_api. Product execution is deferred.

## User preferences

- Do NOT connect to, modify, migrate, or depend on the existing QuickXchange project at this stage. This platform is independent; QuickXchange must remain untouched.
- Build the foundation only. Do not build all crypto products at once.
- Do not publish to production, connect real wallets/providers, accept real deposits, or request real provider secrets in this stage.
- Stop after the foundation and report the implementation, schema, structure, and recommended next work.

## Gotchas

- After schema pushes, run the development permission command before starting the API. See `.agents/memory/rls-policy-materialization.md` for the schema-tool behavior behind this requirement.
- No public first-signup administrator endpoint exists. New accounts remain unassigned until explicit operator setup.
- Use the Zod namespace matching a generated schema for inferred types and caught validation errors; see `.agents/memory/validation-compatibility.md`.
- Before any future production launch, replace owner-backed connection sessions with separately configured restricted runtime credentials and review deployment-side role/policy readiness. No production migration/startup DDL is provided here.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# Project 1 QuickXchange reference architecture

Reference: `https://github.com/quickXchange/QuickXchange-.git`, pinned commit in `inventory/summary.json`. Read-only sparse checkout in `/tmp`; no install/start/test/provider/database command was executed there.

## Current source structure

| Area | Observed implementation / source |
|---|---|
| Frontend | `artifacts/crypto-exchange-widget`: React/Vite, Wouter, shared public exchange, tracking, customer account, operator/admin/CRM/pricing/integration screens. Existing large `src/App.tsx` composes those routes; do not replace it with the source console App. |
| Channels | `artifacts/quickxchange-telegram-mini-app`; Telegram exchange/support/news services are separate domains. Do not replace credentials or handlers to add white-label capabilities. |
| Backend | Express 5 modular routes, generated OpenAPI/Zod clients; existing `routes/exchange.ts` contains operational exchange and administration flows. Preserve stable public and private contracts. |
| Database | PostgreSQL/Drizzle, 92 declared tables. Operational exchange orders are typed financial/settlement records, not Source Project 2's JSON sandbox request rows. |
| Operator access | `lib/operator-auth.ts`, `permissions.ts`, `schema/operators.ts`: global Owner/operator records, custom team roles, allow/deny rules, auth version, verified Clerk email and trusted TOTP requirements. Owner-only permissions cannot be inherited by tenant administrators. |
| Customer access | `lib/customer-auth.ts`, exchange customers/profiles and ownership snapshots on orders; suspension/verified identity checks. Guest tracking is distinct from logged-in ownership. |
| Manual exchange | Manual desk pricing, Swap/Buy/Sell/Convert operational order flows, settlement snapshots, source/target funding selection, status and record versions, idempotency/provider outcome protections. This is not proof of a classic exchange matching engine. |
| Provider flow | Quickex V2 routes/signing/orders, WhiteBIT deposit/address/history/permission proofs, provider integrations, monitoring observations/matches. Source presence means provider-capable implementation, not a confirmed live connection. |
| Financial controls | WhiteBIT ledger/deposit mappings, manual reserve/pricing/add-on/revenue handling, order and affiliate audits. Do not reinterpret source sandbox reserves/quotas as these financial records. |
| Directories | `crypto_assets`, `crypto_asset_networks`, fiat currencies and payment methods/associations; network/provider mapping and permission verification. Exact identity mapping is required before tenant assignments reuse these directories. |
| Branding/content | Website branding, public site content/publications, landing background assets, logos, navigation/social trust, blog/newsletter. Preserve global QuickXchange presentation and publication workflow. |
| Customer engagement | Affiliate accounting/payout requests, contact forms, customer notifications, newsletter/blog and Telegram support. These exceed Project 2's implemented functionality and must remain unchanged. |
| Jobs | Startup status-notification, WhiteBIT history, blog scheduler, newsletter, Telegram notification/news/support and monitoring worker initialization appears in `src/index.ts`. Do not start a second copy from white-label code. |
| Build/deployment | Existing `scripts/production-build.mjs`, `production-api-start.mjs`, clean artifact verification and production-start tests. Preserve destination production build/start contract; source startup is not an appropriate replacement. |

## Dependency compatibility

Both projects use pnpm workspaces, Node 24, TypeScript, React/Vite/Wouter, Express 5, PostgreSQL/Drizzle, Clerk and Orval-generated API packages.

They are **not identical dependency sets**. For example, source API directly lists Zod and CORS; target API has additional XML/sanitization/image/crypto/network/provider integrations. Clerk, storage and build tool versions differ. `catalog:` and `workspace:` are indirections, not exact version equivalence. See the per-package dependency map and each project's workspace/lockfile before installing anything.

Reuse compatible target dependencies and generated clients; scope source package names instead of replacing target `@workspace/db`, `@workspace/api-zod`, or `@workspace/api-client-react`. Preserve Zod namespace compatibility when adapting source validators.

## White-label integration points

1. Add a separate white-label administration/customer route subtree.
2. Add tenant memberships/configuration/entitlements in an isolated database schema.
3. Authenticate with existing verified Clerk sessions; resolve white-label membership server-side.
4. Expose a typed tenant-aware facade when, and only when, operational exchange integration is separately approved.
5. Keep source simulated orders in their own store until the facade, tenant propagation and lifecycle translation are fully verified.
6. Bind any future provider/ledger/notification integration to a verified tenant and server-authorized permissions.

## Evidence limits

Only checked-in source was reviewed. Project 1's actual database, data, credentials, provider permissions, published deployment, active users, KYC processing and financial liveness were not queried. Its tests/build were inventoried but not run against this workspace's database. No production-readiness or complete tenant isolation claim is made for its current single-platform flows.

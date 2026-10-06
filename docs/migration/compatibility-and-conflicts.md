# Compatibility and conflicts

## Database comparison

`inventory/database-map.csv` covers every declared Project 2 table. Both JSON inventories include all columns and source constraint/reference declarations.

**Confirmed collision: `exchange_orders`.**

- Project 2: UUID, tenant reference, action/status, JSON request/configuration, sandbox-only constraint.
- Project 1: text ID, operational order type/status/version, asset/network/amount fields, customer ownership, deposit/refund/destination details, provider IDs/state, settlement/funding/pricing snapshots, financial review and synchronization fields.
- These are not interchangeable rows. Neither an automatic schema push nor copying the source `ordersTable` into target `@workspace/db` is acceptable.

**Planned resolution:** new `white_label` PostgreSQL schema for source administration/configuration and simulated orders. Preserve `public.exchange_orders` and every existing Project 1 table. Implement schema-qualified Drizzle declarations and SQL, including foreign keys, constraints and indexes. Do not set a pool-wide `search_path` or rely on transaction context to resolve authorization.

Source customer request events/files are relationship-scoped, not directly tenant-scoped. Global plans/catalogs and tenant-local assignments must retain their distinct visibility.

No schema creation or data migration has been performed. This namespace is a migration design, not an existing database object.

## API comparison

- Project 2 declares 76 OpenAPI operations; Project 1 declares 293.
- Exact method/path overlap in these specifications: **`GET /healthz`**.
- Generated component name conflicts: **`ExchangeOrderInput` and `HealthStatus`**.
- Source has three additional Express routes absent from its OpenAPI specification: visual file content, customer attachment upload, and private attachment content. They also need namespace/access review; the typed API alone is not a complete inventory.
- The router method/path counts exclude middleware mounts. Actual guard ordering was reviewed separately.

**Planned resolution:**

1. Mount migrated source API under `/api/white-label/*`; keep target `/api/*` unchanged.
2. Namespace migrated operation IDs and component schemas, e.g. `WhiteLabelExchangeOrderInput`, rather than overwrite target generated types.
3. Integrate source contracts into the target OpenAPI generation pipeline with named component request bodies; retain the target API title and generated module identity.
4. Add contracts for upload/content exceptions or keep narrowly documented binary endpoints; preserve their explicit ownership and streaming behavior.
5. Rewrite source hardcoded `/api/exchange/visual-assets/…` references consistently. A moved route without a manifest/renderer matcher update breaks logos.
6. Test canonical path and parameter equivalence, not just operation names.

## Authentication/authorization conflicts

| Source semantic | Target semantic | Required resolution |
|---|---|---|
| `super_admin` | Global desk `owner`, verified identity/TOTP/Owner-only permissions | Explicit reviewed bridge; retain stronger target gates. No source-only grant may bypass target Owner protections. |
| `client_admin` | Tenant-local membership, not an existing global desk operator | New white-label authority only. Do not grant target CRM, ledger, provider or finance access. |
| Tenant staff grants | Global operator custom roles/allow/deny | Separate permission namespace; tenant grants cannot be translated into global finance rights. |
| Unassigned customer | Existing customer/guest/account model | Preserve one Clerk account and original customer records. White-label purchasing does not imply administrator access. |
| Demo session | Expiring read-only sandbox capability | Disable by default; never accept demo authority at target operational/financial routes. |
| Public tracking token | Customer access to one simulated order | Purpose-bound token, not authentication, membership or platform-wide order lookup. |

Never accept role/tenant/Owner claims from browser state, query parameters, branding configuration or raw Clerk display metadata.

## Exchange/provider conflicts

- Source `manual` provider is a sandbox quote/calculation choice. Its WhiteBIT/ChangeNOW/QuickX/RPC entries are inert metadata and reject credentials.
- Target has provider-capable operational workflows, credential and nonce protection, address-permission proofs, history/ledger/outbox state and monitoring jobs.
- Source numeric reserve controls are configured values, not a verified provider balance or target reserve ledger.
- Source generic order/pricing/payment modules are deferred; the implemented sandbox Exchange lives under `products/exchange`.
- Therefore copying source Exchange over target execution would remove functionality and safety controls. Use a typed tenant-aware facade only after separately authorized lifecycle/capability translation; do not claim live provider integration in the migrated sandbox.

## Frontend/package/build conflicts

- Two complete App/router/theme/global CSS systems cannot be overlaid at root. Put white-label routes/styles in a subtree; keep QuickXchange's account/trade/admin routes and identity.
- Source tenant renderer is configuration-driven. Do not create per-client source forks.
- Source `@workspace/db`, `@workspace/api-zod`, API client and amount/schema exports overlap with target workspace packages. Integrate namespaced exports/packages; preserve all existing consumers.
- Reuse target React/Clerk/Express/Drizzle versions only after compatibility checks. No forced major overrides, blanket dependency replacement or copied lockfile.
- Source root workspace commands include Development setup helpers. Do not attach them to target build/startup/deployment.
- Source canvas/mockup artifact and uploaded brief are design/reference tooling, not required runtime dependencies of the migrated product.

## Data/branding/storage conflicts

- A white-label customer and a Project 1 exchange customer are different business relationships that may share a Clerk identity. Never merge by email/name alone.
- Source per-tenant themes may be migrated; source platform QXLayer defaults must not silently replace QuickXchange's global branding.
- Platform art is public; customer request attachments are private. Do not broaden bucket/object permissions to solve missing imagery.
- Source object paths and app-relative URLs are environment-specific. Transfer artwork bytes, map paths, verify hashes, and remove any runtime dependency on the source project.
- Do not copy fixtures, session credentials, API-key hashes, provider secrets, source customer data or runtime-generated quote/tracking tokens into the destination by default.

## Unverified compatibility

Source declarations do not prove live schema parity, existing target data compatibility, provider readiness, production permissions or deployment settings. A destination baseline and a reviewed Development migration dry-run are mandatory before any implementation merge.

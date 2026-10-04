# Plans, entitlements and shared tenant website

## Scope

This is an independent sandbox platform. QuickXchange is not connected, copied, changed or used as a dependency. No production deployment, billing collection, crypto payment execution, blockchain connection, real wallet or Telegram integration is included.

## Database

Ten new RLS-protected tables extend the foundation:

- `entitlement_definitions`: registered keys, labels, feature/limit kind and boolean/integer/decimal value type.
- `plans`: editable name, description, monthly/yearly prices, setup fee, currency, billing label, display order and lifecycle status.
- `plan_entitlements`: typed JSON values per plan/key.
- `addons` and `addon_entitlements`: optional feature grants and numeric increments.
- `tenant_subscriptions`: one assigned plan per tenant, subscription status and previous tenant status for resuming suspension.
- `tenant_addons`: tenant-to-add-on assignments.
- `tenant_entitlement_overrides`: replacing values and mandatory reasons, isolated to one tenant.
- `tenant_usage_counters`: UTC monthly counters keyed generically by tenant, entitlement key and month.
- `tenant_payment_methods`: sandbox label-only configuration, never a payment provider connection.

Additional columns: `tenant_branding.website_settings` contains allowlisted advanced website settings; `audit_events.metadata` records changes; staff membership and webhook records have labels. There are now 27 FORCE RLS tables. Development permission setup materializes actual predicates after schema pushes. Runtime uses the restricted NOBYPASSRLS role.

Every newly created tenant must select an enabled plan. Any pre-existing tenant without a subscription is explicitly unassigned and cannot perform tenant configuration or product operations; the operator must assign a plan. No default tier or administrator is inferred.

## Resolution

1. Initialize every registered feature to `false`, every limit to `"0"`.
2. Apply the assigned plan's typed values.
3. Apply assigned add-ons: boolean feature grants OR together; numeric limits add using exact decimal arithmetic.
4. Apply explicit tenant overrides, replacing the combined value.
5. An unassigned or suspended subscription denies all features and zeroes all operational limits.
6. Exchange subfeatures require their parent `crypto_exchange`; API key/webhook configuration requires `merchant_api`. Declared values remain visible in the underlying plan/override records.

Disabling or archiving a plan, or disabling an add-on, prevents new assignments. Existing assignments retain their terms. Changing a tenant's plan deliberately retains its add-ons and overrides. A downgrade never deletes data: over-limit usage is reported and additions exceeding the relevant quota are rejected. Operators can remove/revoke existing resource configuration to return within limits.

New registered keys flow through the resolver and generic editors without a plan-schema migration. New product engines still require explicit implementation and must use the shared authorization/admission services.

## Server-side enforcement

- Verified Clerk identity and DB-assigned roles are required. Only Super Admin manages plan/add-on catalogs, subscription assignments, overrides and suspension.
- No legacy `tenant_modules` mutation can bypass plan resolution. That endpoint explicitly rejects direct writes; effective rights no longer read that table as an authority.
- Asset/network saves count distinct assets and distinct networks, not just pairs.
- Staff assignments, API key issuance, webhook configuration and payment-method labels lock the tenant, check effective feature access and the corresponding count limit, and write/audit in one transaction.
- Staff management can only assign/remove read-only `staff`; it cannot change Client Admin or platform administrator roles. Explicit development CLI staff assignments also check capacity.
- Sandbox API keys are hashed at rest and shown once. They have no execution scopes or merchant authentication endpoint yet. Webhooks remain disabled with delivery deferred. Payment methods are labels only; no wallet/provider reference is accepted.
- Monthly transaction and plan-currency volume admission uses UTC month counters, exact 18-decimal arithmetic, tenant serialization and transactional updates. It is an internal guard for future engines, not a transaction endpoint. A future engine must normalize quoted volume to the plan currency and call it in the same transaction as its business write. Current deferred engines perform no financial writes and return an explicit unavailable response.
- Brand/domain/assets/config/website mutations and activation cannot bypass suspension. Read-only administration remains available. Suspension is reversed to the previous active/draft state.
- Shared catalog versions use transaction advisory read/write locks: PostgreSQL row-locking SELECTs would apply write-denying RLS to read-only tenant readers.

## Website structure and safety

`artifacts/private-label-website` is a single React template, never copied per tenant:

- `/private-label-website/`: enter a tenant slug; there is no guessed/default tenant.
- `/private-label-website/:slug`: shared branded home.
- `/:slug/:feature`: entitlement-gated foundation-only capability pages.
- `/:slug/privacy` and `/:slug/terms`: tenant-authored text, escaped rather than rendered as raw HTML.

The public API resolves an explicit active tenant slug under narrowly scoped RLS, then returns only brand name/logo, colors, theme, advanced website settings, effective feature flags and configured sandbox assets. It does not return tenant UUIDs, plan/pricing records, usage, overrides, staff, keys or webhook configuration. Unknown, suspended, unassigned or website-unentitled tenants have no public site. Disabled capability URLs receive server-side rejection. Responses are `no-store`.

CSS tokens and document settings apply primary/secondary/accent colors, light/dark/system theme, curated font choices, logo/favicon, hero copy, support, social links, footer, privacy and terms. URLs must use HTTPS without credentials. No uploads or stored file bytes are added in this phase.

Domains remain unverified configuration and are not activated or used as live custom-domain routes. The administration console is a separate authenticated surface at the workspace root.

## Administration pages

- `/plans`, `/plans/new`, `/plans/:id`: list/create/edit/duplicate/enable/disable/archive plans.
- `/add-ons`: create/edit add-on definitions and grants/increments.
- `/clients/new`: plan-aware provisioning.
- `/clients/:id`: subscription/status, effective rights with sources, usage vs limits, operator assignment/override/suspension controls, branding/domain/website settings and quota-controlled resource configuration.
- Client Admin sees only its tenants and permitted functional settings. Staff are read-only. Catalog/subscription mutation controls are Super Admin only.
- `/activity`: audited catalog and tenant changes, tenant-scoped for client roles.

## Verification and development demonstrations

`pnpm --filter @workspace/api-server run verify:foundation` tests:

- two different tenant plans, plan metadata/lifecycle/duplication and registering a future key without a schema change;
- disabled-feature rejection, add-on numeric addition/feature grants and replacing/revoking overrides;
- all eight quota boundaries, distinct asset/network counts, concurrent creation at capacity and exact monthly-volume boundaries;
- no data deletion on downgrade, cleanup, suspension, no activation bypass and resuming prior status;
- website branding/feature/asset isolation and the public-safe response allowlist;
- restricted-role cross-tenant reads/writes, no-context denial, role escalation denial, tenant-composite foreign keys, sandbox constraints, audit events and live RLS predicates.

All verification fixtures and synthetic administrator grants are removed in `finally`.

`samples:plans:dev` explicitly creates two persistent development demonstrations (does not overwrite existing slugs): Aster Sandbox on Sample Plan A with exchange/Swap, and Nexa Sandbox on Sample Plan B with Convert/payments/developer rights. Colors, themes, fonts, hero, legal/support copy and asset counts differ. Aster has a tenant-only limit override; Nexa has an add-on increment. These are editable database rows, not application tiers. No real administrator or tenant membership is assigned.

## Deferred

Billing/payment collection, actual exchanges/quotes/orders, invoice lifecycle/payment detection, blockchain and real wallet operations, webhook delivery, functional merchant API execution, Telegram, verified custom-domain serving and production publishing remain deferred. This phase stops here.
# PostgreSQL Schema — Sandbox Foundation

Source: `lib/db/src/schema`. PostgreSQL retains the application's global catalogs and identity/tenant/business tables. Access is enforced by server-side authorization and explicitly scoped queries.
UUID primary keys use `gen_random_uuid()` unless otherwise noted. Timestamps are `timestamptz`.
Every tenant-owned table has `tenant_id` referencing `tenants.id`; `tenants.id` is the tenant root.
The platform administrator table is global and identity-scoped. Catalogs are global, shared, and read-only at runtime.

## Identity and tenant roots

| Table | Columns and key constraints |
|---|---|
| `tenants` | `id uuid PK`; `name text NOT NULL`; `slug text NOT NULL UNIQUE`; `status text NOT NULL DEFAULT 'draft'` constrained to draft/active/suspended; `environment text NOT NULL DEFAULT 'sandbox'` constrained to sandbox; `completed_steps text[] NOT NULL DEFAULT {}`; `created_at`, `updated_at` NOT NULL DEFAULT now() |
| `platform_admins` | `clerk_user_id text PK`; `active boolean NOT NULL DEFAULT true`; `created_at NOT NULL DEFAULT now()`. Runtime may only read its own identity. Explicit owner/operator setup controls assignment. |
| `tenant_memberships` | `tenant_id uuid FK`; `clerk_user_id text`; composite PK `(tenant_id, clerk_user_id)`; `role text NOT NULL DEFAULT 'client_admin'` constrained to client_admin/staff; `active boolean NOT NULL DEFAULT true`; `created_at NOT NULL DEFAULT now()` |

Clerk stores authentication identities. The database stores explicit platform/tenant authorization mappings, not passwords or browser-supplied roles.

## Shared catalogs

| Table | Columns and key constraints |
|---|---|
| `module_catalog` | `key text PK`; `name`, `description`, `category text NOT NULL`; `sandbox_available boolean NOT NULL DEFAULT true`. This indicates configuration-entitlement availability, not completed product execution. |
| `asset_catalog` | `id text PK`; `symbol`, `name text NOT NULL` |
| `network_catalog` | `id text PK`; `name text NOT NULL`; `testnet boolean NOT NULL DEFAULT true` |
| `asset_network_catalog` | `id text PK` using asset:network IDs; `asset_id text FK asset_catalog`; `network_id text FK network_catalog` |

Seeded: 6 module definitions, 5 assets, 5 sandbox networks, 7 supported asset/network pairs.

## Tenant configuration

| Table | Columns and key constraints |
|---|---|
| `tenant_branding` | `tenant_id uuid PK/FK`; `brand_name text NOT NULL`; nullable `logo_url text`; `primary_color text NOT NULL DEFAULT '#0F766E'`; `accent_color text NOT NULL DEFAULT '#14B8A6'`; `theme_mode text NOT NULL DEFAULT 'system'` constrained to light/dark/system; `default_language text NOT NULL DEFAULT 'en'`; `supported_languages text[] NOT NULL DEFAULT ['en']` |
| `tenant_domains` | `tenant_id uuid PK/FK`; `domain text NOT NULL UNIQUE`; `status text NOT NULL DEFAULT 'unverified'` constrained to unverified |
| `tenant_modules` | Composite PK `(tenant_id, module_key)`; `tenant_id uuid FK`; `module_key text FK module_catalog.key`; `enabled boolean NOT NULL DEFAULT false`; `updated_at NOT NULL DEFAULT now()`. Only the super-admin context can mutate entitlements. |
| `tenant_asset_networks` | Composite PK `(tenant_id, asset_network_id)`; `tenant_id uuid FK`; `asset_network_id text FK asset_network_catalog.id` |
| `tenant_configuration` | `tenant_id uuid PK/FK`; `environment text NOT NULL DEFAULT 'sandbox'` constrained to sandbox; `exchange_enabled`, `payments_enabled`, `allow_guest_checkout boolean NOT NULL DEFAULT false` |

## Future shared financial storage — no execution endpoints

| Table | Columns and key constraints |
|---|---|
| `pricing_rules` | `id uuid PK`; `tenant_id uuid FK`; `name text NOT NULL`; `fee_bps numeric(10,2) NOT NULL DEFAULT 0` constrained nonnegative; `environment text NOT NULL DEFAULT 'sandbox'` constrained sandbox; UNIQUE `(id,tenant_id)` |
| `exchange_orders` | `id uuid PK`; `tenant_id uuid FK`; nullable `pricing_rule_id uuid`; `status text NOT NULL DEFAULT 'draft'`; `environment text NOT NULL DEFAULT 'sandbox'` constrained sandbox; `request jsonb NOT NULL DEFAULT {}`; `created_at NOT NULL DEFAULT now()`; UNIQUE `(id,tenant_id)`; composite FK `(pricing_rule_id,tenant_id)` → `pricing_rules(id,tenant_id)` |
| `payment_invoices` | `id uuid PK`; `tenant_id uuid FK`; `amount numeric(36,18) NOT NULL` constrained positive; `currency text NOT NULL`; `status text NOT NULL DEFAULT 'pending'` constrained to pending/waiting_for_payment/payment_detected/confirming/paid/expired/underpaid/overpaid/failed/refunded; `environment text NOT NULL DEFAULT 'sandbox'` constrained sandbox; `created_at NOT NULL DEFAULT now()`; UNIQUE `(id,tenant_id)` |

Amounts are decimal strings in service contracts, not floating-point numbers. A full accounting ledger, balances, exchange engine, and refund workflow remain deferred.

## Future integration and infrastructure storage

| Table | Columns and key constraints |
|---|---|
| `wallet_configurations` | `id uuid PK`; `tenant_id uuid FK`; `asset_network_id text NOT NULL`; `strategy text NOT NULL DEFAULT 'sandbox'`; `environment text NOT NULL DEFAULT 'sandbox'`; CHECK environment=sandbox AND strategy=sandbox; composite FK `(tenant_id,asset_network_id)` → tenant_asset_networks |
| `blockchain_provider_configs` | `id uuid PK`; `tenant_id uuid FK`; `network_id text NOT NULL`; `adapter text NOT NULL DEFAULT 'sandbox'`; `priority text NOT NULL DEFAULT 'primary'` constrained primary/secondary/manual; `environment text NOT NULL DEFAULT 'sandbox'`; CHECK environment=sandbox AND adapter=sandbox |
| `api_keys` | `id uuid PK`; `tenant_id uuid FK`; `label text NOT NULL`; `key_hash text NOT NULL UNIQUE`; `scopes text[] NOT NULL DEFAULT {}`; sandbox-constrained `environment`; nullable `revoked_at timestamptz`. Sandbox keys are returned once; only hashes are stored and no execution scopes are assigned. |
| `webhook_endpoints` | `id uuid PK`; `tenant_id uuid FK`; `label text NOT NULL`; `url text NOT NULL`; `enabled boolean NOT NULL DEFAULT false`; sandbox-constrained `environment`. No delivery worker or signing secret is configured. |
| `notification_events` | `id uuid PK`; `tenant_id uuid FK`; `channel text NOT NULL`; `payload jsonb NOT NULL DEFAULT {}`; `status text NOT NULL DEFAULT 'sandbox_queued'`; sandbox-constrained `environment`. No outbound transport is configured. |
| `audit_events` | `id uuid PK`; nullable `tenant_id uuid FK` for platform-wide operator events; `actor_id`, `event_type`, `description text NOT NULL`; `created_at NOT NULL DEFAULT now()`. Runtime privileges are SELECT/INSERT only; no update/delete. |

There are no private wallet keys, seed phrases, provider credentials, real deposit addresses, or webhook secrets in these tables.

## Application authorization

- Database RLS and the custom runtime-role dependency have been removed. Requests use the configured PostgreSQL login, including the existing owner login.
- Every API database operation runs in a transaction. Read requests use `BEGIN READ ONLY`; authorized writes use `BEGIN`. Transaction-local actor/tenant settings are context, not row filtering.
- The API resolves roles from explicit database assignments after verifying Clerk identity. It validates membership before setting tenant context.
- Ordinary tenant services validate membership and scope SQL by the authorized tenant ID; writes additionally validate the required permission. Unassigned users cannot call administrator services.
- Super Admin services can cross tenant boundaries. Catalog and subscription mutations require explicit Super Admin checks; tenant Client Admins can manage quota-checked staff, never administrator roles.
- Customer order, history and attachment services check customer ownership. Internal notes are excluded from customer responses. Activity feeds explicitly filter by authorized tenant.
- Privileged database credentials are never supplied to customers. Direct SQL under the configured login is privileged and is not a tenant-isolation boundary.
- Transaction-local context is cleared by COMMIT/ROLLBACK before a connection returns to the pool.
- Verification exercises application/service authorization, cross-tenant denial and read-only transactions, rather than claiming raw owner SQL is tenant-isolated.

The explicit development access cleanup removes legacy policies, disables RLS and revokes/drops only the obsolete role. It compares every public table's row counts and content fingerprints in one transaction; mismatches roll back the cleanup. No tables or records are deleted or recreated.
No startup-time DDL, production migration script, or deployment hook is included.

## Plans and shared website extension

The ten added tables and all added columns are described in `docs/plans-entitlements-website.md`.
Tenant branding includes allowlisted JSON website settings; audit events include JSON change metadata.
Existing `tenant_modules` rows are retained for compatibility, but do not grant effective access.
# PostgreSQL Schema — Sandbox Foundation

Source: `lib/db/src/schema`. There are **21 application tables**: four global catalog tables and 17 RLS-protected identity/tenant/business tables.
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
| `api_keys` | `id uuid PK`; `tenant_id uuid FK`; `label text NOT NULL`; `key_hash text NOT NULL UNIQUE`; `scopes text[] NOT NULL DEFAULT {}`; sandbox-constrained `environment`; nullable `revoked_at timestamptz`. No raw keys are stored or issued. |
| `webhook_endpoints` | `id uuid PK`; `tenant_id uuid FK`; `url text NOT NULL`; `enabled boolean NOT NULL DEFAULT false`; sandbox-constrained `environment`. No delivery worker or signing secret is configured. |
| `notification_events` | `id uuid PK`; `tenant_id uuid FK`; `channel text NOT NULL`; `payload jsonb NOT NULL DEFAULT {}`; `status text NOT NULL DEFAULT 'sandbox_queued'`; sandbox-constrained `environment`. No outbound transport is configured. |
| `audit_events` | `id uuid PK`; nullable `tenant_id uuid FK` for platform-wide operator events; `actor_id`, `event_type`, `description text NOT NULL`; `created_at NOT NULL DEFAULT now()`. Runtime privileges are SELECT/INSERT only; no update/delete. |

There are no private wallet keys, seed phrases, provider credentials, real deposit addresses, or webhook secrets in these tables.

## Authorization and RLS

- All 17 identity/tenant/business tables have both ENABLE RLS and FORCE RLS.
- Runtime role: `private_label_runtime`, NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT, NOBYPASSRLS.
- Every API database transaction executes `SET LOCAL ROLE private_label_runtime` and transaction-local settings for the verified actor, selected tenant, super-admin status, and write permission.
- The API resolves roles from explicit database assignments after verifying Clerk identity. It validates membership before setting tenant context.
- Ordinary tenant reads require a matching tenant context; writes additionally require write permission. No-context sessions cannot read tenant data.
- Super-admin context can cross tenant boundaries. Membership and module-entitlement writes require super-admin context.
- Platform-admin lookup is limited to the current actor. Audit inserts must match the actor context.
- Runtime grants do not permit tenant deletion or platform-admin mutation. Shared catalogs are SELECT-only.
- Transaction-local context is cleared by COMMIT/ROLLBACK before a connection returns to the pool.
- Schema owner/setup connections bypass RLS and must never be mistaken for an isolation test. The verification command exercises the restricted role.

The development-only access SQL materializes live PostgreSQL predicates and runtime grants after schema pushes.
No startup-time DDL, production migration script, or deployment hook is included.
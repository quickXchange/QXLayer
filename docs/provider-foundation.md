# QXLayer provider foundation

## Scope and execution safety

This is administration and architecture only. No provider adapter is installed.
No external calls, connection tests, transactions, addresses, wallets, automatic
failover or trusted incoming webhook endpoint exist. `executionEnabled` is always
false. Existing Exchange quote calculation, simulated order creation and tracking
continue using their unchanged sandbox implementation.

The new central catalog starts empty. Administrators create intentional provider
definitions; there are no sample companies or invented operational health data.
The old non-executing Exchange metadata catalog remains solely for backward
compatibility with saved legacy configuration and regression checks. The new
Integrations screens, assignments and routing boundary use the database catalog,
not those legacy company names.

## Models

- `provider_catalog`: UUID, definition, creation/update timestamps. Definitions
  have multiple extensible categories, supported services/capabilities/environments,
  availability, field schemas, access policy and tenant configurability.
- `provider_assignments`: unique tenant/provider/capability/environment scope,
  schema-validated non-secret configuration and timestamps.
- `provider_policies`: unique tenant/resource-scope/resource/capability policy.
  Route or asset-network resource must belong to that tenant. Selection is scoped
  by environment, primary/secondary provider, required capability and fallback.

New models are exported through the normal Drizzle schema. Apply development
changes with the existing schema workflow. There are no runtime DDL, publishing
hooks, custom database roles or production migration scripts.

Policies are separate from the Exchange's financial configuration. Saving a future
policy does not change current routes, network fees, quote hashes, prices or order
snapshots. A policy selecting Provider is **planned mode**, not current execution.
Removing a policy returns to the implicit sandbox/manual metadata default.

## Capability-based adapter architecture

Future domain flow: Exchange core → provider service/selection → registry →
capability adapter. No provider-name branching is needed.

The adapter contracts include rates/markets, quotes/conversions/status, payments,
deposits, RPC/transactions and signature verification/normalized webhook events.
Capabilities and environments are checked before selecting an adapter. Unsupported
capabilities return an explicit unsupported/not-implemented result.

Catalog availability (`coming_soon`, `configuration_only`, `available`, `disabled`)
is independent of connection state. Current catalog connection is `not_configured`.
An assignment can have non-secret metadata `configured`, but it is still **not
connected** and its credential state remains `not_configured`. The future
connection-state contract includes testing/connected/error; no API accepts those
states or infers connectivity from a toggle.

## Authorization and entitlements

Only Super Admin can create/edit the catalog and create/remove tenant assignments.
Tenant configuration and policy writes require the existing `configuration.manage`
authorization and operational Exchange entitlement. Route policy writes/selection
also enforce the corresponding action entitlement.

Access policies support platform-wide discovery, existing feature entitlement
(plan, add-on and override effective resolution), or explicit assignment. Explicit
tenant assignments are still required before selecting providers in policies.
No parallel plan system or newly invented entitlement keys are introduced.
Provider selection re-checks effective entitlements, current resource ownership,
assignment, capability, environment and availability.

Tenant responses omit global credential schemas, other tenants' data/counts, and
non-tenant-configurable configuration values. Tenant views cannot edit global
provider definitions or create assignments. Read-only staff cannot write.

## Credential security

**Encrypted provider-credential persistence is NOT provisioned in this phase.**
The existing AES-256-GCM helper is not a complete credential vault: it has no
provisioned, versioned provider key or storage/lifecycle integration.

The new credential vault interface binds tenant, provider and environment. It
exposes masked state and server-only callback access; its default implementation
refuses secret writes and reads with 501. No real key is requested, no credential
entry endpoint/UI exists, and no plaintext/encrypted credential database column
is added. Credential schemas are field descriptors, never credential values.

Future vault implementation must use a provisioned server-side key, authenticated
encryption bound to all scope dimensions, versioned key rotation and secret-free
API/log/audit projections. Do not reuse the legacy helper without incorporating
environment into its authenticated context and a reviewed key/storage design.

Non-secret configuration is scalar and schema-limited. Sensitive field names and
credential/configuration overlap are rejected; public URL fields cannot contain
user info, queries or fragments. API/audit projections never include secret
values. Audit contains safe IDs/status/counts, never field values.

## Future failover and webhooks

Primary/secondary/manual policies are configuration only. A distinct secondary
provider must have the same compatible, allowed tenant capability/environment
assignment. No automatic external execution or failover exists.

Before enabling future failover: persist an operation ledger and unique scoped
idempotency keys; distinguish definitive rejection from ambiguous success/timeouts;
reconcile the primary result before another side effect; make retries resumable.
The operation contracts require an idempotency key for side effects.

The generic webhook function is not mounted to HTTP. It requires an implemented
signature verifier before normalization, resolves a tenant from a verified account
binding (not an untrusted tenant ID), and requires atomic event receipt/domain
processing through a `processOnce` interface. No receipt store or fake signature
verification is implemented. Before exposure, implement a unique receipt key
(provider/environment/tenant/event), signature replay/expiry checks, raw-body
handling, binding validation and transactional domain processing.

## Verification

- Pure provider tests: registry, capabilities, permissions, environment/tenant
  isolation, credential rejection/vault refusal, schemas, compatibility, fallback,
  entitlement checks, unsupported execution and webhook rejection.
- Development integration verification: `NODE_ENV=development` then
  `pnpm --filter @workspace/api-server exec tsx src/verification/provider-foundation.ts`.
  Uses disposable native fixture tenants/plan and removes them by default.
- Existing Exchange verification:
  `NODE_ENV=development pnpm --filter @workspace/api-server run verify:exchange`.
- Generated OpenAPI schemas/hooks and normal API/console type checks are required.

Choose and review the first real provider separately before implementing an adapter,
provisioning its vault, connection verification, idempotency ledger or live execution.

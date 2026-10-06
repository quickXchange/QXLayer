# Staged migration plan

## Preconditions and scope

The audit/map stage is complete in Project 2. QuickXchange remains reference-only. Destination implementation begins only in an authorized Project 1 workspace/branch; do not execute the following Development database steps in this source workspace or against Production.

Goal: add source white-label administration, tenant identity/configuration/entitlements and sandbox capability to Project 1 while preserving its exchange engine, authentication, data, providers, ledger, CRM, jobs and build contract. No runtime calls back to Project 2.

Not goals: building advertised deferred products, enabling live financial execution, copying production/customer data, connecting wallets/providers, replacing the database or publishing.

## Phase 0 — authoritative baseline

1. Refresh the read-only reference to the authorized destination revision and rerun the audit.
2. Record existing target route/schema/package identities and all relevant native tests.
3. Obtain a destination Development snapshot with a verified restoration procedure; confirm environment identity without displaying secret values.
4. Record row counts/checksums for existing target financial/auth/catalog state via approved database tooling. No mutation yet.
5. Establish explicit feature flag and a rollback checkpoint; newly added white-label routes remain disabled initially.

**Gate:** destination authority, current baseline, safe Development database, no unknown legacy migrations.

## Phase 1 — isolate contracts and schema

1. Add a source-derived module/package namespace, not a replacement backend.
2. Define schema-qualified `white_label` tables and all tenant/relationship constraints using the destination Drizzle conventions.
3. Add explicit additive Development DDL; do not run source schema-push/seed/RLS-cleanup scripts.
4. Prefix API paths, operation IDs and component names; preserve the existing API title/build pipeline.
5. Regenerate typed validators/client code and typecheck the destination.
6. Verify all original tables/data remain unchanged and no original permission/provider objects were created/replaced/dropped.

**Gate:** baseline tests, data invariants, schema constraints and complete API inventory pass. No live services.

## Phase 2 — authenticated tenant core

1. Resolve the existing verified Clerk identity.
2. Add explicit Owner bootstrap mapping and tenant memberships; retain Project 1 verified-email/TOTP/permission enforcement.
3. Reuse source effective entitlements, decimal limits, tenant locks/admission and audited configuration behavior after namespace adaptation.
4. Bind every query/mutation to server-authorized tenant/customer/request ownership; do not trust requested tenant IDs.
5. Migrate tenant provisioning, branding, website settings, plans/add-ons/overrides/subscriptions, staff scopes and domain ownership controls.

**Gate:** cross-tenant read/write and privilege escalation matrix, suspended/no-feature/no-quota behavior, concurrent admission, no global finance access.

## Phase 3 — customer/operator workflow

1. Add source customer catalog, requirements/snapshots, idempotent request submission, private attachments and visible/internal events.
2. Integrate operator review, provisioning and explicit delivery under the preserved target operator boundary.
3. Deliver an administrator membership to the existing verified customer account; do not create a second login.
4. Preserve protected delivered-owner access and explicit suspension/revocation semantics.
5. Expose white-label account/order/admin-panel navigation without replacing existing customer trade history.

**Gate:** submit/reload/retry, review/provision/deliver, owner access, staff denial and file privacy tests pass.

## Phase 4 — tenant renderer and original art

1. Adapt shared renderer/style scope to the target routing/base-path helpers.
2. Keep tenant branding, public allowlists and entitled navigation.
3. Copy approved original artwork bytes into destination-controlled storage; verify all 241 blob hashes and 424 identity mappings without generating substitutes.
4. Adapt visual URLs/matchers and rendering modes together.
5. Verify mobile/desktop layouts, logo pixels/ratios, flag identity, color variants and missing-art behavior.
6. Retain `hostingConnected=false`; verified DNS ownership is not automatic hosting/TLS.

**Gate:** no source-project runtime URL/storage dependency; private tenant/request/plan/configuration fields are not public.

## Phase 5 — sandbox Exchange preservation

1. Migrate source settings/calculation/signed quotes/simulated orders into the isolated module/store.
2. Keep actions/routes/methods/assets/networks/fees/defaults and selection/filter behavior intact.
3. Preserve exact-decimal limits, quote expiry/config binding, idempotency, monthly usage locking, private tracking, status transition guards and order/customer/audit views.
4. Keep live providers disconnected and credentials rejected; do not activate target workers from this module.
5. Explicitly label simulated orders and keep them out of target operational revenue/ledger/affiliate/history.

**Gate:** sandbox regression suite plus existing target pricing/order/provider/security tests pass, with no external financial side effects.

## Phase 6 — integration facade, only if separately approved

Design a versioned, tenant-aware interface around the existing target engine. It must preserve canonical asset/network/provider/payment identities, permissions, fees, quoted amount semantics, lifecycle statuses, retries/idempotency, ambiguity handling, ownership, outbox/ledger and reconciliation.

Do not enable a facade by translating a source `provider` toggle into a live request. An approved tenant/provider capability grant, credentials boundary, test environment and full critical-flow validation are prerequisites. Current request does not authorize this phase's live execution.

## Phase 7 — clean destination verification and handoff

Build/install using the destination's established pipeline, with no source-project availability. Verify baseline operations and each enabled white-label feature; inspect network requests for source-origin dependencies. Document feature status, setup, secrets **names only**, operating boundaries, rollback and any remaining gaps.

Do not publish, apply Production DDL or copy customer/financial data as part of the handoff.

## Rollback and failure policy

Use checkpoints/version control plus the approved Development database snapshot. Disable the white-label feature flag before examining a failure. Preserve original target rows; never truncate/drop the operational store to retry. Additive migration rollback must account for any newly created tenant/customer request rows and cannot destroy existing customers. Production restoration requires separate authorization.

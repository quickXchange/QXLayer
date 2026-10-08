# Republish and configuration parity

## Status

Code-publishing checks are implemented and verified. Configuration synchronization is prepared for review only and has not run. Full Development/Production parity is **not** achieved.

The official native publishing mechanism updates code and computes database schema changes. The optional Development-data initialization/copy replaces existing Production data; it is not a selective insert-only merge. Do not enable that option for this project.

Official references:

- https://docs.replit.com/features/data-and-storage/development-and-production
- https://docs.replit.com/features/data-and-storage/shared-database-migration

Agent's supported Production SQL channel is read-only. No supported selective execution path is currently available to Agent. No startup seed, build-time data/schema mutation, temporary recovery endpoint or alternative credential connection was added. No manual Shell or SQL execution is requested from the user.

## Native code-publishing workflow

The native pre-build stage now runs `release:check` automatically before artifact builds. It:

- Checks the API, main platform and tenant-site Production build/start commands, service routing and startup health checks.
- Checks that compiled output is cleared instead of reusing stale files.
- Rejects the known unsafe database schema/seed/access commands in publishing configuration.
- Runs workspace TypeScript checks.

The existing artifact builds continue to compile current source. Authentication settings and the existing Production access gate are unchanged. Normal reads and business CRUD are not replaced with release-time database operations.

Verification passed: four release-check regression tests, workspace type checks, and all three Production builds. Existing Vite sourcemap/chunk-size warnings are non-fatal.

## Read-only database findings

Replit's current schema diff has no statements, removals or structural-data-loss warnings. Schema equality does not establish row/configuration equality.

| Configuration table | Development | Production | Missing |
| --- | ---: | ---: | ---: |
| module_catalog | 18 | 0 | 18 |
| landing_products | 16 | 0 | 16 |
| entitlement_definitions | 32 | 0 | 32 |
| plans | 5 | 0 | 5 |
| plan_entitlements | 112 | 0 | 112 |
| addons | 1 | 0 | 1 |
| addon_entitlements | 4 | 0 | 4 |
| asset_catalog | 33 | 0 | 33 |
| network_catalog | 19 | 0 | 19 |
| asset_network_catalog | 37 | 0 | 37 |
| provider_catalog | 0 | 0 | 0 |
| **Total** | **277** | **0** | **277** |

Production retains one active platform administrator. Its local tenant, membership, exchange-order and white-label-request tables currently have zero rows. These counts do not enumerate external Clerk accounts or prove end-to-end login access; authentication was not changed or tested by this work.

## Separate configuration proposal

`review.json` freezes the compared global rows, primary keys, missing/matching/conflicting classifications and preservation exclusions. This is data for review, not an executable migration or approved operation.

- **155 global non-commercial configuration rows** are missing.
- **122 rows need explicit commercial/demo review:** five sample/demo/test plans and 112 linked entitlements, plus one sample add-on and four linked entitlements.
- The plans include Sample Plan A/B, two sandbox demos and a temporary Development test plan. They must not silently become real commercial plans or substitute for undecided prices.
- Source marketing prices remain NULL. Module sandbox/planned readiness is preserved; copying definitions does not implement products, grant customer entitlements or connect providers.
- Keep existing matching keys unchanged. Any conflicting values require separate review; no blanket upsert/overwrite is proposed.
- No deletions are proposed.
- Super Admin records, Clerk accounts, customers, tenant-specific settings, assignments, orders, requests, events, sessions, API keys, credentials, webhooks and tenant-specific pricing remain excluded.
- Production-specific authentication/environment settings must not be copied from Development.

No data approval has been requested because the available supported execution capability cannot carry out this selective operation. User approval must be tied to a real supported execution path, not just a prepared manifest.

## Outstanding requirement

A supported, non-destructive selective configuration operation is still needed before editable Production products/modules/plans/add-ons can match Development. Republish alone cannot satisfy that requirement while preserving the existing database. Do not describe the code-publishing improvements as completed database synchronization.

# Security and migration validation gates

This file is a test plan for the **authorized destination implementation**. It is not a claim that these destination journeys have already been built/tested.

## Current handoff verification

The static audit generator:

- Parses Drizzle table declarations with the existing TypeScript parser, avoiding comment/example false positives.
- Inventories both OpenAPI paths and extra Express routes.
- Records source files/lines, column/reference declarations, dependency requirements and environment names.
- Maps every declared Project 2 table and typed operation to a collision-safe target namespace.
- Does not import application/database/provider runtime or read secret files.

The handoff validator checks inventory completeness, map coverage, duplicate declarations, reference commit identity, required documents, unresolved collision handling and source fingerprints.

## Authentication and tenant isolation

Test separate platform Owner, restricted operator, tenant A administrator, tenant A read-only staff, each scoped staff grant, tenant B administrator, unassigned customer, suspended identity, anonymous public visitor and read-only demo identity.

- Cross-tenant list/detail/update/bulk/delete, resources, asset assignments, dashboard/customer/order/audit access must deny.
- Request/file/event access is joined through owner/request visibility, including pre-submission files.
- Changing a body/URL/Clerk display field cannot change authority.
- Tenant administrator cannot become global Owner/operator, access target financial admin, grant Client Admin/Owner privileges or remove protected delivered-owner access.
- Staff can exercise only their four configured scopes; even `resources.manage` cannot manage memberships.
- Demo cannot mutate, read another tenant, attach files, manage accounts or execute target operations.
- Target verified-email/TOTP/Owner-only permission and suspension checks remain unchanged.
- Read-only transactions reject SQL writes; transaction variables are never substituted for tenant predicates.

## Entitlements and concurrency

- Missing features/limits deny; denied parent blocks subfeature.
- Plan/add-on disable/archive retains existing assignments but blocks new ones.
- Add-on limits sum exactly; replacing overrides and suspension win.
- Concurrent resource/order/volume admissions cannot exceed limits.
- Aborted writes do not consume quota or leave order/file/audit state inconsistent.
- Sandbox/monthly usage cannot enter financial revenue/affiliate/ledger calculations.

## Exchange/order safety

- Preserve each Swap/Convert/Buy/Sell action's route, method, fees/spread/defaults and asset-network identity.
- Expired/stale/tampered quotes and changed configuration reject.
- Idempotent retries return one authorized order; same key/different payload rejects.
- Tracking token is order/tenant/purpose-bound and exposes only public order projection.
- Internal flags/reserves/provider configuration do not leak to customer order/website responses.
- Version/status conflicts and bulk changes preserve allowed lifecycle transitions.
- Operational target order columns/statuses/provider outcomes remain unchanged.
- No live quote/order/deposit/payment/provider/blockchain call is triggered by sandbox actions.

## Uploads and public projections

- Max 8 MB, MIME/extension/signature mismatch, disallowed format and category validation reject.
- HTML/SVG/executable uploads reject; ZIP/DOCX are stored without execution/extraction.
- Arbitrary object paths, original source bucket references, unaffiliated files and internal operator notes cannot be retrieved.
- Public tenant data is allowlisted; no plan prices/overrides/private memberships/credentials/raw keys/customer details/internal audit.
- Object transfer verifies hash, exact original format and non-public attachment ACL.
- Domain verification does not dispatch a host, connect TLS or imply continuous ownership monitoring.
- Same-origin mutation checks remain enforced without wildcard credentialed CORS.

## Functional/release gates

1. Native target typecheck, API generation and baseline financial/security tests.
2. Additive schema dry-run, constraints and existing-data invariant checks.
3. Tenant/customer request submission/retry/reload/review/provision/delivery/file privacy.
4. Config persistence, quotas, staff grants, suspension and tenant renderer.
5. Sandbox quote/order/tracking/admin lifecycle plus unchanged target engine regression.
6. Mobile/desktop public/config screens, original art and fallback states.
7. Clean destination startup/build, no Project 2 requests/dependencies, explicit setup documentation.

Run a browser pass only when implementation materially changes critical authenticated/customer/order journeys. Never test QuickXchange against Project 2's database, run its startup workers as an audit shortcut, or reuse real customer/provider records for fixtures.

## Readiness statements

**Audit/map:** prepared and independently verifiable.  
**Destination migration:** not performed.  
**Production/live services/custom-domain hosting/KYC/webhook transport:** not implemented or validated by this handoff.

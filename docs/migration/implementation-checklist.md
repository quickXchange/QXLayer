# Implementation order and completion ledger

## Completed in this workspace

- [x] Confirm this workspace is Project 2 and QuickXchange is Project 1 reference.
- [x] Inspect uploaded brief without extracting over application files.
- [x] Audit source UI/API/services/schema/integrations/configuration relationships.
- [x] Audit current reference architecture, authorization, engine, providers/jobs, schemas and API.
- [x] Map all declared source tables and typed API operations; include extra binary/art routes.
- [x] Compare dependency requirements and environment consumer names.
- [x] Identify real table/schema-name/API/package/authorization/provider/storage conflicts.
- [x] Distinguish implemented workflows, simulated Exchange and deferred/advertised products.
- [x] Prepare staged order, security/data invariants, assets and standalone destination requirements.

## Not performed — requires an authorized Project 1 destination

| Order | Item | Decision | Destination completion evidence |
|---|---|---|---|
| 1 | Baseline destination/source revision and snapshot | Preserve | Original APIs/data/auth/provider/native tests recorded |
| 2 | White-label module/package/API namespaces | ADAPT | No existing exports/routes replaced |
| 3 | 36 schema-qualified source tables and constraints | ADAPT | Additive Development DDL; original 92 declarations/data intact |
| 4 | Existing verified Clerk identity and tenant authority | MERGE / ADAPT | TOTP/Owner protection plus full cross-tenant/role matrix |
| 5 | Decimal/entitlement/limit/audit core | COPY pure utilities / ADAPT storage | Exact resolution, transaction admission and no-secret audits |
| 6 | Tenant provisioning, brand/website/domain configuration | ADAPT | Save/reload/permission/suspension checks; honest hosting status |
| 7 | Customer white-label requests, events and attachments | ADAPT | Idempotency, owner privacy, internal-note visibility |
| 8 | Operator review/provision/delivery and protected owner | ADAPT | Delivered existing account receives only tenant authority |
| 9 | Shared renderer and original artwork transfer | COPY assets / ADAPT paths | Hashes, public allowlist, no source-project dependency |
| 10 | Sandbox Exchange settings and calculations | ADAPT / COPY pure math | Every configured route/action/fee/identity reproduced |
| 11 | Isolated simulated orders/tracking/admin/dashboard | ADAPT | No target operational order store/lifecycle altered |
| 12 | Scoped resource keys/webhooks/staff/quotas/demo policy | ADAPT | No merchant execution/delivery/global authority accidentally enabled |
| 13 | Target engine facade, if separately approved | MERGE existing engine / REPLACE source seam | Tenant-aware contract, legacy engine tests and no live side effects |
| 14 | Clean build/startup and critical-flow validation | Preserve / verify | Existing pipeline passes, no copied source credentials or external dependency |
| 15 | Customer/financial data transfer, live services or Production | Out of current scope | Separate authorization, backup, migration review and release process |

## Acceptance criteria for a completed migration

- All implemented source features have a target path and tested status; advertised/deferred entries retain accurate labels.
- Target exchange/auth/customer/ledger/provider/job/build functionality remains intact.
- Tenant boundaries apply at service/query level, not only frontend filtering.
- All source-specific paths/defaults/assets/configuration dependencies are adapted.
- No source runtime API/storage/database dependency; a clean target can operate independently.
- Tests/docs name unresolved behavior honestly.
- No claim of live exchange, KYC, billing, webhook delivery, host/TLS or Production migration without its separate evidence.

The checklist deliberately marks only audit/handoff items complete. It must not be presented as a completed destination merge.

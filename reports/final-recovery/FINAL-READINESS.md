# QXLayer — final Production readiness report

Review date: 7 October 2026. This report supersedes the earlier diagnostic-only preparation checkpoint.

## Decision

The release code and bounded recovery package have been prepared and verified in Development. **The live Production release is not ready for recovery execution or republishing without further approvals and verified business inputs.** No Production changes or publishing were performed.

Code readiness is not live readiness. The remaining Production blockers are the existing owner's identity/mapping, a real approved commercial plan, the old delivery CHECK, missing global reference configuration, and the final authorized recovery/publishing/readback.

## Readiness matrix

| Requirement | Verified release code / Development | Current Production requirement |
|---|---|---|
| 15-product landing, no Kolo | YES — approved catalog and rendering checked; deferred products remain previews, not implemented services | Recover exactly 15 approved landing records; do not restore removed products |
| Existing owner / Super Admin | YES — existing authorization paths and signed-in console checked; no replacement owner created | NO — readback found zero active administrator mappings; confirm the existing Production Clerk identity before restoring authority |
| Customer account, orders and profile | YES — authenticated account and lifecycle implementation verified | Needs existing-owner recovery and a genuine commercial plan; no Development accounts or orders may be copied |
| Customer Admin delivery | YES — assignment is delivery-controlled; setup tenants remain private | Requires the approved CHECK repair and successful real provisioning/delivery |
| Shared Master website | YES — one shared renderer, isolated configuration, uploaded logos/favicons and tenant-bound branding verified | Publish the verified code; provision/configure tenants through the normal workflow, not frontend copies |
| NovaX public demo | YES — Swap, Convert, Buy, Sell, quote, simulated order and tracking checked; desktop/tablet/390px pass | Publish the isolated code; no tenant, account or order seed is required |
| NovaX Admin demo | YES — real shared read-only UI; filters, detail, pricing pagination, disabled controls and session isolation verified | Publish the isolated code; no editable Clerk demo account or real customer configuration is required |
| Pre-delivery website preview | YES — authenticated operator-only shared renderer; copied/anonymous access and permission revocation denied | Publish the verified code and restore the verified existing operator mapping |
| Provisioning and delivery | YES — idempotency, approved linkage, branding/configuration isolation, delivery-controlled access and clean defaults verified | Old validated CHECK is incompatible with setup-time linkage; repair/re-read it before provisioning |
| Sandbox Exchange | YES — calculation, frozen quotes, orders, tracking, access and quotas verified; no financial execution | Requires reference catalogs, approved entitlements and intentional tenant configuration |
| Disconnected provider foundation | YES — catalog/configuration, assignment policies and authorization verified; execution remains disabled | No provider, credential, adapter, webhook execution or live connection is included in this recovery |
| Desktop/tablet/390px and performance | YES — checked views had no page-level overflow; console initial JS reduced by about 38% | Live-device/browser acceptance remains required after the approved release |
| Recovery safety | YES — exact-scope classification, drift/expiry guards, postconditions and temporary-clone execution verified | NO execution approval; saved preflight is expired and must be refreshed |
| Live acceptance / publishing | NOT PERFORMED — intentionally approval-dependent | NO — Production has not received these changes; final live acceptance is outstanding |

## Work completed and evidence

### Preview and customer privacy

- The pre-delivery preview uses a purpose-specific, 15-minute, HttpOnly, tenant-path grant, the matching live Clerk identity and a freshly checked Super Admin permission on every request.
- Browser checks confirmed launch, tenant branding, authorized rendering, anonymous/copied access denial, and immediate denial after the temporary Super Admin grant was revoked.
- Previewing did not activate or deliver the draft, change its configuration or create an order. Quote/order mutation intent is rejected with HTTP 403.
- Ordinary public draft URLs, attachment protection, customer ownership and delivery gates remain enforced. No preview bearer token is placed in the URL.

### Safe demos

- The NovaX demos use deliberately authored fictional configuration, not a Development export or a real tenant fallback. An isolation layer runs before database-backed routes.
- Admin launch requires no username/password. It creates a 15-minute read-only session with explicit per-tab intent. Global administration, customer accounts, identity management, credentials, other tenants and persistent mutations are denied.
- Launch/exit clear the tab's demo intent and query cache. Browser checks confirmed the separate real Clerk session remained authenticated as the same identity after exiting.
- Shared customer hooks are disabled for demo authority **and** launch intent, including the stale-principal transition. Catalog metadata required by read-only Assets/Settings is supplied from the fictional configuration, not real database catalogs.
- The public demo uses the shared calculator and renderer. All four actions produced quotes in the browser. A simulated order returned 201 and tracking returned 200.
- Simulated orders are signed browser-held snapshots, never stored in the database. The synthetic demo identifier had zero persistent orders. The old Development NovaX tenant and its historical records were left untouched.
- The demo does not request payment, issue a deposit address, move funds, connect wallets, call providers or execute on a blockchain.

### Verification and limitations

- All workspace TypeScript checks passed. API and web production builds passed.
- 36 API-focused tests and 16 catalog/recovery tests passed. The additional launch-intent regression passed. Changed demo endpoints were checked again in Production mode with database access trapped.
- 208 authorization/isolation assertions passed, together with the foundation, catalog, Exchange, customer, Master and provider verification routines.
- The global recovery SQL was actually executed against temporary table clones in Development, checked for exact postconditions and idempotency, then rolled back. It was not applied to ordinary Development configuration or Production.
- Browser verification covered landing, signed-in owner screens, customer detail, authenticated preview, public demo and read-only Admin sections. Incorrect initial test-plan assumptions about `/addons` and `delivered_at` were corrected: `/add-ons` is canonical; status/linkage, not a nonexistent timestamp, defines delivery.
- The final ordinary-customer browser journey passed Dashboard, Orders/detail, White Labels, Admin Panels, Profile and the UI-opened delivered Exchange Admin. The setup tenant showed Not provisioned; another customer's order returned 404. A 390px panel card fit without page overflow. Temporary ownership and memberships were restored and the real session remained valid.
- Two optional attachment-content requests returned 404 in the temporarily reassigned QA fixture; its order detail still rendered. The attachments retained their original fake uploader ownership, and content access correctly checks uploader/operator authority. Original upload/logo/favicon service checks passed; this customer pass did not transfer or download those files.
- Admin browser failures found during verification were fixed: customer-account query gating, launch transition, and required read-only catalog metadata. Focused checks replaced full repeated passes.
- Initial console bundle fell from approximately 312.18 to 192.98 KB gzip (about 38%). The website build was approximately 128.33 KB gzip. These are build measurements, not fabricated Lighthouse/Core Web Vitals scores.
- Minor existing sourcemap/minified-chunk warnings remain; they did not fail builds or observed flows.
- Disposable Master verification tenants, requests, uploads, plan and temporary authority were cleaned using their exact recorded scope. The retained Asterlane fixture and legacy NovaX records were preserved.
- Live Production owner/customer UI has **not** been accepted. Publishing metadata reports a successful existing autoscale build, but unauthenticated exterior GETs to both verified published origins returned 403. This is an access/readiness limitation, not evidence that these new changes are live or a diagnosis of DNS failure.

## Read-only Production findings

These are captured observations, not an assertion that a saved snapshot stays current:

1. The named delivery CHECK was still the **validated old equivalence**: tenant linkage is permitted only when delivered. The desired predicate is `status <> 'delivered' OR tenant_id IS NOT NULL`, allowing setup-time linkage while still requiring linkage for delivery.
2. The managed schema diff reported no change despite that CHECK mismatch. Therefore an empty diff is not proof of constraint parity.
3. Active `platform_admins`: **0**. The existing Production Clerk owner's exact identity has not been confirmed for restoration; it must not be inferred from a Development user or another account.
4. Production commercial plans, add-ons, entitlement definitions, asset/network reference catalogs, provider catalogs, modules and landing configuration were empty in the captured readbacks.
5. All inspected Development plans were sample/demo/QA, including retained Asterlane-related verification data. **None is an approved Production commercial plan and none may be copied.**
6. SQL readbacks were accepted only when the expected result set was actually present. A successful transaction-only envelope was not treated as an empty-table result.

## Exact approval-dependent recovery scope

### A. Structural compatibility

Use the managed publishing/schema process as the authoritative structural path and review its migration scope before accepting it. Independently re-read the exact named CHECK and validation flag afterward.

If the managed process still leaves the old CHECK unchanged, stop and request explicit approval for a minimal repair by an authorized human Production writer. The historical `01-delivery-preflight.sql`, `02-delivery-forward.sql` and `03-delivery-rollback.sql` are review references, **not agent-executable migrations**. No new build/startup DDL was introduced.

The repair must affect only `white_label_requests.white_label_request_delivery`, preserve rows and other constraints, and validate the new predicate. No order status or tenant link is to be rewritten to make the CHECK pass. Returning to the old CHECK must be refused if legitimate setup-time links now exist.

### B. Global reference/configuration recovery

The prepared manifest contains exactly:

| Table scope | Approved records |
|---|---:|
| Module definitions | 17: 15 marketed products plus website/merchant API core metadata |
| Entitlement definitions | 31 |
| Crypto assets | 5 |
| Test networks | 5 |
| Asset/network pairs | 7 |
| Landing cards | 15 |
| **Total scoped records** | **80** |

Only Exchange sandbox functionality is implemented. The other advertised products remain accurately marked previews/deferred. Reference metadata does not activate provider services.

Files are under `reports/final-recovery/`:

- `approved-global-foundation.json`: exact reviewed row manifest.
- `05-global-preflight.sql`: read-only scope capture.
- `global-preflight-frozen.json`: captured evidence, now expired for execution.
- `global-approvals-PREPARED-NOT-APPROVED.json`: explicit preparation, **not approval**.
- `06-global-configuration-PREPARED.sql`: guarded offline-generated DML, **not executed**.

The compiler rejects unexpected scope, duplicate keys, missing per-key review and changed manifest fingerprints. Generated DML requires a snapshot less than 15 minutes old, locks its exact tables, rejects drift/unexpected RLS or triggers, inserts only approved missing keys, preserves explicitly reviewed conflicts, permits only approved visibility restoration, and checks exact postconditions. Failure rolls back; expiry must never be bypassed.

It contains **no plans, owner identity, memberships, providers, credentials, tenants, customers, orders, branding uploads, QA data, Kolo insertion, deletion or truncation**.

### C. Existing owner restoration

Before preparing executable owner-binding SQL, confirm the **existing Production Clerk subject** and explicitly approve restoring its one administrator mapping. Check fresh current mapping state. Do not create a Clerk user, replace the owner, guess an identity, copy a Development identifier or change another administrator.

The bounded operation is one existing identity's `platform_admins` mapping only. Its exact subject remains intentionally unfilled.

### D. Commercial plan

Approve a real plan's name, status, currency, monthly/yearly/setup pricing, feature entitlements and limits. Create it through the recovered operator interface or a separately reviewed bounded operation. Do not invent prices or reuse demo/sample/Asterlane plans.

At minimum, the commercial choices must intentionally cover the website/Exchange and the permitted actions; any staff, asset, network, payment-method, transaction and volume limits must be explicit. No provider connectivity or paid checkout is implied.

### E. Recovery and publishing order

1. Confirm business/identity inputs and separately approve each mutation scope and publishing.
2. Refresh read-only Production metadata, mapping/count evidence and exact-scope configuration capture. Omit explicit transaction wrappers when using the managed read-only SQL tool.
3. Review/resolve structural compatibility; verify the exact CHECK and validated flag.
4. Reclassify the fresh global snapshot; obtain exact key-level approval and regenerate the DML offline. Preserve conflicts; stop on drift.
5. Have an authorized human writer apply only the approved configuration and verified existing-owner binding. Replit's Database tool documents selecting Production and enabling Edit mode; this does not grant the agent permission to write.
6. Create only the approved genuine commercial plan. Re-read configuration, ownership and entitlements.
7. Review the publishing build/schema/environment diff. **Do not select any operation that replaces Production with Development data.** Preserve existing authentication/access restrictions and secrets; do not change DNS.
8. The user publishes the verified release. No automatic publishing has been performed or scheduled.
9. Perform post-release live acceptance: 15/no-Kolo landing, existing owner login, read-only demos, preview authorization/revocation, intended customer delivery gates, configured sandbox behavior and three viewport sizes. Exercise a real customer provisioning/delivery write only with separate explicit approval; never create/copy Production QA accounts or fixtures merely to mark a test passed.

No step authorizes real funds, real providers, live API/RPC calls, execution webhooks, secret exposure or edits to unrelated products/QuickXchange.

## Final decision fields

| Field | Result |
|---|---|
| RELEASE CODE VERIFIED | YES — Development evidence; not live acceptance |
| SCHEMA REPAIR REVIEW PACKAGE READY | YES — bounded review references; exact application remains approval-dependent |
| GLOBAL CONFIGURATION PACKAGE READY | YES — guarded exact-scope offline package |
| VERIFIED EXISTING PRODUCTION OWNER BINDING READY | NO |
| APPROVED PRODUCTION COMMERCIAL PLAN READY | NO |
| FRESH APPROVED EXECUTION SNAPSHOT READY | NO — refresh immediately before approval/execution |
| SAFE TO EXECUTE RECOVERY NOW | NO |
| SAFE TO REPUBLISH NOW | NO |
| PRODUCTION WRITES / PUBLISHING PERFORMED | NO |

**READY FOR FINAL PRODUCTION RECOVERY + REPUBLISH: NO**

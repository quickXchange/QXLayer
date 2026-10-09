# QXLayer provisioning — final implementation report

## Status
Implemented and verified in Development. Ready for the user’s native Publish/Republish action. This release has NOT been deployed to Production by the agent.

## Fixed
- Applied the corrected delivery CHECK through the project’s supported Drizzle Development push. Delivered orders still require a tenant; approval/setup may now retain their prepared tenant link.
- Changed the CHECK to white_label_request_delivery_requires_tenant. A controlled Development-only probe established that the publisher misses changed expressions under the same CHECK name. The native plan now detects exactly the legacy CHECK removal and corrected CHECK addition, with no table/column removal, truncation or structural data loss.
- Added a source-bound native-plan review guard to release preflight. It rejects the old empty-diff mismatch, stale schema evidence, wrong or unvalidated constraints, extra statements and destructive changes. It does not execute SQL or claim to be a fresh Production readback.
- Fixed concurrent queries on one PostgreSQL transaction client in Super Admin tenant listing, plan/add-on listing and assigned add-on resolution. Separate customer transaction connections may still run independently.
- Fixed a readiness gap discovered in the browser: a route could activate with network limits at 0/0, then reject every positive quote. Used networks now require explicit positive capacity, and source network/route ranges must overlap before activation/delivery. Draft saves remain possible. The existing UI shows the blocker and disables Activate. No arbitrary capacity, prices or live-provider defaults were assigned.

## Tested
- Real Clerk-backed Development sessions and UI: customer order → Super Admin review → prepared draft tenant → manual setup → Sandbox activation → automatic standard delivery → same customer account’s Admin Panel after reload. Authentication was supplied by the testing helper; configuration, tenant creation, delivery and customer membership were not SQL-seeded or response-mocked.
- Customer and unrelated-customer private-preview denial; unrelated customer’s direct Admin Panel and protected tenant APIs denied without exposing tenant administration data.
- Configured Sandbox quote: 1 ETH → 1 USDC, zero configured network fees. No exchange order was submitted; no funds, wallets, blockchain transactions or live providers were involved.
- 15 isolated PostgreSQL/real-service checks: old-rule failure reproduction; lock contention; injected failure rollback; fingerprints and other constraints preserved; no-op rerun; guarded reversal; all 22 status/link combinations; FK/unique protections; pre-delivery privacy; missing-capacity activation denial; standard and custom-design handoff; delivery retry idempotency; serial query use and tenant-list isolation.
- Custom-design activation remains private and undelivered until explicit Ready review. This path was verified by service/database tests, not another full browser lifecycle.
- 22 release regression tests passed: 11 publishing/preflight checks plus 11 Exchange calculation, projection, Master-template and readiness checks.
- Latest full workspace typecheck and release preflight passed. API rebuilt/restarted and serves requests; console/website production builds passed with their service environment context. The console preview renders normally.

## Preserved and cleaned
All 39 Production table fingerprints are unchanged. After atomic disposable-QA cleanup, all 39 original Development table fingerprints exactly match their baseline. Cleanup itself would have rolled back on any baseline mismatch. The disposable order, tenant, membership, audit records, temporary operator grant and all three verified test Clerk identities were removed. Sequence counters were not reset.

Permanent administrator records, existing customers and the retained Asterlane fixture remain unchanged. No NovaX website/console/design source was edited; the shared Master regression passed. A dedicated browser NovaX visual comparison was not reported by the tester.

Public website behavior is preserved: anonymous draft/undelivered access is blocked; the tenant-branded Sandbox site is intentionally public after delivery. Operator previews remain authenticated/read-only. Sandbox access is not Production publishing or live financial execution.

## Deployed / still blocked
The existing published app at https://www.quicklychan.xyz is healthy (API health HTTP 200). The new correction is not deployed: fresh read-only Production metadata still shows the legacy validated CHECK. Agent Production writes and Publish actions: zero. The actual Live customer lifecycle and post-release owner login are not yet verified.

## Exact final action
1. Open Publishing and choose Publish/Republish for the current source.
2. Review the fresh schema plan. It must DROP white_label_request_delivery and ADD white_label_request_delivery_requires_tenant with status <> 'delivered' OR tenant_id IS NOT NULL. No unrelated schema or data operations. The CHECK replacement compatibility warning is expected.
3. Keep Development-data copy/overwrite OFF. Do not reset the database or run a separate Production SQL script. Publish using the native managed flow. Stop if the legacy CHECK remains but the plan is empty, or if the plan proposes other changes or data loss.
4. After publishing, verify the corrected named CHECK is validated, protected Production fingerprints/administrator records remain intact, the owner can sign in, and the authorized Live order-to-Admin-Panel workflow completes. Only then declare Production fixed.

The isolated rehearsal replays the exact native statements transactionally; it does not independently prove the platform publisher’s internal transaction implementation. Review the actual Publish plan at release time.

## Evidence
The report folder contains native-publish-review.json, publish-plan.json, verification-results.json, browser-verification.json, production-integrity-before.json, production-integrity-after.json and development-integrity-after.json. PROPOSED-MIGRATION.md contains the detailed supported migration and rollback conditions. Rollback must never delete orders, clear valid setup links or force delivery to restore the old stricter rule.

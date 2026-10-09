---
name: Clerk UI testing memberships
description: Authenticate normally and grant the actual generated test identity temporary access to an isolated sandbox tenant.
---
For Clerk UI checks, use a normal generated test identity and assign its actual Clerk user ID a temporary tenant membership. Extra `sub` or `userId` arguments to the current sign-in testing helper do not override the session identity.

**Why:** The helper accepted those extra arguments but ignored them, leaving the session authenticated as its generated user rather than the pre-seeded synthetic ID.

**How to apply:** Use only an isolated development tenant; remove temporary memberships after verification. Do not change app authentication to force synthetic claims. Check a protected route and the authenticated principal response rather than judging sign-in from the public marketing header. Follow the [customer delivery requirements](customer-account-workflow.md) when preparing a tenant-admin fixture; membership alone is intentionally insufficient.

Production verification requires genuine Live customer and operator sessions.
Do not treat a Development helper identity, a demo session, or the user's own
accessible browser as authority in a separate test browser.

**Why:** A Production browser check stopped at the private access gate despite
the owner having working Live access. The available browser tools had no
secret-aware form input, and the owner's authenticated session was not shared.

**How to apply:** Confirm the test browser's actual environment and access
capabilities first. Use normal supported access only; never expose secrets,
forge gate cookies, grant Production test privileges or weaken authentication.
Read-only database/log checks can establish migration and connection health,
but not an authenticated lifecycle or cross-tenant isolation. If access remains
unavailable, ask the user to submit a labelled Live QA order through their normal
customer session and share only its non-secret reference for staged verification.

Programmatic test sign-in can also yield a principal without an email, even when an email was supplied to the helper.

**Why:** Visual review found null principal emails despite the supplied test identity, exposing raw account IDs in fallback labels.

**How to apply:** Base UI and permission checks on the actual principal response, not helper inputs. Exercise friendly missing-email fallbacks without changing authentication claims.

Construct testing URLs from the runtime development domain and fixture metadata instead of manually transcribing domain or tenant identifiers.

**Why:** Repeated transposed identifiers produced false missing-fixture and unavailable-preview reports while the actual app and fixture were healthy.

**How to apply:** Before diagnosing a browser setup failure as an app issue, compare its exact target against authoritative runtime values and a direct HTTP request. Keep the same authenticated identity and tenant when resuming verification.

For data-preserving Exchange Admin UI verification, use browser-only GET response overlays for large catalogues and selection examples, and block tenant mutation requests. Compare the retained Development fixture before and after.

**Why:** The user requires Admin organization work without changing tenant data merely to populate or exercise the UI.

**How to apply:** Stage and discard local edits; cancel persisted assignment, configuration and order actions. A disposable QA authorization grant is separate from tenant configuration and must be removed exactly. Expired test sign-in tickets require fresh programmatic test authentication, not real-user credentials or elevation of an unrelated customer session.

Judge responsive drawer overflow only after its opening animation settles.

**Why:** Immediate tester screenshots showed right-edge clipping during slide-in, while settled drawers and their contents fit the phone viewport correctly.

**How to apply:** Compare settled drawer bounds and document scroll width with the viewport before changing layout. A transitional screenshot alone is not evidence of persistent clipping.

For transactional end-to-end Exchange verification, use disposable customers and the native request, approval, configuration, activation and delivery flow—not response overlays or SQL-seeded delivery/entitlements.

**Why:** The user requires actual Admin → widget → quote → order → status verification and explicitly rejects fixture-backed false passes.

**How to apply:** Keep real test mutations restricted to disposable Development tenants. Temporary owner authorization must be scoped to the exact new QA identity, never conditioned on there being no permanent owner. Remove newly created test business data and temporary access after verification; preserve retained fixtures and permanent ownership.
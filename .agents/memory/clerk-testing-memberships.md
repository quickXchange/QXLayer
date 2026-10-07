---
name: Clerk UI testing memberships
description: Authenticate normally and grant the actual generated test identity temporary access to an isolated sandbox tenant.
---
For Clerk UI checks, use a normal generated test identity and assign its actual Clerk user ID a temporary tenant membership. Extra `sub` or `userId` arguments to the current sign-in testing helper do not override the session identity.

**Why:** The helper accepted those extra arguments but ignored them, leaving the session authenticated as its generated user rather than the pre-seeded synthetic ID.

**How to apply:** Use only an isolated development tenant; remove temporary memberships after verification. Do not change app authentication to force synthetic claims. Check a protected route and the authenticated principal response rather than judging sign-in from the public marketing header. Follow the [customer delivery requirements](customer-account-workflow.md) when preparing a tenant-admin fixture; membership alone is intentionally insufficient.

Programmatic test sign-in can also yield a principal without an email, even when an email was supplied to the helper.

**Why:** Visual review found null principal emails despite the supplied test identity, exposing raw account IDs in fallback labels.

**How to apply:** Base UI and permission checks on the actual principal response, not helper inputs. Exercise friendly missing-email fallbacks without changing authentication claims.

Construct testing URLs from the runtime development domain and fixture metadata instead of manually transcribing domain or tenant identifiers.

**Why:** Repeated transposed identifiers produced false missing-fixture and unavailable-preview reports while the actual app and fixture were healthy.

**How to apply:** Before diagnosing a browser setup failure as an app issue, compare its exact target against authoritative runtime values and a direct HTTP request. Keep the same authenticated identity and tenant when resuming verification.

For data-preserving Exchange Admin UI verification, use browser-only GET response overlays for large catalogues and selection examples, and block tenant mutation requests. Compare the retained Development fixture before and after.

**Why:** The user requires Admin organization work without changing tenant data merely to populate or exercise the UI.

**How to apply:** Stage and discard local edits; cancel persisted assignment, configuration and order actions. A disposable QA authorization grant is separate from tenant configuration and must be removed exactly. Expired test sign-in tickets require fresh programmatic test authentication, not real-user credentials or elevation of an unrelated customer session.
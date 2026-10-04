---
name: Clerk UI testing memberships
description: Authenticate normally and grant the actual generated test identity temporary access to an isolated sandbox tenant.
---
For Clerk UI checks, use a normal generated test identity and assign its actual Clerk user ID a temporary tenant membership. Extra `sub` or `userId` arguments to the current sign-in testing helper do not override the session identity.

**Why:** The helper accepted those extra arguments but ignored them, leaving the session authenticated as its generated user rather than the pre-seeded synthetic ID.

**How to apply:** Use only an isolated development tenant; remove temporary memberships after verification. Do not change app authentication to force synthetic claims. Check a protected route and the authenticated principal response rather than judging sign-in from the public marketing header.

Programmatic test sign-in can also yield a principal without an email, even when an email was supplied to the helper.

**Why:** Visual review found null principal emails despite the supplied test identity, exposing raw account IDs in fallback labels.

**How to apply:** Base UI and permission checks on the actual principal response, not helper inputs. Exercise friendly missing-email fallbacks without changing authentication claims.
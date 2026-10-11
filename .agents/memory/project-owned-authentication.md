---
name: Project-owned authentication
description: User wants authentication owned and operated within QXLayer instead of Clerk.
---

The user wants a full authentication system from their side, integrated with this project, instead of Clerk.

**Why:** The user explicitly requested project-owned authentication rather than independent ownership of another Clerk application.

**How to apply:** Treat future authentication work as a migration to authentication operated in the project's infrastructure, not as another Clerk ownership or branding exercise. Preserve existing business identities, permanent owner authorization and tenant assignments. Existing external-migration Production safety boundaries still apply until explicitly superseded.

The user selected “Build and integrate in Staging first (recommended).”

**Why:** The user approved an isolated Staging implementation, not a Production authentication cutover.

**How to apply:** Verify in Development and Staging before proposing any Production change. Keep Production authentication/data, DNS, paid plans and the suspended Worker untouched.

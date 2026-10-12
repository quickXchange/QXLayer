---
name: Project-owned authentication
description: User requests Supabase Auth with Staging-first verification and an approval-gated Clerk cutover.
---

The user wants a full authentication system from their side, integrated with this project, instead of Clerk.

**Why:** The user explicitly requested project-owned authentication rather than independent ownership of another Clerk application.

**How to apply:** Treat future authentication work as a migration to authentication operated in the project's infrastructure, not as another Clerk ownership or branding exercise. Preserve existing business identities, permanent owner authorization and tenant assignments. Existing external-migration Production safety boundaries still apply until explicitly superseded.

The user selected “Build and integrate in Staging first (recommended).”

**Why:** The user approved an isolated Staging implementation, not a Production authentication cutover.

**How to apply:** Verify in Development and Staging before proposing any Production change. Keep Production authentication/data, DNS, paid plans and the suspended Worker untouched.

The user now explicitly requests their own Supabase Auth, reusing compatible custom authentication work. Keep existing account IDs and business data intact. Do not modify Production, remove Clerk, or change existing accounts and permissions until the new system passes all tests and the user approves the final switch.

**Why:** The user specified Supabase Auth and an explicit final-switch approval boundary.

**How to apply:** A custom Better Auth implementation is not completion of the Supabase request. Reuse compatible UI and identity-preservation mechanisms, test the Supabase path separately in Staging, and retain the current Clerk path until approved.

---
name: Public Exchange demo boundaries
description: Why public demo credentials use restricted sessions and why delivered customers must not be repurposed as demos.
---

Public demos must not authenticate a shared editable Clerk account. Use a credential-free restricted session with no identity-management capabilities, no persistent admin writes, and only isolated fictional configuration. Keep the creator's existing Clerk identity and ownership unchanged.

**Why:** Anyone holding public credentials could otherwise change a shared account's email/password or damage shared configuration. The user requested a real Admin Panel experience without account/security changes or cross-tenant access.

Exclude demo customer queries centrally and consider launch intent as well as
the resolved principal.

**Why:** A shared navigation shell fetched customer panels after the page gate
was fixed. A first-render stale principal also allowed a transient request.

**How to apply:** Shared query callers must inherit the no-customer-data
boundary during launch and navigation. Intent is only a denial boundary, never
authentication. Every demo exit/error path must preserve the real Clerk session.

**How to apply:** Reuse the normal shared Exchange renderer and staff/read-only UI, but never depend on a Development tenant being copied to Production. Fictional configurations must be authored deliberately, not exported from tenant records. Enforce a terminal server isolation boundary and deny privileged/global/customer-account paths. A demo must not replace the real owner's session in another tab; use explicit per-tab intent and separate caches. Customer delivery guards must not fetch real customer account panels for the demo. If editable demo controls are introduced later, use visitor-isolated disposable state rather than writes to a shared tenant.

A requested demo brand or slug may already belong to a delivered tenant, including a demonstration retained for inspection. Check its delivery purpose and membership history before reuse; preserve existing Development assignments and choose a separate dedicated demo slug when there is a collision. Delivered status alone does not make a fixture legitimate for Production synchronization.

**Why:** The initially proposed NovaX demo slug already belonged to a delivered customer tenant. Its matching display name was not proof that it was disposable demo data.

**How to apply:** Never repurpose a delivered tenant merely because its branding matches the requested demo. Reuse only a confirmed dedicated demo, keep provisioning idempotent, and exclude an explicitly disposable delivery from Production unless the user approves reclassification.

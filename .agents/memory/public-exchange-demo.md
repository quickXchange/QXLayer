---
name: Public Exchange demo boundaries
description: Why public demo credentials use restricted sessions and why delivered customers must not be repurposed as demos.
---

Publicly advertised demo credentials must not authenticate a shared editable Clerk account. Use a restricted, expiring demo session with no identity-management capabilities, no persistent admin writes, and exactly one read-only tenant membership. Keep the creator's existing Clerk identity and ownership unchanged.

**Why:** Anyone holding public credentials could otherwise change a shared account's email/password or damage shared configuration. The user requested a real Admin Panel experience without account/security changes or cross-tenant access.

**How to apply:** Reuse the normal provisioned Exchange and staff/read-only UI. Enforce the demo boundary on the server and deny privileged/global/customer-account paths. If editable demo controls are introduced later, use visitor-isolated disposable state rather than writes to the shared tenant.

A requested demo brand or slug may already belong to a delivered tenant, including a demonstration retained for inspection. Check its delivery purpose and membership history before reuse; preserve existing Development assignments and choose a separate dedicated demo slug when there is a collision. Delivered status alone does not make a fixture legitimate for Production synchronization.

**Why:** The initially proposed NovaX demo slug already belonged to a delivered customer tenant. Its matching display name was not proof that it was disposable demo data.

**How to apply:** Never repurpose a delivered tenant merely because its branding matches the requested demo. Reuse only a confirmed dedicated demo, keep provisioning idempotent, and exclude an explicitly disposable delivery from Production unless the user approves reclassification.

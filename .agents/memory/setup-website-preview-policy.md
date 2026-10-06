---
name: Setup website preview policy
description: Customer-facing Development previews must not require or trigger tenant activation/delivery.
---

Preview the actual shared customer-facing Master Exchange while a Development
tenant is still Sandbox/Setup. Issuing a preview must never activate, deliver,
configure, clone or otherwise advance the tenant.

**Why:** The user explicitly wants to inspect what an outside customer would
see before completing the manual provisioning workflow. Public delivery
guards and private attachment protection must remain intact.

**How to apply:** Let an authorized operator issue a short-lived, tenant-scoped
read-only Development preview. Reuse the existing public projection, shared
renderer and the exact selected logo/favicon; do not expose order requirements,
private customer data or mutation access. Production must reject these proofs.
Normal anonymous draft URLs remain unavailable. The project page must clearly
distinguish the customer website from its Exchange Admin Panel.

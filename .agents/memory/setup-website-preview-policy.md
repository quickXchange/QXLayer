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

The required Production lifecycle includes customer order → approval → provision
White Label → tenant/project linked during setup → configure → preview → ready →
delivered. Production preview must remain distinct from the Production Admin Demo.

**Why:** The user explicitly required Production to support this current lifecycle,
including tenant linkage before delivery, while forbidding Admin Demo activation.

**How to apply:** Do not claim the full Production lifecycle is supported merely
because its database permits pre-delivery links. Verify preview runtime support
separately. Production must still reject Development-only proofs; do not weaken
that boundary or release a tenant early to make a preview work.

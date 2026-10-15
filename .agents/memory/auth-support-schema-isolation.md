---
name: Auth support schema isolation
description: Keep private authentication support schemas separate from public tenant-RLS inventory and grants.
---

Private authentication support tables must not inherit the public business
table inventory's RLS expectations or tenant-runtime access.

**Why:** Adding declarations for the existing private Auth schema exposed a
namespace-loss assumption: a names-only inventory looked for private tables in
public and blocked authenticated account reads. The native browser test caught it.

**How to apply:** Preserve namespaces when deriving security inventories, or
explicitly constrain an inventory to its intended schema. Keep all public
business tables covered. Never fix such a mismatch by disabling readiness/RLS,
weakening policy checks or widening tenant-role grants to Auth session storage.

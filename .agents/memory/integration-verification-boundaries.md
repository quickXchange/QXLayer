---
name: Integration verification boundaries
description: Privileged database roles and source-schema tooling do not establish tenant runtime connectivity.
---

Application tenant isolation and PostgreSQL policy enforcement are separate proofs. The Development connection can bypass row policies even on FORCE RLS tables; do not report a privileged-role query as proof that RLS isolates customers.

**Why:** Integration verification observed a scoped raw query return another fixture tenant's row under the privileged Development database role, while tenant-authorized service requests correctly rejected cross-tenant access.

**How to apply:** Keep explicit tenant predicates and scoped encryption. Inspect role bypass flags when verifying RLS. Do not create durable custom roles/ACLs just to pass a test; they can break managed publishing preparation.

Private Storage bucket flags are not RLS proof. For anonymous/authenticated roles,
check both bypass/superuser flags and direct/inherited table ownership, because
ownership can bypass row policies without a BYPASSRLS role flag. Require bounded
policy review and an actual unauthenticated download-denial check separately.

**Why:** A privileged Storage service-key read says nothing about what normal
roles can read; inherited ownership is another path around ordinary RLS.

**How to apply:** Fail closed when policy or ownership assumptions change. Never
rewrite existing policies or create roles merely to obtain a passing result.

Allowlisted external schema references are a deliberate source-reuse compatibility boundary, not permission to disable strict schema validation globally.

**Why:** Copied source contracts can reference shared workspace schemas that the generator otherwise rejects.

**How to apply:** Permit only reviewed shared references; retain source schemas and real context providers instead of replacing them with no-op shims or excluding copied packages from checks.

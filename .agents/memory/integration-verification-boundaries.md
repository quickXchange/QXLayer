---
name: Integration verification boundaries
description: Privileged database roles and source-schema tooling do not establish tenant runtime connectivity.
---

Application tenant isolation and PostgreSQL policy enforcement are separate proofs. The Development connection can bypass row policies even on FORCE RLS tables; do not report a privileged-role query as proof that RLS isolates customers.

**Why:** Integration verification observed a scoped raw query return another fixture tenant's row under the privileged Development database role, while tenant-authorized service requests correctly rejected cross-tenant access.

**How to apply:** Keep explicit tenant predicates and scoped encryption. Inspect role bypass flags when verifying RLS. Do not create durable custom roles/ACLs just to pass a test; they can break managed publishing preparation.

Allowlisted external schema references are a deliberate source-reuse compatibility boundary, not permission to disable strict schema validation globally.

**Why:** Copied source contracts can reference shared workspace schemas that the generator otherwise rejects.

**How to apply:** Permit only reviewed shared references; retain source schemas and real context providers instead of replacing them with no-op shims or excluding copied packages from checks.

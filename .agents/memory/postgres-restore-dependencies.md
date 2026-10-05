---
name: PostgreSQL restore dependencies
description: Why custom-role references can fail before an application build begins.
---

Database restore preparation can depend on custom roles through both policy targets and object ACLs. Disabling row security alone does not remove those dependencies.

**Why:** This project's managed publishing preparation failed before compilation because development metadata referenced a custom role unavailable in the restore environment. The production database also lacked that role. Development-only role setup was not production or intermediate-restore provisioning.

**How to apply:** Diagnose restore-stage failures separately from application build failures. Inspect role dependencies and ACLs as well as policies. Follow the current application-level authorization decision in `replit.md`; do not reinstate custom-role provisioning as a workaround or add production/build/startup migration DDL.

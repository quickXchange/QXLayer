---
name: PostgreSQL restore dependencies
description: Why custom-role references can fail before an application build begins.
---

Database restore preparation can depend on custom roles through both policy targets and object ACLs. Disabling row security alone does not remove those dependencies.

**Why:** This project's managed publishing preparation failed before compilation because development metadata referenced a custom role unavailable in the restore environment. The production database also lacked that role. Development-only role setup was not production or intermediate-restore provisioning.

**How to apply:** Diagnose restore-stage failures separately from application build failures. Inspect role dependencies and ACLs as well as policies. Follow the current approved isolation architecture in `replit.md`; do not reinstate custom-role provisioning as a workaround or add production/build/startup migration DDL.

Built-in role availability and implicit database-owner membership do not confer
table access. Restricted runtime role grants must be present in the reviewed
native migration, not only Development metadata.

**Why:** Both managed environments contain the database-owner group, but it had
no application table privileges until explicit Development grants were applied.

**How to apply:** Check each required privilege separately: PostgreSQL's
comma-separated privilege list means **any**, not **all**. Never accept a role-name
check as permission or publishing parity proof.

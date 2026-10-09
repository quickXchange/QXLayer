---
name: External migration authorization
description: Approved QXLayer target architecture and required pre-cutover approval sequence.
---

The user authorizes preparing QXLayer for an external PostgreSQL database using
Supabase. The target architecture is Vercel frontend hosting, Supabase PostgreSQL,
and a compatible backend hosting solution for APIs and background workers.

First complete and validate the migration/deployment plan and show the exact
Supabase setup and required connection details before Production database cutover.
Preserve existing customer accounts, Super Admin access, tenant records and
configurations. Keep the existing Replit Production database available as fallback
until the new environment is verified.

**Why:** The user explicitly selected an external database after the managed
native migration omitted security predicates and grants.

**How to apply:** Preparation is authorized, not immediate cutover or DNS changes.
External target migration scripts are appropriate only for the verified Supabase
target; the Replit source remains unchanged and its managed schema rules still
apply. Treat authentication identities and uploaded objects as separate migration
acceptance requirements, not something a PostgreSQL copy automatically preserves.
Render is only a recommendation until the user confirms the backend provider.

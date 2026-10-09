---
name: Replit-first delivery direction
description: External migration cancelled; finish QXLayer on Replit without weakening security or losing Production data.
---

The user cancelled Supabase, Vercel and Render migration plans for now and said:
"Do not spend more time preparing external hosting migrations. I want to finish
QXLayer on Replit first."

**Why:** The user explicitly reversed the earlier external migration approval.

**How to apply:** The current delivery requirements are recorded in replit.md.
Do not revive the external plan without a new explicit request. Historical
external SQL/report artifacts are not approved execution instructions. Keep
managed Production schema changes in Replit's native Publish flow; a security
blocker does not authorize a custom Production migration hook or silent removal
of database-enforced isolation.

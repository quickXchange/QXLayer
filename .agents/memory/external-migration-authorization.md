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

The user explicitly chose retaining database-enforced RLS after being offered
application-only isolation, and asked to check the Production SQL console or
another supported mechanism using the existing verified policies and grants.

**Why:** The user wants to complete the release on Replit without weakening
tenant security.

**How to apply:** Do not re-offer application-only isolation as a release shortcut.
Investigate documented supported capabilities, but do not equate an SQL-runner
interface or generated documentation summary with a verified atomic schema/
policy/grant rollout. Preserve the strict release hold until actual policy,
permission and access readbacks establish readiness.

For the QXLayer Production release, the user instructed:
"Do not contact support, migrate hosting, weaken security, or repeat previous reports."

**Why:** The user repeated these release constraints.

**How to apply:** Respect these constraints throughout release work. Do not
substitute another report or support referral for a completed migration, and
state clearly when a requested action cannot be performed.

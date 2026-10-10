---
name: External preparation authorization
description: GitHub/Vercel/Render/Supabase preparation is authorized; Production transfer and cutover are not.
---

The user subsequently authorized preparing permanent GitHub-based deployment:
Replit Development, Vercel frontend if compatible, Render API/workers, and
Supabase Production PostgreSQL with complete RLS. This supersedes the previous
cancellation of external preparation.

**Why:** The user explicitly reinstated external preparation, but said:
"Do not migrate Production data, expose secrets, switch DNS, or shut down the
existing website yet."

**How to apply:** The current delivery requirements are recorded in replit.md.
Preparation is authorized; target provisioning, Production transfer and cutover
still require separate approval. Historical SQL/reports are not current execution
instructions. Preserve accounts, Super Admin, design and isolation; do not touch
QuickXchange. Keep
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

**How to apply:** The hosting-preparation prohibition above was superseded, but
the no-cutover and no-security-weakening constraints remain. Do not
substitute another report or support referral for a completed migration, and
state clearly when a requested action cannot be performed.

## Production snapshot preparation

For the QXLayer-to-Supabase database preparation, the user selected:
"Prepare an export script for me to run later", rather than supplying an existing
Production backup.

**Why:** The user requested preparation without executing anything, preserving
all actual QXLayer Production records and excluding QuickXchange.

**How to apply:** Preparing the operator's read-only export is authorized; running
that export, importing the snapshot, or changing either live connection still
requires new explicit approval. Never substitute Development data or claim an
offline export kit already contains Production records.

## Confirmed primary baseline and staged target upgrade

The operator verified the actual QXLayer Production primary through Replit's
browser SQL runner and confirmed that the integration schema in the newer source
has not reached Production. The user operates this migration from an iPad.

**Why:** The earlier export kit assumed the newer source model was the existing
Production baseline. The user explicitly prohibited adding the missing schema to
Production or using Development data to reconcile the mismatch.

**How to apply:** Pin export review to actual primary metadata and preserve the
existing baseline first. Any additive application-compatibility schema belongs
only on the isolated Supabase candidate, under a separate approval after source
preservation checks. Keep application startup/cutover held; do not bypass the
runtime's full isolation readiness checks. Use browser metadata capture when
workstation tools are unavailable; metadata checks never authorize export,
freeze or restore.

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

## Browser metadata capture must be one SELECT

Keep Production SQL Runner's Enable Editing OFF. Its read-only gate rejects
transaction and session-setting statements, even around a catalog-only query.

**Why:** The operator's metadata capture was rejected with "Cannot run
modification statements in read-only mode"; the user explicitly required one
read-only SELECT and no Production changes.

**How to apply:** Use only a SELECT with read-only catalog functions; no
transaction wrappers, SET or setting-changing functions. Download complete query
results as CSV rather than copying a truncated grid cell, with payload byte
length and digest checked offline before metadata approval.

## Native platform history is not application migration history

Discover native Replit migration-ledger objects separately from the application's
Drizzle/deployment history before approving a full Production export.

**Why:** The operator's complete primary metadata exposed a system-managed
ledger outside the export kit's assumed application-history schemas. Merely
allowing that schema would leave dependency, DDL and sequence capture incomplete.

**How to apply:** Review the platform ledger's exact objects and preservation
requirements, retain its original rows/IDs in the source backup, and keep its
history separate from active target migration execution. Never synthesize
application ledger entries or omit unknown history to make validation pass.

Preserve native history as passive source history, never an active target
migration runner. Deny application/Data API access to it; bind rows, DDL and both
sequence states/ownership links to the source snapshot and all later preservation
checks. No unknown system-schema allowance is justified by one verified ledger.

**Why:** The reviewed native ledger includes a separate owned bigint sequence;
application-only sequence capture would lose its original state and ownership.

Metadata with PostgreSQL bigint ranges must use integer-safe decoding and
serialization, not JavaScript JSON number round-tripping.

**Why:** JavaScript silently rounds the 64-bit sequence maximum, invalidating an
otherwise exact catalog comparison.

**How to apply:** Preserve catalog integers using Python/exact-integer tools and
test their equality against the original capture before distributing a kit.

## Secure read-only preparation boundary

The user authorized secure reuse of the existing QXLayer Production connection
and encrypted backup preparation, but explicitly prohibited Production changes,
write freeze, record export, Supabase restore and deployment at this stage.

**Why:** The user requested prerequisite verification before any actual data copy.

**How to apply:** Metadata-only primary preflight is allowed after secure source
configuration. Never mistake the managed Production replica for the primary.
Keep the backup key independently recoverable outside Replit; do not treat a
private directory as an encrypted filesystem or approve legacy plaintext
assembly into a ciphertext-only destination. QuickXchange stays separate.

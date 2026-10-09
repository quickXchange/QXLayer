# QXLayer Replit-native RLS release evidence

## Release status

**BLOCKED — no Production schema/data operation or publishing performed.**
This is a verified Development metadata reference and native-preview diagnostic,
not a custom Production migration or proof of Live workflow completion.
Keep the existing Production database; do not copy/overwrite Development data.

## Current evidence

- Development: 42 application tables, 84 policies with complete USING predicates;
  all write policies have WITH CHECK. Every table enables and FORCES RLS.
- The built-in `pg_database_owner` runtime role is neither superuser nor BYPASSRLS;
  all four table CRUD privileges and request-number sequence USAGE/SELECT exist.
- Production replica: 40 application tables, no policies, no RLS/FORCE flags and
  no corresponding restricted-role CRUD/sequence privileges.
- Native preview: 134 statements, 84 policy creates without USING, 42 write-policy
  creates without WITH CHECK, zero grants and zero FORCE statements.
- The native structural-data-loss flag is false, but the plan is marked possibly
  non-backwards-compatible. Non-destructive is not the same as security-correct.
- Actual Production and Development request status/delivery CHECK definitions
  currently match: a tenant is required when delivered; pre-delivery tenant links
  are allowed. Older strict-constraint investigation is not a current blocker.
- Production currently has one administrator row and one active administrator.
  That metadata does not prove a successful authenticated Owner browser journey.

Files:

- `development-readback.json`: exact existing policy predicates and per-table
  flags/privileges, as database metadata rather than generated migration SQL.
- `production-readback.json`: read-only Production replica security baseline.
- `native-preview.json`: actual native preview, not an Agent-modified plan.
- `validation.json`: offline validation outcome.

Run `node scripts/release/verify-replit-rls-reference.mjs` to validate the captured
metadata. It does not connect to a database, execute SQL or publish.

## Supported capability check

The official SQL-runner guide documents Database → My Data → SQL runner.
The Production guide allows user editing of Production data, says Agent cannot
modify Production, and describes schema application during publishing.
Neither article explicitly proves that a complete atomic policy/grant/FORCE/
code rollout can be safely substituted with this interface.
Generated documentation summaries claiming specific Production RLS DDL support
are not sufficient evidence.

Replit-managed schema migrations must use the native Publish flow available to
Agent. No custom Production migration, build hook or startup DDL is introduced.
The SQL runner is not treated as an authorization to bypass this restriction.

## Required platform correction and user action

The remaining intervention is a Replit native-migration correction/approved
platform procedure, not a database reset or an external-hosting change.
Ask Replit technical support to examine the missing native policy predicates,
restricted-role grants and FORCE flags using these evidence files. Do not apply
the currently displayed incomplete plan.

A valid release needs the complete conditions from the verified reference,
per-table SELECT/INSERT/UPDATE/DELETE for `pg_database_owner`, schema USAGE,
sequence USAGE/SELECT, RLS/FORCE flags and preservation of all existing records.
The two new integration tables need the same protections.
Enabling FORCE RLS on the old deployment before coordinated compatible code/
schema rollout can lock out existing access; do not perform isolated console
repairs without a verified platform-supported rollout.

After the platform provides a supported complete plan, refresh and validate it;
the user triggers Publish with Development-data overwrite disabled. Then inspect
actual Production metadata, verify the unchanged active Super Admin identity,
and test authenticated customer request → provisioning → delivery → Admin Panel,
tenant isolation, suspension/reactivation, private tracking, uploads and Telegram
authorization/deduplication. None of those post-release checks is claimed here.

Official references:

- https://docs.replit.com/features/data-and-storage/work-with-your-data#run-sql-commands
- https://docs.replit.com/features/data-and-storage/development-and-production
- https://replit.com/support

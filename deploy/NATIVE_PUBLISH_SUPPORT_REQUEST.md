# Replit Support request: native Publish schema plan loses RLS and private schema

**Subject:** Security-sensitive Publish blocker: native database plan strips RLS USING/WITH CHECK and omits private Auth schema

**Project:** VYNOX LAYER. Paste the current Replit project URL from the browser here.

## Request

Please investigate and fix the **native Development → Production Publish database
planning service**, then regenerate a complete **preview only**. Do not execute
migrations, change Production data, reset databases, overwrite Development data
onto Production, or publish this project. We will review the corrected native
plan before separately authorizing any rollout.

The current source database is correct. A newly generated read-only native
preview from `explainSchemaDiff()` contains 134 statements:

- 84 `CREATE POLICY` statements omit `USING`.
- All 42 write policies omit `WITH CHECK`.
- `vynox_supabase_auth` and all five private tables are omitted entirely:
  `identity_links`, `sessions`, `rate_limits`, `recovery_codes`, `recovery_events`.
- Development has 20 columns and 11 constraints in that private schema.
- All 42 Development application tables have FORCE RLS, but the preview
  contains no `FORCE ROW LEVEL SECURITY` statements.
- The remaining 50 statements were individually compared with Development:
  42 ENABLE RLS statements, two new public tables (columns/types/nullability/
  defaults/PK/CHECK), three foreign keys, and three unique indexes match.
- `hasStructuralDataLoss` is false, but
  `maybeNonBackwardsCompatible` is true. Structural safety is not RLS safety.

The Production read replica has no private Auth schema and no policies, so these
objects are genuinely pending changes, not omissions caused by existing parity.

## Confirmed input/output loss

Direct read-only PostgreSQL catalog queries confirm 84 Development policies
with nonempty `qual` expressions and all 42 write policies with nonempty
`with_check` expressions. The private namespace and all five tables exist in
Development. Its 20 columns and 11 constraints are visible to the catalog
reader, whose role is `postgres` and whose schema USAGE check succeeds.

For example, the real Development `platform_admins.qx_write` policy requires:

    USING (
      COALESCE(current_setting('app.is_super_admin', true), '') = 'true'
      AND COALESCE(current_setting('app.can_write', true), '') = 'true'
    )
    WITH CHECK (the same guarded expression)

The newly generated native statement is:

    CREATE POLICY "qx_write" ON "platform_admins"
      AS PERMISSIVE FOR ALL TO public;

PostgreSQL's omitted expressions default to allowing rows; this is not an
acceptable equivalent of the guarded Development policy. Some intentional
public-read policies have `USING (true)`, but that does not justify stripping
the guarded policies or any write checks.

The namespace is exported from the project's Drizzle schema source. Previously
generated complete source DDL includes its CREATE SCHEMA and five tables.
Regenerating the native preview after that source correction still omits them.

## Independently reproduced upstream mechanism

An isolated synthetic reproduction uses the installed `drizzle-kit` **0.31.10**,
a new private Unix-socket-only PostgreSQL instance, and read-only introspection:

1. Define a synthetic public table with two policies containing USING and a
   write WITH CHECK; define a private namespace/table.
2. `generateMigration(emptySnapshot, fullSnapshot)` retains the expressions.
3. `pushSchema(imports, isolatedReadOnlyDb, ['public','vynox_supabase_auth'])`
   returns the two CREATE POLICY statements **without** their expressions.
4. No returned `apply()` function is called.
5. `generateDrizzleJson(imports, undefined, ['public'])` excludes the private
   table; including both schemas retains it.

The exact installed upstream code path is:

- `PgSquasher.squashPolicyPush` serializes only name/as/for/to/on.
- `unsquashPolicyPush` therefore does not restore using/withCheck.
- `PgCreatePolicyConvertor` emits clauses only when those lost fields exist.
- Push introspection defaults its schema list to `['public']`.
- The ordinary migration serializer retains using/withCheck.

This reproduces the observed failure modes. **We cannot inspect or attest the
deployed Replit service's internal package version, call stack, connection role,
or schema-selection configuration.** Please confirm whether these mechanisms
are used by the native planner, or identify the corresponding internal loss
boundary. A project-only dependency patch must not be presented as a fix for
the platform's native plan.

## Required platform correction and acceptance

1. Preserve complete catalog policy representations through native
   introspection, comparison and SQL generation, including changed expressions,
   commands, target roles and permissive/restrictive mode.
2. Preserve USING and WITH CHECK for newly created policies; do not use stripped
   push-policy objects as their complete SQL definition.
3. Include the selected private namespace in both source/target introspection
   and diffing. Confirm the supported native method of selecting non-public
   schemas if the service currently filters to public only.
4. Include its five tables, all columns, PK/unique/CHECK constraints and required
   namespace creation in dependency-safe order.
5. Preserve FORCE RLS. Confirm a platform-supported coordinated ACL/role and
   code/schema rollout where required; do not introduce an insecure interval or
   lock out the running release by applying partial changes early.
6. Regenerate the native preview and compare every policy with the captured
   catalog expressions. Verify no unexpected removals, truncations or changes to
   existing records. Please also confirm the interactive Publish dialog retains
   these protections; the Agent preview is the documented noninteractive diff.

We cannot accept moving private Auth tables into public, removing FORCE/RLS,
using an unconditional policy, adding startup/build DDL, applying custom SQL to
Live, or bypassing the project's publishing hold as a workaround.

## Evidence and reproduction

The attached evidence document contains only schema/policy metadata, native SQL,
per-statement/per-policy comparisons and synthetic reproduction results.
It contains no passwords, tokens, connection strings, business rows or Auth
user/factor/session contents.

Project files:

- `generated-artifacts/native-publish-investigation/native-fresh.json`
- `generated-artifacts/native-publish-investigation/development-catalog.json`
- `generated-artifacts/native-publish-investigation/production-catalog.json`
- `generated-artifacts/native-publish-investigation/development-visibility.json`
- `generated-artifacts/native-publish-investigation/development-schema-details.json`
- `generated-artifacts/native-publish-investigation/verification.json`
- `generated-artifacts/native-publish-investigation/upstream-reproduction.json`

Reproduction: `node scripts/release/reproduce-publish-policy-loss.mjs`.
Comparison: `node scripts/release/verify-native-publish-preview.mjs`.
The verifier's focused tests pass and fail closed on missing expressions/schema.
No Production/Development business database writes or publishing occurred.

## How to submit

Sign in to Replit, open this project, click the **? / Help** menu and open the
Support/contact form. Paste this request, add the browser's project URL, and
attach `native-publish-support-evidence.json` downloaded from the prepared report.
If the menu does not offer the form, open https://replit.com/support while signed
in. Ask for a native planning-service correction and regenerated preview only.

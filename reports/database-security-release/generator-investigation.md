# Native policy-plan generator investigation

## Outcome

BLOCKED. The native plan still loses 84 USING clauses and 42 WITH CHECK clauses.
No database writes, publication, policy-source edits, verifier changes, dependency
changes, or manual changes to generated SQL were performed in this investigation.
The native snapshot was refreshed from the unmodified service response.

## Exact generation and verification paths

The checked snapshot is
`reports/database-security-release/native-schema-diff.json`.
It is captured through Replit's `explainSchemaDiff()` callback, with no arguments,
then saved as `{ capturedAt, scope, diff: response }`. There is no workspace
command/script that implements or invokes this native service.

`pnpm run release:check` invokes:

```sh
node scripts/release/verify-publish.mjs && pnpm run typecheck
```

The verifier reads that snapshot; it does not generate it.

The workspace's distinct Development mutation commands are:

```sh
pnpm --filter @workspace/db run push
# drizzle-kit push --config ./drizzle.config.ts
pnpm --filter @workspace/db run push-force
# drizzle-kit push --force --config ./drizzle.config.ts
```

Neither mutation command was run. The config is `lib/db/drizzle.config.ts`:
PostgreSQL, schema `lib/db/src/schema/index.ts`, connection from DATABASE_URL.
It does not configure the native service.

## Dependency checks

Ran both requested commands and their recursive workspace equivalents:

```sh
pnpm why drizzle-orm
pnpm why drizzle-kit
pnpm -r why drizzle-orm
pnpm -r why drizzle-kit
```

At the root the first two have no dependency-tree output; recursive output
shows one installed version per package:

- drizzle-orm 0.45.2, shared by API, DB, scripts and drizzle-zod's peer.
- drizzle-kit 0.31.10, DB devDependency.

No duplicate versions: no alignment or reinstall was necessary.
The native service's internal dependency versions are not exposed by the callback;
these workspace versions must not be reported as verified service versions.

## History

Latest explicit full-release-preflight pass evidence found in tracked reports:
`72b5631`, `reports/provisioning-constraint-investigation/IMPLEMENTATION-REPORT.md`.
Git does not store command exit logs for every subsequent commit, so this is not
proof that it was the last actual successful command invocation.

The latest revision before the database-security verifier was introduced is
`0b0bd34`. Its exact verifier, configs, sources and snapshots were extracted
read-only to /tmp and its `node scripts/release/verify-publish.mjs` passed.
This reruns the historical verifier only, not its full historical typecheck.

Relevant changes since the recorded passing revision:

- `lib/db/package.json` and `lib/db/drizzle.config.ts`: unchanged.
- Drizzle ORM/Kit resolved versions in the lockfile: unchanged (0.45.2/0.31.10).
- Root package: commercial checks added to release:test; external-hosting scripts
  and pnpm packageManager declaration added. release:check command unchanged.
- API package: added the workspace i18n dependency.
- Website package: added amount-format, i18n, payment-logo and quickxchange-mini-core.
  Those four workspace library manifests were added.
- Scripts package: added Development-only security setup, later corrected its path.
- Workspace catalog: pinned React type specifiers to 19.3.0, clsx to 2.1.1,
  tailwind-merge to 3.6.0. Two existing override entries were reordered.
- Lockfile: corresponding workspace importers/catalog changes; no Drizzle upgrade.
- `5cc6308`: added commercial-plan verification.
- `5212bff`: added the database-security contract and snapshot check, along with
  policy source/setup. Its original checked native snapshot already omitted the
  predicates. This newly exposed an unsafe plan; it was not a Drizzle-version
  regression introduced after the historical passing preflight.
- No workspace native-plan generator implementation was added or changed.

Full comparison:

```sh
git diff 72b5631 HEAD -- '**/package.json' package.json pnpm-workspace.yaml \
  pnpm-lock.yaml lib/db/drizzle.config.ts scripts/release/
```

## Isolated generator evidence

Added `lib/db/src/plan-generation.test.ts`. It calls the installed Kit's
`generateDrizzleJson()` and `generateMigration()` offline and checks every
generated condition against the actual ORM policy expression.
All 84 USING and 42 WITH CHECK predicates survive this path.
It is diagnostic output, NOT a replacement native Publish plan.

Separately called the installed Kit's `pushSchema()` on a two-policy test table
with a mocked execute method returning empty introspection rows and refusing
non-SELECT/WITH SQL. No real database or apply callback was used.
It returned:

```sql
CREATE POLICY "qx_read" ON "policy_probe" AS PERMISSIVE FOR SELECT TO public;
CREATE POLICY "qx_write" ON "policy_probe" AS PERMISSIVE FOR ALL TO public;
```

The installed `drizzle-kit/api.mjs` explains this loss:
`squashPolicy` includes using/withCheck; `squashPolicyPush` excludes both.
`unsquashPolicyPush` cannot recover them, and the push diff's policy-creation
path sends those incomplete objects to `PgCreatePolicyConvertor`.
The converter emits clauses only when its input contains them.
This is a reproduced push-path defect with the same native-output symptom;
the inaccessible service's exact internal implementation is not proven.

Fixing that upstream path requires preserving predicate payloads separately from
comparison metadata and passing complete predicates into SQL conversion.
Replacing a native service snapshot with local migration SQL or patching only a
workspace dependency would not prove that native Publish generation is fixed.
The fresh service response remains the authoritative evidence of the blocker.
Required restricted-role grants are also still absent from the native plan.

## Results

- Offline generator/source tests: 3 passed, 0 failed.
- `pnpm run release:test`: 34 passed, 0 failed.
- Database-security contract tests: 2 passed, 0 failed.
- `pnpm run typecheck`: exit 0.
- `pnpm run release:check`: exit 1; missing USING on platform_admins.qx_read.
- Fresh native service response: 134 statements, 84 policy creates, 84 missing
  USING clauses, 42 missing WITH CHECK clauses.
- Both protected verifier files retain their original SHA-256 hashes.

The root-cause investigation is complete; correction of the native service is
not complete. Do not publish or treat the passing offline tests as native-plan
acceptance.

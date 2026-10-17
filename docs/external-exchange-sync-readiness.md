# Exchange: GitHub Sync and external deployment readiness

Verified 17 October 2026. **Ready for protected candidate Sync, not public cutover.**

## Deployed source and automation

- Repository: `quickXchange/VYNOX-LAYER`; default and deployment branch: `main`.
- GitHub, protected Vercel frontends and live Render API all identify
  `4baae449c3381fea1f4b8f9abf1da3ca08ab05be`.
- Automatic candidate workflow run `39073775996` completed successfully.
- Actions are enabled. The candidate environment has a branch restriction but
  no required reviewer or wait timer.
- A push to `main` runs shared type/build/regression/disposable-database checks,
  verifies the protected boundary, deploys and awaits the exact Render API
  commit, checks the already-applied reference package, builds both frontends,
  verifies the Vercel Preview commit, and updates only the protected alias.
- Render native auto-deploy is off and Vercel has no native Git integration.
  This is intentional: GitHub Actions is the deployment controller.
- API deployment precedes frontend deployment. This is not an atomic two-host
  transaction; a later failure requires diagnosis/re-running the failed job.
  Do not consider Sync successful until both jobs and exact-commit checks pass.
- The worker remains suspended. No `--prod`, public activation or DNS step is
  part of the automatic candidate workflow.

## Blockers repaired without pushing

1. Fetched the actual remote release history and reconciled divergent histories
   with a normal local merge. The merge tree exactly preserved the existing
   workspace tree. A stale, unheld Git index lock was quarantined without
   changing the original index. A normal non-force push dry-run passed using
   the approved workspace Git credential.
   The Git panel explicitly pulls with rebase: repository-local
   `rebase.rebaseMerges=true` is required to preserve this reconciliation.
   A plain flattening rebase was reproduced as a conflict in the landing
   Exchange demo; the merge-preserving command retained the exact original
   commit, source tree and ancestry in the isolated rehearsal.
2. Catalog migration `0007_global_exchange_catalog.sql` had previously executed
   successfully but was missing from the standard migration ledger. Verified
   its immutable execution receipt, exact SQL checksum and complete reviewed
   schema before recording only the missing ledger entry. No DDL or seed was
   replayed; all public table records were checked unchanged.

## Supabase, environment and Owner

- All six migrations in the protected Production-candidate manifest are
  recorded with exact checksums; no required migration remains pending.
- Actual schema matches the reviewed reference schema. Reference package
  version 2 is already applied; operator edits/deletions must not be reseeded.
- Provider-side database/auth connections, session signing, protected gate,
  private storage, provider vault and TLS configuration are present.
- Verified database TLS, restricted runtime configuration and protected API
  connectivity passed. GitHub candidate Render/Vercel secret names are present;
  values were not printed or copied into source.
- Existing non-demo schema, business records, Owner role records and provider
  SSO passed preservation comparisons.
- The original approved Supabase Owner identity, confirmed email and verified
  MFA factor are present. No password login, reset, factor replacement, identity
  migration or permission change was performed in this review.
- Public readiness remains false intentionally: this is the protected
  acceptance environment, not activation of the public financial service.

## Exchange acceptance carried forward

Application files were compared by Git blob hash, not inferred from commit
messages. The latest rebuilt frontend/backend, contracts, configuration,
dependencies and deployment workflows match the deployed source.

The only pre-existing application-tree cleanup in native Sync is removal of
two unused generated currency type files that the snapshot publisher retained;
current generated exports and application code do not reference them.

Existing completed acceptance remains valid for the unchanged application:

| Feature | Evidence |
| --- | --- |
| Swap | Native three-step flow, validation, read-only Review, single creation and explicit Sandbox completion |
| Convert | Native indicative BTC→ETH quote, three steps, one pending order and persisted admin details |
| Pricing Rules | Actual three-pair ANY→EUR matching, independent reverse, specific precedence and immediate fee changes |
| Orders / View Order | List/search, five-tab drawer, desktop/mobile, pricing/customer snapshots and authorized status gates |
| Order Created / tracking | Pending receipt and completed private tracking, customer-safe history, branded saved PDF |
| Regression coverage | 94 Exchange/integration tests; full external CI also passed |

These browser journeys were not unnecessarily repeated for this source/history
audit. Physical printing and executable Fixed/Floating provider capability
remain unverified; market references remain indicative and fail closed when
unsupported, stale or unavailable.

## Exactly what is safe to Sync

Use a normal GitHub Sync/Push to `origin/main`, preserving the reconciled
history. Sync the reviewed source, generated contracts, dependency lockfile,
versioned migration/configuration files, existing workflows and documentation.
Most rebuilt code is already remote and deployed; this review did not introduce
new runtime features.

Do not force-push, change deployment targets, copy secret values, commit `.env`
files/backups/database exports, replay demonstration data, rerun the catalog
importer, or enable public startup/auth cutover.

## Manual steps remaining

- No separate Vercel deployment, Render restart, Supabase migration, environment
  entry or Replit Republish is currently required for the protected candidate.
- The user may perform normal GitHub Sync and wait for the complete automatic
  candidate workflow. A different Git-pane credential may require reconnection
  if it differs from the approved credential used for the dry-run.
- If a future change adds a migration or environment requirement, it needs its
  own review; automatic candidate Sync deliberately does not run arbitrary DDL.
- Public release and switching `quicklychan.xyz` remain a separate, unapproved
  action. No public DNS, custom-domain binding or cutover was changed.

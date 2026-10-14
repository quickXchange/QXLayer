# Production administration-only Auth: backup readiness

## Prepared safely on 2026-10-15

No Production/Staging writes, schema changes, account/factor/session changes,
provider provisioning, real-data export/restore, cleanup or publishing occurred.
The earlier focused read-only SELECT of `platform_admins` returned one active
original Admin and the same full-row fingerprint as the completed inventory.
Subsequent source/catalog reads and a purely synthetic local restore are
described below; neither altered Production or Staging.

The exact stored legacy native ID is now known. The user subsequently confirmed
on 2026-10-15 that this exact ID is present in the Production Auth user-details
view. The business-to-directory match is therefore **user-confirmed**, not
independently retrieved by the agent. No further Owner-ID proof is needed now.
No email matching, second Owner or test-account migration.
Native MFA/custody must still be proved by the genuine administrator before any
future link/cutover; a matching ID alone is not authentication.

## Existing encryption tooling verified — no new encryption scheme

Reused the existing private transfer kit under
`generated-artifacts/qxlayer-production-transfer-40/`. It is ignored output, not
durable tracked source; recheck presence and these hashes before later use:

| Module | SHA-256 |
|---|---|
| `encrypted_backup.mjs` | `ad161dd7bd5e4e03c7e21111ac49e0dee4180ae95b7c7ffa09a9dd6d3d131e3a` |
| `encrypted_recovery.mjs` | `e14c41de329db671731c2c0f944f19e074b386c9e11b5c833748ac693b75190f` |
| `package_stream.py` | `ccdbbfb47021dbdfc34044908c93efc50d681cbb5dd1fead36615f564acd19bc` |

Commands already run, with synthetic data only:

    node generated-artifacts/qxlayer-production-transfer-40/encrypted_backup.mjs check-configured-key
    node generated-artifacts/qxlayer-production-transfer-40/test_streaming_recovery.mjs

Results: **10 configured-key encryption checks and 10 authenticated streaming
recovery checks passed**. This includes an independent WebCrypto reader,
multi-megabyte payload, delayed asynchronous consumer, wrong key, tampered
header/body/tag, truncation, consumer failure and private-cache cleanup.
No key value was displayed or copied. Synthetic ciphertext files were removed
by the tests; no real Production records entered the encryption pipeline.

Encryption is AES-256-GCM, random salt/nonce and authenticated header, with
scrypt N=131072, r=8, p=1. Ciphertext staging is outside the workspace/dev-server
tree in an owned 0700 directory with owned 0600 files. Full original-envelope
authentication completes before any plaintext consumer; intermediate recovery
caches are ciphertext under ephemeral memory-only keys.

**These successful tests are not a Production backup, a restore rehearsal,
evidence that the stored export URL points to the deployed database, or proof
that the key is recoverable outside Replit.** Production secret-existence checks
only confirmed configured names; they did not reveal values or prove binding.

## Smallest safe capture and verification scope

Prepare to retain:

- The actual running Production business database: all tables/rows, identifiers,
  roles/permissions, constraints, indexes, grants/RLS, sequences and migration
  ledger. Preserve test business records in the backup even though their
  authentication identities need no Supabase migration.
- The protected-administrator manifest and original provider recovery
  capability. Provider password/factor material is not assumed exportable.
  Keep the original provider/MFA available; never use a raw Clerk CSV as a
  chat/workspace attachment.
- Authorized private files and the immutable previous release/configuration
  references. Secret/key custody stays separate from ciphertext and reports.

Do not run an old transfer capture script against an assumed target or adapt a
stale frozen baseline silently. Bind a future capture to a current, confirmed
runtime source and approved scope. Stream real capture directly to encryption;
no plaintext dump, archive, SQL, connection URL or stderr spool in the workspace.
If consistent capture would need locks, write freezes or side-effect suppression,
stop for explicit approval; this preparation does not authorize them.

After capture, require exact ciphertext SHA-256/receipt readback from an
independent private receiving copy, complete envelope and package verification,
then an expressly approved isolated restore with outbound execution disabled.
Check original identifiers, Admin/MFA recovery capability, roles, complete data,
constraints, sequences and file access against the captured baseline.

Reuse an existing authorized receiving service if appropriate; no new cloud
account, bucket or provider project has been requested. Do not write to a
Staging project or reuse a prior receiving destination without verifying its
environment and authorization. A Replit-local ciphertext copy is not independent
durable recovery.

## Remaining genuine prerequisites

### New read-only verification

- The dedicated pinned export connection is reachable: PostgreSQL **16.15**,
  database `neondb`, transaction read-only, one active Admin and the exact
  unchanged original Admin row fingerprint. Client TLS **1.3**, verified
  CA/hostname and required channel binding were confirmed. **This does not
  attest which connection the already-running app uses.**
- The published app's Clerk environment read still returns **403**; filtered
  deployment logs have no provider/database marker. Publishing metadata gives
  no immutable deployed source ID or effective database binding. Production
  contains the user-confirmed original Clerk identity, but the *running*
  provider remains unconfirmed.
- Existing Supabase receiving project is the pinned **Staging** project
  `muvedavhbpgpdrrnjrih`, not an isolated Production backup project. Its existing
  `qxlayer-private-migration-backups` bucket is private, accepts octet-stream/JSON
  and limits each object to **50,000,000 bytes**. Read-only catalog checks found
  Storage RLS enabled, zero Storage policies, restricted anonymous/authenticated
  roles and no unprivileged Storage ownership. No bucket/object was created,
  changed, uploaded or deleted.
- Supabase Management GETs for project enumeration and provider backup metadata
  returned **403 JSON errors**. Existing Storage and verified-TLS catalog reads
  work; do not label that as management permission or infer PITR/retention.
  There is no need to rotate a working Storage key to obtain project metadata.
- Local private ciphertext staging currently has no retained ciphertext.
  The existing backup key is configured and the prior synthetic checks passed;
  independent outside-Replit key custody remains unverified.

### Isolated restore environment identified and tested

An existing PostgreSQL **16.15** toolchain can run a disposable private **local**
cluster outside the workspace. A new synthetic-only rehearsal used a private
0700 directory and Unix socket, with TCP listening disabled and **no inherited
Production/provider credentials**. Generic fixture rows, exact bigint values,
primary/foreign/unique/CHECK constraints and identity-sequence state survived
dump → restore. No real account or backup was used; the cluster was stopped and
removed afterward.

This avoids a new service and never targets Staging or Production. It is an
identified/tested *candidate*, not approval or evidence of a real-data restore.
A future approved rehearsal must use a fresh cluster, reviewed roles/extensions,
no running application/jobs and disabled outbound integrations. Real restored
data must not be made reachable through an app preview or network listener.

Read-only inspector:
`scripts/release/inspect-production-preparation.py`.
Synthetic-only restore runner:
`scripts/release/production-local-restore-rehearsal.py`.
Neither accepts an arbitrary Production restore URL or real backup input.
Do not call the older `supabase_backup.ready()`/`canary()` helpers under this
read-only restriction: they can create buckets or upload synthetic objects.

Evidence is in ignored `generated-artifacts/auth-security/`:
`production-storage-source-options-20261015.json`,
`production-storage-access-supplement-20261015.json`, and
`production-local-synthetic-restore-20261015.json`.

### Smallest approved execution procedure — not executed

1. **Pin the live source:** obtain the immutable running release/provider and
   its database binding; match it to the verified dedicated connection. Retain
   that Clerk-capable release, original keys/MFA and the protected Admin mapping.
2. **Approve custody and a quiet capture window:** confirm independent key
   retention and an authorized private ciphertext destination. Do not use the
   existing Staging bucket unless the user explicitly allows *backup object
   writes only* there. Otherwise select an already-owned non-Staging destination;
   do not create new infrastructure automatically. Retain a receipt/checksum.
3. **After explicit real-backup approval:** stream one consistent business
   snapshot and authorized file inventory into existing authenticated encryption,
   without plaintext disk files. Preserve all data, including test business
   records; migrate only protected authentication identities. Check size before
   using a 50 MB object destination; never truncate or silently split/omit data.
   Any needed lock/freeze requires its own approval.
4. **Verify recovery:** read back the independent ciphertext, match the exact
   receipt SHA-256, authenticate the full envelope/package, then restore only
   into a freshly approved disposable local cluster. Verify IDs, Admin state,
   roles/data, raw constraints and sequences; keep original Clerk/MFA intact.
5. **Cutover/rollback remains separately approved:** retain additive identity
   links and all new business activity. Roll back code/provider to the retained
   Clerk release if needed, not an old database over newer activity. Do not
   delete test users, reset MFA or remove original keys as part of rollback.
   Native protected-Admin acceptance and final Republish approval are still
   required.

The identity/directory-match prerequisite is resolved by the user's exact-ID
confirmation. Native MFA/custody acceptance remains a later protected-Admin gate.

1. **Running source:** immutable deployed provider/release and effective business
   database binding remain unavailable through the exposed metadata. The fresh
   deployment response confirms only a successful public autoscale publication
   and the existing hosts, not these runtime details. Existing manual read-only
   steps are in `PRODUCTION_AUTH_MANUAL_EVIDENCE.md`.
2. **Recoverability/custody:** the existing receiving bucket is Staging and is
   not approved for writes. Confirm a permitted destination and independent
   key retention. A local isolated restore candidate is now verified with
   synthetic data, but real-backup capture/restore still needs explicit approval.
   No secret value is requested.

Production Supabase project reference, explicit Production-capable code, secure
configuration, reviewed additive publish diff, protected-Admin native acceptance
and separate execution/Republish approvals remain release prerequisites.
The current Development-only runtime guards have not been weakened.

No cleanup is proposed. Verified backup must precede any future cleanup
proposal, and exact-scope deletion still requires explicit approval.

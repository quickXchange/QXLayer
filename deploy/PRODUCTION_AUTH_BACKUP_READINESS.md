# Production administration-only Auth: backup readiness

## Prepared safely on 2026-10-15

No Production/Staging writes, schema changes, account/factor/session changes,
provider provisioning, data export, restore, cleanup or publishing occurred.
The only Production operation was a focused read-only SELECT of the existing
`platform_admins` records. It returned one active original Admin and the same
full-row fingerprint as the completed inventory.

The exact stored legacy native ID is now known. This identifies the business
authorization record, **not yet its presence in the Production Auth directory**.
Only a Production user-details record bearing that exact ID is needed to
resolve this match. No email matching, second Owner or test-account migration.
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

1. **Identity:** confirm the exact stored Super Admin ID is present in the
   Production Auth user-details view. The user need not send both test-user
   records, a directory export, password or MFA code.
2. **Running source:** immutable deployed provider/release and effective business
   database binding remain unavailable through the exposed metadata. The fresh
   deployment response confirms only a successful public autoscale publication
   and the existing hosts, not these runtime details. Existing manual read-only
   steps are in `PRODUCTION_AUTH_MANUAL_EVIDENCE.md`.
3. **Recoverability/custody:** verify the authorized independent private
   ciphertext destination, independently retained key and isolated restore
   target before calling a real backup usable. No secret value is requested.

Production Supabase project reference, explicit Production-capable code, secure
configuration, reviewed additive publish diff, protected-Admin native acceptance
and separate execution/Republish approvals remain release prerequisites.
The current Development-only runtime guards have not been weakened.

No cleanup is proposed. Verified backup must precede any future cleanup
proposal, and exact-scope deletion still requires explicit approval.

---
name: QA cleanup durability
description: Disposable verification cleanup manifests must survive workspace restarts.
---

Keep the exact cleanup scope for disposable database fixtures in a temporary
workspace file until cleanup completes, not only in /tmp or browser memory.

**Why:** A workspace restart removed /tmp while the disposable database rows
remained, requiring bounded reconstruction of their cleanup scope.

**How to apply:** Persist only fictional QA identifiers, keep the file out of
source control, and remove it after cleanup. Never infer cleanup scope from
customer-like names or broad patterns; preserve the retained Asterlane fixture.

Confirm fixture tracking by reading the persisted identifiers, not just by
accepting an HTTP success response from a helper.

**Why:** A browser test reported successful tracking while its payload did not
populate the cleanup resource list. The actual Staging records existed, but the
success status alone did not establish a safe cleanup scope.

**How to apply:** Validate tracking payloads explicitly and read back the manifest.
If scope is missing, reconstruct it using the exact disposable identity and
tenant/order relationships, never broad labels or pre-existing customer records.

Verify provider credential revocation after stopping a test helper.

**Why:** A background helper was reported stopped while its asynchronous
provider cleanup had not removed its temporary protection credential.

**How to apply:** Read back the provider's credential list; revoke only the exact
temporary test credentials identified by their dedicated marker, and confirm
none remain. Do not infer cleanup from a stopped process or change permanent
protection.

For helpers with asynchronous cleanup, send SIGTERM to the actual Node process
and wait for its cleanup result before forcibly stopping its background task.
The generic stop action can end the process before its provider calls complete.

Do not assume an identity/request QA cleanup helper covers commercial catalog
fixtures. Tenant-only cleanup does not include global catalog children or
dependencies in approved private schemas.

**Why:** Reusing a narrower helper for plan/add-on tests repeatedly hit restrictive
foreign keys and rolled back identity cleanup, leaving privileged test accounts active.

**How to apply:** Check the live dependency graph across the explicitly approved
schemas before cleanup. Delete only the tracked fixture children before their
parents, then verify provider identity removal and database absence separately.

Separate authentication throttle progression from business-data preservation.
Do not rewind shared anti-abuse counters to make a whole-database fingerprint
match after native sign-in and MFA tests.

**Why:** Native QA legitimately advanced private rate-limit records even after
all disposable identities, factors, sessions, tenants and catalog rows were
removed. The broad fingerprint assertion failed solely on throttle state.

**How to apply:** Compare original business/account records and RLS/grants
strictly; permit only explicitly reported authentication-counter progression.
Keep the original baseline intact and record the exception in final evidence.

A failed fixture setup is still active data. Resume its tracked resources or
complete its scoped cleanup before replaying setup.

**Why:** A verifier failed after creating a customer domain and synthetic billing
records. Replaying setup created another tenant and collided with the retained
domain even though the earlier run had been reported as failed.

**How to apply:** Validate fixture inputs before creating resources, persist scope
as resources are created, and reconcile public and approved private-schema
dependencies before starting fresh. Never broaden cleanup to unrelated records.

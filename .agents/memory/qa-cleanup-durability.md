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

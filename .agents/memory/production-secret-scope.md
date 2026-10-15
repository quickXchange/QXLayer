---
name: Production secret scope verification
description: Shared existence results cannot attest independently saved Publishing secrets.
---

Do not treat a positive Production secret-existence result as proof of
Production-only storage: the secure environment interface includes Shared
entries in Development and Production results.

**Why:** Shared entries returned identical positive results across all three
views even after the user independently saved Publishing copies. The interface
cannot attest the separately stored Publishing entries or compare their values.
After Shared removal, all three views returned absence despite user-confirmed
Publishing copies; do not interpret that as proof the Publishing copies vanished.

**How to apply:** Report agent-verified Shared existence separately from
user-confirmed Publishing storage. Verify names with values hidden in Publishing
settings when independent metadata is unavailable. Secret names do not enforce
environment isolation. Removing workspace copies does not remove separately
saved Publishing copies, but can remove credentials needed by workspace-only
preparation commands. Assess dependencies first and never republish to inspect
credentials. The documented variable-deletion callback is for non-secrets;
use the workspace Secrets UI for manual secret removal.

Keep permanent Production credential storage isolated. Unavailability to the
workspace does not authorize restoring Shared copies or changing Live to obtain
access.

**Why:** The user deliberately saved Publishing-only copies and removed Shared
copies before renewing isolated Production provisioning approval.

**How to apply:** When provisioning cannot access Publishing secrets, use an
explicitly approved private execution context or hidden terminal input from the
owner's saved vault. Never echo inputs, embed values in command arguments, log
exceptions containing values, or persist them as credential files. Temporary
process memory is not guaranteed to be securely erased by JavaScript.

Retain allowlisted, non-sensitive failure codes instead of suppressing every
diagnostic. Never infer the exact historical failure when no cause was retained.

**Why:** A stopped private-input run left no usable failure cause, requiring a
read-only replay with owner-supplied inputs despite healthy provider metadata.

**How to apply:** Report verified resource state separately from failure
uncertainty. Save only static check codes, not raw errors or credentials; make
recovery checks read-only and require fresh approval for resource execution.

The user confirmed successful private hidden-input provisioning while retaining
permanent Production-only Publishing copies.

**Why:** The user reported successful execution, independently reconciled through
provider metadata; copying runtime credentials back into Shared was unnecessary.

**How to apply:** Keep this credential-custody boundary for subsequent operations.
Use a separate narrowly scoped preparation token when management access is
needed; do not treat an organization creation token as project-settings authority.

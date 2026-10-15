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

**How to apply:** Report agent-verified Shared existence separately from
user-confirmed Publishing storage. Verify names with values hidden in Publishing
settings when independent metadata is unavailable. Secret names do not enforce
environment isolation. Removing workspace copies does not remove separately
saved Publishing copies, but can remove credentials needed by workspace-only
preparation commands. Assess dependencies first and never republish to inspect
credentials. The documented variable-deletion callback is for non-secrets;
use the workspace Secrets UI for manual secret removal.

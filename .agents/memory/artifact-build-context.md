---
name: Managed artifact build context
description: Standalone build commands do not inherit managed workflow routing and port variables.
---

Managed artifact workflows inject their service context; standalone shell builds do not automatically inherit it.

**Why:** Standalone console builds failed for missing service variables while the managed workflow and signed-in browser journey were healthy.

**How to apply:** For a standalone build, supply the artifact's actual port and base path as temporary command inputs. Missing workflow context is not evidence that the running application is broken.

Repository-relative verification inputs must resolve from the script location,
not an assumed working directory.

**Why:** Filtered package execution changes the working directory to the
selected artifact. Helpers launched that way cannot assume the workspace root.

**How to apply:** Derive the repository root from `import.meta.url` before
opening durable fixture scopes or generated verification receipts.
---
name: Workspace package installer
description: The package callback requires a nonempty package list and cannot accept pnpm workspace CLI flags.
---

For an intentional root dependency refresh, the package callback cannot forward `--workspace-root` and rejects an empty package list.

**Why:** Updating security overrides encountered three validation/root-workspace failures before the installer could run.

**How to apply:** Preserve the existing root dependency specification. If root installation is intentional, temporarily enable pnpm's `ignore-workspace-root-check` in `.npmrc`, use the package callback, then remove the temporary setting immediately. Do not leave the protection disabled or change unrelated dependencies.

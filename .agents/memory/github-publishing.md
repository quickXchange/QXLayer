---
name: GitHub publishing
description: Authentication and integrity constraints when uploading this project to GitHub.
---

An active native GitHub source-control connection and successful public repository reads do not establish that workspace Git pushes are authenticated. A separately authorized GitHub App connection can work even when native Git push credentials are rejected.

**Why:** The native connection reported active and read the empty public repository, but rejected a push. The authorized GitHub App successfully performed the upload through its authenticated API proxy.

**How to apply:** Distinguish native source-control authentication from the GitHub App integration. Use the authorized integration without extracting credentials. Do not report a push as successful until the remote branch points to the expected commit.

When reproducing existing Git history through the GitHub Git Data API, preserve commit messages byte-for-byte, including trailing newlines, and verify tree and commit hashes before updating a branch.

**Why:** Removing the original trailing newline preserved the visible message but changed the commit hash.

**How to apply:** Read the original commit object's message rather than trimming formatted Git output. Check each recreated tree and commit against its local hash; stop if another writer changes the destination branch.

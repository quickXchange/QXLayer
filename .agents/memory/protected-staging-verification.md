---
name: Protected Staging verification
description: Authorized browser access is separate from deployment API access; preserve protection and role boundaries.
---

A working Vercel API connection does not itself establish a browser SSO session
for a protected Preview. Do not treat uploaded asset verification as signed-in
visual verification.

**Why:** Vercel's documented automated testing route requires an automation
credential. Its CLI may generate one automatically if none exists, which is a
security-credential write rather than a read-only access check.

**How to apply:** Reuse existing authorized access when available. Under a
no-permission-change restriction, ask before creating an automation credential.
Never disable protection, add public domain exceptions, alter app roles or
create test memberships to make visual testing pass.

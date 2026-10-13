---
name: QA browser credential custody
description: Browser-test subprocess credentials and inherited provider runtime settings can differ.
---

Do not assume the browser tester's Node process inherits workspace secrets. Keep approved test credentials in a narrowly scoped loopback broker's memory, never in output, browser storage or files.

**Why:** Native Staging verification stopped because the tester had no workspace access-password variable. An inherited provider runtime value also differed from the original password input, even though the approved Staging password verifier was correct.

**How to apply:** Before starting a critical native journey, check credential availability and, when possible, verify the supplied private-gate input against the existing verifier using boolean-only results. Capture the approved input before loading inherited runtime settings. Continue through the actual gate form and native identity sign-ins; missing test credentials never justify injected auth cookies or ownership-verification bypass.

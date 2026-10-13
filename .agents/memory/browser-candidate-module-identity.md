---
name: Browser candidate module identity
description: Keep React module identity consistent when validating candidate JavaScript without deployment.
---

Browser-only candidate asset overrides must use one canonical entry-module
URL throughout the entry and every lazy chunk. Serving new entry bytes under
an old URL while chunks import the new filename can instantiate React twice.

**Why:** An otherwise functioning Staging navigation candidate produced React
invalid-hook and DOM-insertion errors because the entry and lazy chunks used
different main-module URLs. Canonicalizing the candidate module references
removed those transport errors without changing application logic.

**How to apply:** Override candidate JavaScript only, consistently alias its
entry references, and retain genuine HTML, authentication, cookies, CSRF and
API requests. Clearly separate browser-only candidate results from hosted
release verification; this testing method is not a deployment.

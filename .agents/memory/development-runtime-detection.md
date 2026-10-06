---
name: Development runtime detection
description: The workspace infrastructure environment marker is not the application's Development/Production mode.
---

Do not use `REPLIT_ENVIRONMENT` alone to decide whether this application's
Development-only features may run. It is `production` inside this Development
workspace too. Require the API's explicit Development `NODE_ENV` and reject
deployment runtimes; missing mode must fail closed for private preview issuance.

**Why:** The first Development preview security test was incorrectly rejected
despite explicitly selecting Development, because the infrastructure marker
reported Production. The managed API Development command explicitly sets its
application mode independently.

**How to apply:** Keep Production denial explicit, cover it in security tests,
and use the actual service run mode rather than inferring it from the container
marker. Offline workspace scripts must explicitly select Development when
exercising a Development-only preview.

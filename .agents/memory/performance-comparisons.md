---
name: Performance comparison boundaries
description: Build/auth configuration parity and honest interpretation of local QXLayer performance measurements.
---
Rebuild both untouched baseline and optimized frontend with identical public authentication/build settings before comparing runtime transfers. Separate bootstrap bundle size from complete-route transfer, including the externally loaded Clerk SDK.

**Why:** An older external-hosting fixture build did not load the same real Clerk SDK as a new native-configured build. Comparing them made authentication configuration look like a large optimization regression.

**How to apply:** Normalize build flags, public key/proxy configuration, transport, cache, viewport and CPU settings without saving credentials. Use the original running backend's samples for the backend baseline. Do not label lab click Event Timing as field INP or claim cloud gains from loopback measurements.

Google Fonts can supply WOFF2 URLs whose last path component is `font` with a query string, rather than an ordinary `.woff2` filename. Local downloaded fonts need build-resolvable filenames, with CSS references updated consistently.

**Why:** Saving the URL's query as part of a local filename left Vite treating it as a resource query and retaining unresolved font URLs, even though downloads succeeded.

**How to apply:** Validate binary format and production-build URL resolution, not just HTTP download success; preserve original font bytes, axes, weights, ranges and licenses.

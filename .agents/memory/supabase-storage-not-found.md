---
name: Supabase Storage missing-object semantics
description: Authenticated object-info requests can report a semantic 404 inside an HTTP 400 response.
---

For authenticated Supabase Storage object-info requests, distinguish the transport
status from the structured provider status: an absent object can return HTTP 400
with JSON `statusCode: "404"` and `error: "not_found"`.

**Why:** A bounded upload of new sanitized marketing assets encountered this
provider response even though the configured private bucket and credentials
were valid. Assuming all missing objects use HTTP 404 blocked the upload.

**How to apply:** Recognize only the verified missing-object envelope, not every
HTTP 400. Keep authentication, authorization and other provider failures explicit,
retain immutable/no-upsert writes, and verify saved bytes by reading them back.

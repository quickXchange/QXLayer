---
name: Browser PDF download evidence
description: Empty browser/CDP response captures can be false failures for valid native PDF downloads.
---

An empty intercepted browser response body is not proof of an empty PDF download.
Verify the actual native Download object, not a temporary file written from the
intercepted response body.

**Why:** Browser checks twice reported zero-byte PDFs while protected endpoint
readbacks and actual saved browser downloads contained valid branded PDFs,
including the tenant logo. The apparent failure was a binary capture artifact.

**How to apply:** Register the download listener before clicking, save the
Download object with saveAs, independently read the physical file, check
download.failure(), the PDF signature and parsed metadata. A file created from
response.body() only repeats the interception evidence. Do not change working
invoice or proxy code based solely on that capture.

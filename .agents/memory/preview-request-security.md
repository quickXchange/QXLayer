---
name: Preview request security
description: Development proxy and sandbox behavior differs from direct Production browser requests.
---

Do not assume browser form submissions in Replit's Development preview have an ordinary Origin or the server's public Host. The sandboxed browser can send `Origin: null`, and ingress can use an internal Host while forwarding the public domain.

**Why:** The access-gate browser verification rejected legitimate forms twice before reaching code validation: first due to internal/public hostname differences, then due to an opaque sandbox origin.

**How to apply:** Keep signed CSRF cookie/token validation mandatory. Treat a non-null public Origin separately from a sandboxed opaque Origin; do not replace CSRF proof with a forwarded-header check. Distinguish raw server Set-Cookie attributes from browser metadata, because Development ingress can rewrite SameSite for preview embedding. Never assume a Development rewrite describes Production behavior.

An accepted passwordless email request does not prove that the browser retained its
HttpOnly challenge. Distinguish a failed cookie roundtrip from a native OTP rejection.

**Why:** An original Development request left its issued challenge unattempted while
the UI reported an invalid code. Independent native OTP/TOTP verification passed.
Cookie availability is a separate browser capability, not evidence of a clock or
authenticator fault.

**How to apply:** Verify a fresh anonymous challenge roundtrip before declaring email
sign-in ready. Test both normal and cookie-denied contexts. Offer the pinned direct
Development tab when embedding blocks cookies; never accept a missing binding,
expose the HttpOnly cookie to JavaScript, or weaken MFA to accommodate it.

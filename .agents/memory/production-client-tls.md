---
name: Production client TLS
description: Client TLS verification versus backend pg_stat_ssl on provider-proxied PostgreSQL.
---

Do not use the server's `pg_stat_ssl` flag as the sole proof of the client's
transport security on the QXLayer Production connection. Verify the same
libpq session's client TLS, keeping CA/hostname verification and required
channel binding enforced; never downgrade TLS to get the preflight to pass.

**Why:** The actual primary reported backend SSL false while its client reported
TLS 1.3 with verify-full and required channel binding. Frontend and backend
transport observations can describe different connection hops.

**How to apply:** Require affirmative client transport evidence, fail closed if
unavailable, and keep the backend flag as diagnostics rather than replacing
client verification. Client diagnostics can contain host/user information;
never log their raw text, connection URIs or credentials.

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

For Supabase targets, a valid connection can require the provider's published
root CA rather than the standard system trust bundle. Obtain it from the official
provider reference over verified HTTPS, check its approved fingerprint, and trust
it only for that target connection; never disable hostname verification or change
system-wide trust to make the connection work.

**Why:** The intended Supabase connection failed verify-full with the system CAs
but passed with the officially published Supabase CA. This was a trust-chain
configuration issue, not justification to weaken TLS or replace credentials.

**How to apply:** Keep source and target CA decisions separate. Unexpected
certificate rotation requires review, not automatic acceptance of an endpoint's
untrusted presented certificate.

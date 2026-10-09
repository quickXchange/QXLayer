---
name: Project roles and provider reuse
description: Current QuickXchange-to-QXLayer provider reuse permissions and authoritative source requirements.
---

The writable implementation destination is QXLayer. Reuse the existing QuickXchange
1Forge, WhiteBIT, blockchain RPC/monitoring, provider selection, connection tests,
health and Manual fallback code, models and settings screens rather than rebuilding
working functionality.

The latest working QuickXchange **Replit** code is the source of truth. The user
confirmed its GitHub copy is outdated and requested help synchronizing that
repository before reuse if direct workspace access is unavailable.

Keep projects independent and protect both projects' data and credentials.
Adapt copies to QXLayer's tenant boundaries and Super Admin / Client Admin design;
do not introduce a runtime dependency on QuickXchange or copy its credentials or
business records. Heleket is excluded and will be integrated separately later.

**Why:** The user explicitly requested reuse to minimize development costs and
confirmed that the older GitHub snapshot must not substitute for current working
Replit source.

**How to apply:** First obtain or verify a synchronized source-only snapshot.
Read QuickXchange without modifying its application or Production. Synchronizing
its source repository is authorized, not changing its provider behavior. Implement
and test tenant-scoped adaptations in QXLayer; disclose missing credentials and
unverified external functionality rather than claiming connectivity.

The earlier migration brief described the opposite eventual migration direction;
it does not authorize integrating QXLayer into QuickXchange under this request.

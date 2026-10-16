---
name: Project roles and provider reuse
description: Current QuickXchange-to-QXLayer provider reuse permissions and authoritative source requirements.
---

The writable implementation destination is QXLayer. Reuse the existing QuickXchange
1Forge, WhiteBIT, blockchain RPC/monitoring, provider selection, connection tests,
health and Manual fallback code, models and settings screens rather than rebuilding
working functionality.

The user supplied a QuickXchange source-only Migration Package and explicitly
authorized extracting it and adapting its reusable systems into VYNOX LAYER.
Use that integrity-verified upload for this integration. The earlier instruction
to obtain the latest Replit source still rules out substituting the known outdated
QuickXchange GitHub snapshot.

Keep projects independent and protect both projects' data and credentials.
Adapt copies to QXLayer's tenant boundaries and Super Admin / Client Admin design;
do not introduce a runtime dependency on QuickXchange or copy its credentials or
business records. Heleket is excluded and will be integrated separately later.

**Why:** The user explicitly requested reuse to minimize development costs and
confirmed that the older GitHub snapshot must not substitute for current working
Replit source, then supplied the migration ZIP as the implementation input.

**How to apply:** First obtain or verify a synchronized source-only snapshot.
Read QuickXchange without modifying its application or Production. Synchronizing
its source repository is authorized, not changing its provider behavior. Implement
and test tenant-scoped adaptations in QXLayer; disclose missing credentials and
unverified external functionality rather than claiming connectivity.

The user requests implementation in tested batches, continuing automatically,
with independent tenant configurations/encrypted credentials and preserved VYNOX
design. Verify the protected external candidate before preparing the final Live
release; this is not permission for Public Live/DNS cutover or real financial
execution.

**Why:** The user explicitly specified these integration and release boundaries.

**How to apply:** Reuse existing systems, disclose functional versus
credential-dependent/development-dependent capabilities, and keep Live activation
separate from protected candidate deployment.

The earlier migration brief described the opposite eventual migration direction;
it does not authorize integrating QXLayer into QuickXchange under this request.

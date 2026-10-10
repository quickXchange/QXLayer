---
name: Authenticated streaming recovery
description: Plaintext-free QXLayer backup staging and whole-envelope verification before any plaintext consumer.
---

Never stream AES-GCM update output directly to a recovery consumer. Verify the
entire original tag first, using a temporary ciphertext cache with an ephemeral
memory-only key and independently authenticated, index-bound chunks. No plaintext
dump, SQL, cache or stderr spool belongs on ordinary Replit storage.

**Why:** GCM update releases unauthenticated plaintext before final(), so a
streaming pipeline alone can expose tampered data before discovering a bad tag.
The user authorized encrypted workflow/recovery preparation, but prohibited
Production freeze, real export, Supabase restore and deployment.

**How to apply:** Keep source capture directly streamed into authenticated
encryption. Preserve Python integer-safe metadata; require complete framed
receipt/sequence checks and independent checksum readback. Any plaintext consumer
requires complete envelope AND package verification first; never persist
plaintext on ordinary Replit storage. A local synthetic roundtrip or configured-key canary does not
prove external key retention or independent durable recovery of a real backup;
get operator confirmation and verify the later receiving copy separately.

Give asynchronous plaintext consumers ownership of their chunk buffers. Never
zero a yielded buffer when the generator advances: a stream can prefetch its next
chunk while a pending asynchronous write still references the previous one.
Use independent bounded consumer copies, wipe internal buffers, and keep all
consumer plaintext memory-only after full authentication.

**Why:** A real multi-chunk package failed verification although small fixtures
and synchronous hashing passed. A delayed synthetic writable reproduced the
early-zeroization corruption; a larger complete package covered the missing case.

**How to apply:** Test large payloads through backpressured/asynchronous consumers,
not just direct loops that synchronously hash/copy chunks. Retain whole-envelope
and whole-package verification; do not weaken validation to fix streaming errors.

Use the existing Replit environment for QXLayer-only encrypted export preparation.
The user superseded the Mac/iCloud approach and rejected AWS account creation.
Do not use their Mac or personal files. Prefer an existing service for an
independent encrypted backup copy outside Replit.

**Why:** The user explicitly requested the shortest path using existing services
and said: "Stop proposing new infrastructure unless absolutely necessary."
Replit's official shutdown/unpublish documentation says custom-domain connections
are removed, so shutdown is not a harmless reversible maintenance pause.

**How to apply:** Use private temporary ciphertext-only staging outside the
workspace, never Git, public download routes, Library or deployment artifacts.
Retain the original key independently outside Replit and separate from ciphertext.
Use the operator's existing intended Supabase project's private Storage as the
receiving destination, not a new account/service. Verify access controls and fresh
receiving bytes against the original receipt. A successful synthetic receiving
check verifies the route, not a real backup or outside-Replit key recoverability;
do not call a Replit-only copy an independent backup.
A temporary all-table lock barrier only blocks table writes/DDL: separately hold
standalone sequence callers and external side effects, disclose write timeouts,
and never claim a fully operational freeze from flags alone. Safeguard checks
must precede explicit approval for any Production locking or real export.
Supabase restore and hosting/cutover remain separately approval-gated.

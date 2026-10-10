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
receipt/sequence checks and independent checksum readback. Plaintext recovery
belongs only on a trusted offline device, after complete envelope AND package
verification. A local synthetic roundtrip or configured-key canary does not
prove external key retention or independent durable recovery of a real backup;
get operator confirmation and verify the later receiving copy separately.

The user chose their Mac and a private iCloud Drive folder for the independent
encrypted QXLayer backup destination. Prefer directly capturing on the Mac after
approval rather than inventing a Replit/public download path for live backups.

**Why:** The user explicitly requested the simplest secure Mac/iCloud workflow.
Replit's official shutdown/unpublish documentation says custom-domain connections
are removed, so shutdown is not a harmless reversible maintenance pause.

**How to apply:** Use the original key through local Keychain/private password
manager retention, never secret CLI arguments or cloud-folder key files.
Remote iCloud readback must be a fresh download from the authenticated website,
checked against the original independent receipt, not the local sync cache.
A temporary all-table lock barrier only blocks table writes/DDL: separately hold
standalone sequence callers and external side effects, disclose write timeouts,
and never claim a fully operational freeze from flags alone. Production locking,
Mac setup and cloud receiving-copy verification remain unperformed until the
appropriate operator steps/explicit approval.

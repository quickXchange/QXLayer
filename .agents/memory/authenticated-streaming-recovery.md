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

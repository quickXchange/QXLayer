---
name: Development Auth email configuration
description: Native shared mailbox cooldowns and management API override-flag mirrors.
---

Native Supabase magic-link OTP and password recovery share a mailbox send-frequency limit. A recovery request immediately after a login OTP can legitimately fail despite spare project-wide email quota. Keep this protection and mirror the shared cooldown in the application.

**Why:** A native disposable test initially treated its third message as a quota failure; a bounded diagnostic instead confirmed the provider's security-purpose remaining-second error. A different disposable recipient could send beyond the former project quota.

**How to apply:** Distinguish per-mailbox frequency from global email quota. Wait the retained interval when testing transitions between OTP and recovery. Do not clear counters, lower SMTP frequency or claim every 429 is a global quota failure.

Supabase Auth configuration's `mailer_subjects_custom_contents` and `mailer_templates_custom_contents` maps contain boolean override flags, not the subject/template strings. Editing a canonical subject/template automatically updates its corresponding flag.

**Why:** Strict readback comparisons first reported these legitimate derived changes as unrelated modifications, then incorrectly expected string values.

**How to apply:** Read back canonical strings and verify only the exact corresponding override flags become true; preserve every other flag and configuration field. Never dump the full Auth configuration, which includes credentials.

Verifying an admin-generated native OTP does not verify the code in an earlier
delivered email. Generating another link can replace a pending native token.

**Why:** Native-provider integration tests can pass using a seeded token while
actual inbox receipt and redemption of the originally sent code remain untested.

**How to apply:** Label seeded-token verification, SMTP request acceptance, and
delivered-code/inbox verification separately. Do not fetch a replacement native
token during a test that claims to verify the original email's code. Keep all
test tokens and codes in memory and out of logs.

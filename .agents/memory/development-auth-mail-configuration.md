---
name: Supabase Auth email configuration
description: SMTP prerequisites, native shared mailbox cooldowns and management override-flag mirrors.
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

On a fresh Supabase project, prepare core security policy separately from custom
email templates until custom SMTP is configured.

**Why:** Native core policy writes succeeded, while template writes returned an
SMTP-related HTTP 400 before custom SMTP existed. A combined request prevented
otherwise valid security settings from being applied.

**How to apply:** Read the native SMTP readiness indicators, defer only template
changes when SMTP is absent, and preserve all other security checks. Configure an
independent environment-specific send-only credential before applying templates.
Template readiness, SMTP authentication and actual inbox delivery are separate
proofs; do not relax security or reuse another environment's key to pass setup.

Resend management denial with `restricted_api_key` confirms a sending-only key,
not its exact domain restriction.

**Why:** A restricted key cannot list management-domain metadata. Successful SMTP
sender acceptance proves the selected domain is permitted, but does not prove all
other domains are forbidden.

**How to apply:** Keep send-only permission, approved sender acceptance and
single-domain restriction evidence separate. Do not label a denied management
lookup or an accepted envelope as independent proof of single-domain scope.

Do not require historical recovery-email timestamps to remain present in native
admin account readback after a completed password reset.

**Why:** A delivered recovery link and reset succeeded, and the old disposable
password was rejected, while the account readback omitted `recovery_sent_at`.

**How to apply:** Separate recipient confirmation from credential-behavior
evidence. For disposable accounts only, an old-password rejection can confirm
the reset without asking for the recipient's new password. Do not treat an
omitted historical timestamp as a failed recovery.

---
name: Supabase MFA session assurance
description: Cross-session invalidation of pending-MFA sessions and deployed recovery-code capability checks.
---

Supabase TOTP verification can invalidate the same account's other AAL1 sessions. A pending-MFA browser can therefore lose its valid session when another browser completes MFA, even with single-session mode disabled.

**Why:** The Development lost-authenticator test initially completed MFA in its second context after starting a pending-MFA session in the first. The first then correctly reported no session; this was provider assurance enforcement, not a recovery-code failure.

**How to apply:** Establish the existing AAL2 context first, then freshly sign in to the pending-MFA context before exercising recovery. Check session presence before interpreting password/code errors. Do not weaken provider enforcement or reuse an invalidated session.

Upstream recovery-code endpoint source does not establish usable recovery-code enrollment on the deployed project. A status response may mean no enrolled set; only an authorized disposable enrollment probe establishes capability.

**Why:** The Development provider's enrollment probe returned `mfa_recovery_codes_enroll_not_enabled`, and the scoped Auth configuration exposed no corresponding supported setting.

**How to apply:** Re-evaluate deployed capability before replacing the Development-only recovery mechanism with a native one. Never enable undocumented flags or alter protected Staging to test it.

A password-recovery link does not supply sufficient assurance to change the password of an account with verified TOTP. Complete its existing authenticator challenge within the recovery context, while retaining recovery-only authorization.

**Why:** The pinned Development provider returns `insufficient_aal` when updating an MFA-enabled account's password using the AAL1 recovery session.

**How to apply:** Keep recovery sessions denied business/Admin access even after MFA elevation. Require the current factor before password reset, preserve the recovery expiry, and verify that password reset does not remove TOTP. Test with a disposable MFA-enabled identity, not just an account without 2FA.

The user authorized a Development-only email sign-in alternative on the login page for Super Admins
at their verified Gmail address: six-digit codes replacing the password, five-minute expiry, single use,
rate and attempt limits. Google Authenticator must remain an additional mandatory step after this email first factor. New Development
passwords require at least ten characters with uppercase, lowercase and numbers;
special characters are not required.

**Why:** The user requested these authentication rules while prohibiting Staging,
Production, deployment and Republish changes.

**How to apply:** Native email OTP establishes AAL1, not native Supabase AAL2. Never reuse
an email first factor as email-MFA assurance or forge AAL2. Require a fresh native
authenticator verification before email-primary business access. Password recovery/changes and authenticator mutations retain
native TOTP requirements. Test privileged email-code logic with synthetic authorization and
disposable identities; do not grant a substitute Owner or claim mailbox receipt
from mocked delivery.

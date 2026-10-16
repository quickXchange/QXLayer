---
name: Production recovery token custody
description: Protected acceptance reset links, explicit redemption, session resume, and real mail evidence.
---

Redeem one-time password recovery links only on explicit user action, never on
component mount, GET navigation, mail preview, or protection redirects. Preserve
the full local return URL through Vercel and application gates. Remove the token
from browser history only after a recovery-only cookie has been established.
Resume that cookie on reload when no new token is present; a fresh URL token must
take precedence over a stale recovery cookie, including one for another account.

**Why:** The Owner reported an expired setup link after native email verification
and a recovery session already existed. Automatic redemption plus URL scrubbing
made subsequent navigation look like expiry instead of resuming recovery.
The user subsequently confirmed “Setup complete; Admin Panel works after reload”
with the explicit-continuation flow. Preserve this accepted recovery behavior;
that confirmation is not authorization for public Live cutover or DNS changes.

**How to apply:** Keep the explicit Continue step, genuine server-established
cookies, single-use provider validation, and recovery-only business restrictions.
Test scanner-like GETs, protection redirects, reload, superseded links and replay
with a disposable non-admin fixture, never by consuming the real Owner's token.

The Production mail configuration now has an acceptance-specific recovery overlay.
Earlier preparation-only settings/templates are historical baselines, not an
instruction to revert the recovery flow or redirect to public Live.

**Why:** Real protected acceptance uses a fixed review origin, while the initial
provider preparation retained future Live redirects. Reapplying that baseline
would send the user to the wrong authentication runtime.

**How to apply:** Preserve canonical future redirects but keep active setup links
on the pinned acceptance origin until separately approved cutover. Distinguish
provider token validity from the shorter post-redemption recovery-session window.

The user reporting receipt of the native setup email is delivery evidence even
when that link later expires. It does not itself prove a chosen password, MFA,
Admin access, or completed acceptance.

**Why:** A separate send-only SMTP credential cannot retrieve provider delivery
events; widening or repairing the shared Resend connection is unnecessary and can
affect the independent QuickXchange project.

**How to apply:** Use the native provider, user receipt and narrowly scoped Auth
readback. Never infer inbox receipt from SMTP acceptance alone, request broad
mailbox access, or alter the shared Resend connection for this verification.

Temporary Vercel automation bypass revocation must explicitly disable regeneration.

**Why:** Native revocation rejected requests without its required regeneration
choice. Generating a replacement during cleanup would leave new access active.

**How to apply:** Use `revoke: { secret, regenerate: false }`, then verify the
temporary entry is absent and SSO settings are unchanged. Keep secret values in
process memory; durable cleanup inventories hold only the unique note and fixture
scope, not credentials.

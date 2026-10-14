# Development authentication operations

This applies only to the isolated Development Supabase project. Do not deploy
these changes, change protected Staging/Production, or reuse their credentials.
The business database, original Owner ID, roles and tenant assignments remain
separate from the authentication provider.

## Lost-authenticator recovery

While the authenticator still works, open **Account Security → Authenticator
recovery codes**. Confirm the current password, enter a fresh authenticator code,
and acknowledge replacement of any earlier codes. Save the ten codes privately
in a password manager, then hide the list. They are shown once and stored only as
subject-bound hashes. Regeneration invalidates the previous set; replacing the
authenticator makes old codes unusable.

After losing the authenticator, first sign in with the account's password. On
the two-factor screen choose **Lost your authenticator? Use a saved recovery
code**. Confirm the password and one unused code, then explicitly acknowledge
the reset. Successful recovery:

- consumes the code atomically and records a credential-free audit event;
- revokes all Development app sessions and provider refresh sessions;
- resets only that account's verified TOTP factor(s);
- retires the remaining recovery codes;
- leaves identity links, business IDs, roles and business data unchanged.

Sign in again, enroll and verify a new authenticator, and generate/save a new
code set. Super Admin access still requires verified 2FA. Recovery does not create
an Owner, grant roles, or use email matching.

If no codes were saved, there is no automatic reset. Obtain a separate approved
ownership review; do not create another Owner or change an identity link.
For an ambiguous provider result, the attempted code remains consumed and local
sessions remain revoked. Sign in again and check Account Security before another
attempt. Audit outcomes distinguish completed, consumed and failed operations.

Recovery generation and reset are unavailable outside Development. The native
provider recovery-code enrollment capability is not enabled on this project;
do not infer availability from upstream source or enable undocumented settings.

The guarded local schema command is:

```sh
NODE_ENV=development pnpm --filter @workspace/private-label-console exec tsx \
  ../api-server/src/verification/supabase-development.ts recovery-prepare
```

It checks the original business-table preservation baseline before applying
only Development auth-schema tables. Never overwrite the preservation baseline.

## Development email delivery

Signup, verification resend and password-recovery requests remain fail-closed
until independent Development SMTP delivery is configured and tested. Do not
enable `QXLAYER_DEVELOPMENT_SUPABASE_AUTH_MAIL_READY` from configuration readback
alone.

Use an independent Development send-only SMTP credential. Never reuse or rotate
QuickXchange's connected Resend key, Staging's SMTP/setup keys, or a support-mailbox
password. Keep existing receiving/MX/DNS unchanged.

When configuring this Development project's Auth settings:

- retain email confirmation and the existing password/TOTP requirements;
- retain the exact Development HTTPS site URL and redirect allowlist;
- use clearly Development-labelled sender and message subjects;
- generate verification links with
  `{{ .SiteURL }}/verify-email?token_hash={{ .TokenHash }}&type=signup`;
- generate recovery links with
  `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`;
- never log SMTP credentials, generated links, token hashes or session envelopes;
- validate real provider-generated verification and password-reset delivery with
  tracked disposable identities before marking mail ready.

SMTP secret readback is opaque. Plaintext equality or a direct SMTP-only test is
not evidence that the integrated Supabase email flows work.

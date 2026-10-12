# Supabase Auth — isolated Staging trial

This is a parallel Staging trial, not a Production migration. Clerk remains the
default provider and its existing Preview, identities, keys and business IDs
are retained. Production, DNS, QuickXchange and the suspended worker are outside
this authorization.

## Runtime boundaries

- Enable only with explicit `QXLAYER_EXTERNAL_ENVIRONMENT=staging` and the
  Supabase trial flag. Database/storage selection does not enable Auth.
- Pin the approved project and exact protected Preview HTTPS origin. Confirmation
  and recovery templates target that actual Preview, not localhost or wildcards.
- Keep the server key and independent session-encryption key server-only.
  Modern opaque Supabase keys use `apikey`, not a Bearer JWT header.
- Store provider tokens in authenticated AES-GCM envelopes in a private schema.
  The browser receives an opaque Secure/HttpOnly host-only cookie; only its
  digest is stored in the database.
- Require same-origin authenticated mutations. Session state is never cached
  publicly. Recovery-only sessions cannot enter business routes.
- Read business permissions from the existing authoritative tables on each
  request. Signup never grants administrator access. Verified TOTP/AAL2 is
  required before Super Admin access.
- Existing accounts may link only through fresh proof of both identities and
  the approved Staging Clerk binding. No email-only links, existing-link
  overwrites or automatic business-record reassignment.

## Verification and cleanup

The explicit Staging release and QA scripts are never imported by application
startup. They guard the pinned targets, verified client TLS, main-branch
preservation and worker suspension.

QA persists exact disposable subjects and temporary role assignments before
creating them. Existing business records and permissions are compared using
deterministic per-table fingerprints before and after cleanup. Only planned
fixture users, their role rows, sessions and the exact temporary Vercel
automation credential are removed.

Use actual Supabase-generated confirmation and recovery emails and their
native links. Resend test-recipient delivery verifies this sending flow, not
delivery into a real customer mailbox. Never substitute admin-generated links
or an email-verification bypass as evidence.

Any temporary sending-quota adjustment is restored and read back. Existing
service/SMTP keys and legitimate application encryption configuration are not
temporary user-test credentials and are not revoked during fixture cleanup.

No Production activation follows from successful Staging verification.

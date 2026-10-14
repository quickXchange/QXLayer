# Development authentication security closure — 2026-10-14

## Decision and scope

**Development review completed; Republish remains blocked.** No Staging or
Production request, account/configuration operation, migration or deployment was
performed in this resumption. The resolved Development login was not reset,
re-enrolled or investigated again.

## Security remediation and fresh scans

- The offline configuration SQL generator now verifies its frozen UTF-8 payload
  with PostgreSQL's built-in SHA-256 instead of MD5. The existing approval flag,
  source review, protected-row diagnostics and conflict/rollback checks remain.
  Previously prepared SQL was neither regenerated nor executed. Read-only
  Development SQL confirmed Node/PostgreSQL SHA-256 parity for Unicode input.
- The guarded disposable database rehearsal now generates a unique 256-bit
  base64url password instead of using a shared literal. Its test-only, explicit
  approval and empty-database guards remain. The rehearsal was **not executed**.
- Dependency audit: **0 findings**, with no dependency or lockfile changes.
- Final managed privacy scan: **0 flagged findings**.
- Final managed static scan: **complete, 9 medium, 0 high/critical**. Two findings
  were removed through the hardening above. Remaining findings are retained, not
  suppressed or described as patched.

### Disposition of every remaining static finding

| Source | Count | Review and boundary |
|---|---:|---|
| `artifacts/api-server/src/routes/tenants.ts` | 1 | Preview redirect starts with a fixed same-origin path and encodes the authorized tenant slug. It is not an arbitrary destination. |
| `artifacts/api-server/src/verification/development-email-login-native.ts` | 1 | SHA-1 is HMAC-SHA1 for native interoperable TOTP, using a disposable in-memory factor. It is not a password digest or signature. Changing the algorithm would invalidate protocol verification. |
| `artifacts/api-server/src/verification/supabase-development-qa.ts` | 1 | Same native TOTP interoperability boundary; fixture-only generator, not a custom production authenticator. |
| `scripts/external-hosting/supabase-auth-staging-qa.mjs` | 1 | Existing native TOTP QA protocol, not a password hash. Reviewed without running or changing Staging. |
| `scripts/external-hosting/deploy-integrated-preview.mjs` | 1 | SHA-1 is the provider-required deployment file identifier, not an authentication/integrity trust boundary. Script was not run. |
| `scripts/external-hosting/deploy-preview-bootstrap.mjs` | 1 | Same provider-required file identifier. No provider upload or deployment occurred. |
| `lib/production-access-gate/index.mjs` | 1 | Only a valid purpose/expiry-bound HMAC-SHA256 form cookie is reused in the existing Staging branch; otherwise a server nonce is generated. Arbitrary caller-selected cookies cannot become authenticated access. No gate configuration changed. |
| `scripts/external-hosting/verify-preview-bridge.mjs` — cookie | 1 | Existing loopback test proxy forwards cookies from the pinned HTTPS upstream, not an arbitrary request value. It is not deployed application session creation. Script was not run. |
| `scripts/external-hosting/verify-preview-bridge.mjs` — redirect | 1 | Upstream origin equality is checked before the response receives only the destination path/query/fragment. Off-origin redirects are refused. Script was not run. |

These are bounded code-review dispositions, not unconditional security approval.
Keep raw findings visible and require release review if any boundary changes.
Earlier Telegram Web Storage and dependency fixes remain complete and unchanged.

## Completed legacy audit: all 42 accounts accounted for

The existing full, read-only paginated audit is reused, not restarted. Its
before/after directory fingerprints matched, provider count matched pagination,
and it made zero account or role writes. Evidence:
`generated-artifacts/auth-security/legacy-audit.json`.

| Exclusive disposition | Accounts | Required continuity decision |
|---|---:|---|
| Exact proof-linked original Super Admin | 1 | Preserve its existing business ID, native subject link, role and verified native TOTP. |
| Unlinked with business references, including one client-admin membership | 5 | Retain all references and roles; require exact native identity proof before linking. Prioritize the client admin and customer request owners. |
| Unlinked without discovered business references | 36 | Retain every account. Lack of references is not permission to delete, discard or match by email. |
| **Total** | **42** | **Audit complete, migration incomplete: 41 remain unlinked.** |

The five referenced unlinked aliases are `legacy-006`, `legacy-011`,
`legacy-024`, `legacy-026`, and `legacy-030`. The role-bearing account is
`legacy-011`; its `client_admin` assignment and customer request must remain.
Every account's pseudonymous evidence and explicit disposition are retained in
`generated-artifacts/auth-security/legacy-audit-closure.json`.

Directory method inventory: 42 verified email addresses, 40 password-enabled
accounts, one with an external provider, and one with neither a password nor a
reported external provider. The latter must have its supported email OTP/link,
passkey or assisted recovery route established before cutover; this audit does
not infer that it is unusable. None were marked banned or locked. The legacy
directory reported no TOTP enrollments; this must not be confused with the
linked Owner's independently verified **Supabase** TOTP enrollment.

These are Development identities, not an inventory of Production users.

## Owner, MFA and session preservation

The user confirmed that the Development Super Admin login issue is resolved and
that genuine sign-in succeeded. This closes the reported login issue; it is not
Production acceptance or evidence of a different, unobserved inbox flow.

Read-only preservation checks confirm:

- Original active Owner and proof-based business/native identity link unchanged.
- Original native verified email and TOTP factor unchanged.
- All original business and retired-authentication table fingerprints unchanged,
  including roles, memberships and existing configuration.
- Both historical session digest/subject rows remain exactly intact.
- One additional session for the same existing Owner is present; all three Owner
  session rows are unexpired at readback.

The original baseline remains untouched. The optional
`--allow-one-new-owner-session` verification mode permits only one Owner
addition, and only if removing that row reproduces the exact historical session
fingerprint. Wrong-subject additions, duplicate rows, missing/substituted
historical rows and other count changes fail. Strict verification remains the
default. No session cookie/token was injected, read into a browser, replayed,
revoked or refreshed on the Owner's behalf.

Existing native disposable-browser evidence already covers pending-MFA denial,
correct/wrong TOTP, customer/Admin separation, reload/new-tab persistence, logout
and stale-cache isolation. It was not repeated. Private Owner reload/new-tab
behavior was not independently browser-observed in this resumption; database
persistence and automated coverage are separate evidence, not impersonation.

## Test evidence and release blockers

- Workspace TypeScript: pass.
- All discovered unit/regression tests: **412 passed, 0 failed, 0 skipped**,
  including the five new hardening/preservation regressions.
- SHA-256 PostgreSQL/Node UTF-8 parity: pass, read-only Development query.
- Historical preservation with one exact Owner-session addition: pass.
- The release-hold regression passes; the release preflight is still expected
  to fail with `REPUBLISH BLOCKED`.
- Previously completed frontend/API production-mode builds remain valid for the
  unchanged application entrypoints. Offline helper checks do not constitute
  Production authentication, a restore rehearsal or migration acceptance.

Remaining Republish blockers:

1. No separately approved, inventoried Production Supabase provider/schema and
   native account-continuity implementation.
2. The 41 unlinked Development accounts demonstrate that dependency retirement
   is not account migration. Production requires its own full account inventory
   and a continuity decision for **every** account, not a copied Development list.
3. Existing Clerk sessions cannot be converted to Supabase tokens. An approved
   dual-session/proof transition must preserve valid legacy access until an
   explicit retirement policy is approved.
4. Production restore rehearsal, independent credentials/mail/MFA, actual native
   Owner/customer/tenant acceptance, security sign-off and deployment approval
   remain outstanding. Development evidence does not satisfy those gates.

The complete plan is
[`deploy/PRODUCTION_SUPABASE_AUTH_MIGRATION_PLAN.md`](../deploy/PRODUCTION_SUPABASE_AUTH_MIGRATION_PLAN.md).
It is a prepared plan only. Nothing in this review authorizes executing it.

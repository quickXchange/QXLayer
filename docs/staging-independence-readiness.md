# QXLayer: Staging verification and independent operation

## Safety boundary

Only the existing Vercel Preview, Render Starter API and isolated Supabase Staging
are authorized. Keep the Worker suspended. No Production writes, migrations,
DNS changes, new paid services or replacement of existing authentication.
Customer workflow verification uses a disposable Development test identity and
an explicit Staging-only binding, never an existing customer's account or data.

## GitHub deployment preparation

Prepared automation:
- Checks run on `main`, `qxlayer-staging`, pull requests and approved releases.
- Staging release requires `qxlayer-staging` as the source branch.
- Protected owner review, no admin bypass, a branch-only deployment rule and
  `QXLAYER_STAGING_RELEASES_ENABLED` gate Staging releases. Production is disabled.
- Exact-commit Render releases skip the Worker by default and reject suspended
  services. No script resumes a service or changes its paid plan.
- Vercel Preview packaging establishes the project context explicitly.
- The resulting READY deployment must belong to the pinned Staging project.
  Its immutable URL is then synchronized to both Render origin settings before
  a second exact-commit API deployment applies the change.
- Read-only schema/security checks and verified TLS remain mandatory; importing
  data is not part of a release. Migrations remain separately opt-in.

Verified configuration:
- The default branch registers the reviewed Staging-only release workflow.
- The protected Staging environment has pinned provider/project identifiers,
  Development Clerk public settings, verified CA and encrypted deployment secrets.
- An expiring Vercel credential was created with the documented Staging-project
  scope and installed directly into protected GitHub secrets. Renew before expiry.
- GitHub checks-only dispatch passed. A Staging release reached the required-owner
  review gate; no administrative bypass or self-approval was used.
- Full restored schema/security verification passed for 42 tables and 84 policies.
  Explicit Staging-only baseline adoption registered the private checksum ledger
  without bootstrap replay or application-data changes; checksum readback matched.

Remaining: owner acceptance of the protected Staging release, then verification
of its exact Render commit and resulting READY Vercel Preview/origin. Preserve
the currently working Preview until acceptance. Do not enable Production, DNS,
data transfer, extra paid services or the suspended Worker.

## Verified Staging workflows

- Native Private Access submission with the original password and authorized
  Clerk customer/Super Admin sign-in.
- Customer request, technical QA quotation (USD 99 setup / USD 29 recurring),
  operator review, approval, isolated tenant delivery and customer reload.
- Tenant-only asset/network selection and settings/rate persistence.
- A synthetic 0.1 BTC → 1 ETH Swap order on test networks, public confirmation
  and customer-owned Admin Panel processing pending → processing → completed.
  Completed persisted after reload and matching-token public tracking retained
  the full history. Settled Active returned zero rows; Archived returned the
  completed row. Terminal reopen and stale expected-status writes both returned
  409 without changing Completed. This proves sandbox operation, not settlement.
- The completed row briefly shown while switching filters was previous-query
  placeholder data, not a server filtering error. The loading branch now hides
  placeholder rows until the new response settles.
- Customer principal: client admin, sandbox-only, one tenant membership;
  authenticated Super Admin plans endpoint denied with 403; public catalog 200.
- Rejected asset saves now retain a visible inline error; deployed and confirmed.

Disposable QA data and identity were removed, temporary sessions and transport
credentials revoked, and the original single owner binding restored. The API
cleanup deployment was read back live.
Existing plans, Production, DNS, live providers and
the suspended Worker were not changed.

## Clerk ownership — unresolved dependency, not a request to replace users

The management check currently reports **Replit-managed**, with dashboard entry
authorized. Dashboard access does not establish independent ownership.
The documentation lookup does not provide a preservation-safe ownership
transfer procedure for the current instance.

An unactivated independent-Staging candidate preparation command and guards are
implemented and tested; see `independent-staging-clerk.md`. No candidate account
was created and no existing keys or identities were replaced. Actual independent
ownership still requires operator-controlled candidate credentials/identity or
a supported preservation-safe transfer procedure; it has not been proven.

Obtain a supported ownership-transfer or preservation-safe migration procedure
for the existing Clerk application before making any authentication change.
Do not delete the managed instance, create a replacement application, rotate
live keys, recreate customers, or change existing Owner/Super Admin permissions.
If a replacement tenant is ultimately required, obtain separate approval and
prove existing identity/role linkage, sign-in methods, user continuity and
rollback on isolated Staging first.

## Other independence steps

- Verify independent owner/admin access to GitHub, Vercel, Render and Supabase,
  with MFA and recovery under the owner's custody.
- Keep an encrypted independent backup plus independently recoverable encryption
  key; document database and private-storage restore drills and retention.
- Verify runtime credentials, TLS CA, storage configuration and release tooling
  are held outside Replit. Prepared CI uses provider APIs directly, not Replit
  connector credentials.
- Audit any live webhooks, Telegram/provider callbacks, custom domains, outbound
  notifications and background jobs separately. Exchange sandbox verification
  is not approval or proof of live fund execution.
- After ownership and automation acceptance, prepare an explicitly approved
  Production cutover: consistent final snapshot, identity/storage parity,
  announced write freeze, exactly one writer/Worker, rollback criteria, and
  separate DNS/routing approval. Do not perform these steps during Staging QA.

Evidence references: `generated-artifacts/qxlayer-staging-setup/` contains
sanitized provider and browser receipts; disposable cleanup scope is retained
there only until cleanup completes.

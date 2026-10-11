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
- Protected environment approval and `QXLAYER_EXTERNAL_RELEASES_ENABLED` gate
  all releases. They have not been enabled by this preparation.
- Exact-commit Render releases skip the Worker by default and reject suspended
  services. No script resumes a service or changes its paid plan.
- Vercel Preview packaging establishes the project context explicitly.
- The resulting READY deployment must belong to the pinned Staging project.
  Its immutable URL is then synchronized to both Render origin settings before
  a second exact-commit API deployment applies the change.
- Read-only schema/security checks and verified TLS remain mandatory; importing
  data is not part of a release. Migrations remain separately opt-in.

Remaining activation steps:
1. Register the reviewed release workflow on the default branch through a
   separately reviewed source change. The files are synchronized on
   `qxlayer-staging`, but GitHub requires default-branch registration for manual
   dispatch; the default branch was intentionally left unchanged.
2. Configure the protected `qxlayer-staging` GitHub environment: required
   reviewers; Render and Vercel provider credentials; pinned project/service
   identifiers; restricted migration connection; verified CA; build-time
   Development Clerk public configuration. Store credentials only in protected
   provider/GitHub secret stores, never in source or Replit-dependent scripts.
3. Run the checks on GitHub, then one explicitly approved Staging release and
   verify its exact source commit, origin, login and customer lifecycle.
   Preserve the current working Preview until the candidate passes.
4. Enable repeatable Staging dispatch only after that evidence. Keep Production
   releases disabled and retain separate approval for any eventual cutover.

Latest provider readback: the newly supplied GitHub credential successfully
synchronized both workflow files to Staging, and the actual GitHub
**External preparation checks** run completed successfully. Workflow-file
authorization is resolved. The repository still has no environments, Actions
secrets or Actions variables configured; the default branch does not contain
the release workflow. No release was dispatched or enabled.

## Verified Staging workflows

- Native Private Access submission with the original password and authorized
  Clerk customer/Super Admin sign-in.
- Customer request, technical QA quotation (USD 99 setup / USD 29 recurring),
  operator review, approval, isolated tenant delivery and customer reload.
- Tenant-only asset/network selection and settings/rate persistence.
- A synthetic 0.1 BTC → 1 ETH Swap order on test networks, public confirmation
  and customer-owned Admin Panel order/details readback. This proves sandbox
  creation and visibility, not live settlement or completed-order processing.
- Customer principal: client admin, sandbox-only, one tenant membership;
  authenticated Super Admin plans endpoint denied with 403; public catalog 200.
- Rejected asset saves now retain a visible inline error; deployed and confirmed.

Disposable QA data and identity were removed, temporary sessions and transport
credentials revoked, and the original single owner binding restored. The API
cleanup deployment is live. Existing plans, Production, DNS, live providers and
the suspended Worker were not changed.

## Clerk ownership — unresolved dependency, not a request to replace users

The management check currently reports **Replit-managed**, with dashboard entry
authorized. Dashboard access does not establish independent ownership.
The documentation lookup does not provide a preservation-safe ownership
transfer procedure for the current instance.

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

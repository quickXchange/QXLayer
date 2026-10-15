# VYNOX LAYER external cutover and rollback

## End state

Replit is Development only. The existing `quickXchange/VYNOX-LAYER` GitHub
repository, branch `main`, is the source of releases. Vercel serves both existing
frontends; Render serves the API; the isolated Supabase Production project
`qcgvhlphalxqzzsxqjhi` holds business data and native authentication.
No Replit Republish is part of this release process.

## Implemented pre-cutover automation

`external-sync.yml` runs on a push to `main`: checks → exact-SHA Render API
deployment → preserved frontend build → protected Vercel Preview → identity
readback. It reuses the existing services, does not resume the worker and never
applies schema, imports data, assigns customer domains or activates Live.

The `vynox-candidate` GitHub environment allows `main` and contains deployment
credentials only. The older reviewed Staging environment retains its approval
rules and migration secrets. Render native autodeploy is deliberately off to
avoid racing/duplicating the coordinated CI deployment.

This is **candidate automation**, not proof of Production readiness. Its mandatory
startup hold and Preview-only assertion must not be removed prematurely.

## Database migration, independent of native Replit Publish

Reuse the existing checksum/advisory-lock/transaction-based external migration
toolkit. Do not run drizzle push, build/startup DDL or native Publish.
`production-candidate/0004_latest-schema-PREPARED.sql` adds the two missing
public tables, all current guarded policy expressions, all 42 FORCE flags, and
the five private Auth support tables. It contains no account or business rows.
The manifest pins its source comparison and checksum. It is intentionally not
registered in the executable baseline manifest until target reconciliation.

Before execution, validate TLS/hostname/project, confirm the isolated target is
not Development/Staging/Replit Live, capture its pre-state, reconcile any restored
baseline with the version ledger and regenerate the source comparison. Use a
maintenance window and separate migration role. Keep writes disabled until exact
policy/constraint/ACL readback and native administrator/MFA checks pass.

Populate business data from the verified encrypted **Live** snapshot, never
Development fixtures. Preserve existing IDs, ownership, settings, modules,
attachments and commercial values. Rehearse restore/parity offline; take a fresh
Live backup and final delta under an approved write freeze immediately before
cutover. Do not delete or overwrite either source or target on a conflict.

## Unavoidable readiness gates

- Production database/server credentials must be available in the protected
  external runtime, never frontend bundles or Git.
- Original administrator identity, business role and MFA continuity must be
  proven natively. A different test administrator is not preservation evidence.
  If the old provider cannot export an existing factor, stop and obtain explicit
  owner-approved enrollment/recovery; never silently disable MFA.
- Verify native email delivery and verification/recovery links on the isolated
  target; configured SMTP alone is not delivery evidence.
- Exercise owner login/MFA/recovery, tenant isolation, settings, modules, website
  routes, uploads and business create/edit flows using disposable records only.
- Prove a new GitHub SHA reaches both providers and repeat read-only readiness
  checks. Application health alone is not database/Auth parity.

## Final cutover — explicit owner approval required

1. Record the Live release and DNS A/AAAA/CNAME/TTL values for apex and `www`.
   Capture the Vercel project-specific recommended records; do not guess them.
2. Obtain approval for the exact data freeze, schema/data/auth transfer,
   Production activation and DNS changes.
3. Freeze source writes; capture final encrypted backup and reconcile final
   records/assets. Validate original administrator/MFA before opening writes.
4. Install isolated Production backend/database/storage/Auth/mail configuration
   securely. Preserve verified TLS and role separation. Set the canonical origin
   and exact allowed callback/origin URLs; do not expose privileged keys.
5. Switch CI to a separate protected Production environment, verify exact-SHA
   deploys, Production target and stable same-origin API rewrites. The candidate
   startup-hold checker remains in the candidate job.
6. Attach the approved domain in Vercel and use its exact recommended DNS values.
   Verify HTTPS, apex/`www` behavior, email callbacks, sessions, MFA, uploads,
   CSP/CORS/CSRF, native mail and tenant boundaries through the actual domain.
7. Open writes only after acceptance. Retain the old Live deployment read-only
   for the agreed rollback window. Retire Replit Production hosting only after
   a separate approval; Development remains available.

## Rollback

Before external writes open: restore the captured DNS records and route to the
unchanged old Live release; keep the external candidate held and preserve all
backups. Roll back provider code to the recorded accepted SHA if needed.

After external writes open: first freeze writes and snapshot the external DB.
Reconcile every externally created/changed record and asset before routing back.
Do **not** restore a stale snapshot, reverse-drop new tables, clear accounts,
disable MFA or point the old release at an incompatible schema. Rollback may
require a forward-compatible code fix or approved data reconciliation, not
simply reverting DNS. Never allow two writable authorities.

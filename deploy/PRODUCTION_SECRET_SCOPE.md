# Production-only secret preparation

## Verification boundaries

The user confirmed both names were added under Publishing → Adjust settings →
Production app secrets:

- `QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD`
- `QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET`

The secure existence interface still reports both Shared copies. Its Development
and Production results also include Shared entries: these results are NOT
independent evidence of Publishing-only storage, equality, randomness, length,
or external backup custody. No secret values were inspected or displayed.

Replit documentation states that Publishing secrets are stored separately from
workspace Secrets. Deleting a workspace copy does not delete a separately saved
Publishing copy. Agent tooling here documents deletion of non-secret variables,
not deletion of secrets; do not use that interface to delete sensitive entries.

## Shared-copy removal

Reviewed explicit references show:

- The database password is consumed by the manual provisioning command, not by
  an application workflow, build or Development authentication.
- The session key is consumed only by the explicitly enabled Production Auth
  branch. Development selects its own existing independent session key.
- Current non-secret Development configuration selects Development Supabase.

Once both Publishing entries are saved independently and private recovery copies
are retained, removing ONLY these two entries in workspace Tools → Secrets does
not remove an active Development dependency. Do not touch other secrets.

The provisioning command WILL lose workspace access to these values afterward.
Future execution requires an approved secure provisioning context with the
independent credentials available in memory. Do not restore Shared copies,
put them in source files, use shell command-line literals, or republish just to
make them accessible to the agent. The database provisioning password need not
be forwarded to the application runtime merely because it is stored in Publishing.

## Current execution boundary

Preparation is allowed; Staging pause, project creation through that pause,
Live changes, migration and Republish remain blocked. General setup approval
and secret presence are insufficient. The provisioning command now requires
separate current Staging-pause and project-creation approval flags, as well as
both independent credentials, before any provider request or progress write.
Never set approval flags without the user's corresponding explicit approval.

Reuse completed capacity and preservation evidence. Refresh preservation only
when execution is approved and the retained snapshot has expired; do not repeat
the full audit while waiting. Production project setup cannot proceed in the
occupied Free slot without the separately approved Staging pause.

## Essential manual action

Verify the two names exist in Production app secrets (without revealing values),
retain recovery copies in an encrypted password-manager vault outside Replit,
then remove just their Shared workspace entries. Save settings only: do NOT
Publish or Republish. If saving requires publishing, stop.

References:
- https://docs.replit.com/core-concepts/project-editor/app-setup/secrets
- https://docs.replit.com/features/publishing/overview

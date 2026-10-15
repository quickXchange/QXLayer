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

The user renewed Staging-pause and independent Free project-creation approval
after confirming separate Publishing copies and removing Shared copies.
Workspace existence checks confirm both Shared entries are absent, but cannot
independently attest the Publishing store. Live changes, migration and Republish
remain blocked. General setup approval and secret presence are insufficient
without the corresponding explicit user approval. The command requires
separate current Staging-pause and project-creation approval flags, as well as
both independent credentials, before any provider request or progress write.
Never set approval flags without the user's corresponding explicit approval.

Reuse completed capacity and preservation evidence. Refresh preservation only
when execution is approved and the retained snapshot has expired; do not repeat
the full audit while waiting. Production project setup cannot proceed in the
occupied Free slot without the separately approved Staging pause.

## Essential manual action

Shared deletion is complete. Do not re-add the values to Shared or republish.
Production-only Publishing secrets cannot be read by workspace provisioning.

Run this command once in a private workspace Shell:

```sh
node scripts/external-hosting/prepare-free-production-interactive.mjs
```

Enter the two already-saved values from your private vault when prompted. Input
is not echoed or added to terminal history, and is supplied through a private
in-memory object to the guarded runner, never written to a credential file,
global process environment or Replit Shared Secrets. The session key is checked
for independence and is not sent to Supabase project creation. Credentials live
in process memory transiently; JavaScript cannot guarantee immutable-string
erasure. Only sanitized status and non-secret progress state are persisted.

The command intentionally performs the approved Staging pause and creates one
independent Free project. It does not activate Production Auth, migrate accounts,
change Live, or publish. Before pause, the existing runner checks the recent
preservation evidence, Free plan and healthy Development. On failure, do not
blindly rerun: have Agent inspect the saved provisioning state.

After it finishes, Agent can use the saved non-secret project reference to
continue. Newly project-scoped setup authorization may still be essential;
organization creation permission is not existing/new project-settings permission.

References:
- https://docs.replit.com/core-concepts/project-editor/app-setup/secrets
- https://docs.replit.com/features/publishing/overview

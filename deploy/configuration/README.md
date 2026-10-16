# Protected Production reference configuration

`vynox-reference.json` is a frozen, version-controlled, non-secret export of the
current Development **global** configuration and exact application schema.
It is not an export of customers, accounts, tenants, orders, uploads or credentials.

The synchronizer:

- pins the existing isolated Supabase Production project and verified TLS;
- compares all public columns, constraints and indexes before changing data;
- inserts missing global records in dependency order in one transaction;
- refuses existing-key value conflicts rather than overwriting operator changes;
- fingerprints protected application rows and the accepted Owner identity link;
- preserves exact decimals and timestamp precision;
- supports read-only inspection, rollback rehearsal and an explicit apply mode;
- saves a configuration-only pre-change backup and per-table readback evidence.

The retained Development-only customer provisioning plan and its entitlements
are excluded. The four other sample plans and one sample add-on are imported as
**disabled references**, never real commercial offers. Undecided prices remain
unconfigured; sample metadata must not be advertised as an approved price.
Production operators can create real offerings using the existing pricing,
entitlement and plan controls. Newly approved commercial data requires review,
not automatic substitution from demonstrations.

Commands:

```sh
node scripts/external-hosting/synchronize-reference-configuration.mjs --capture-development
node scripts/external-hosting/synchronize-reference-configuration.mjs
node scripts/external-hosting/synchronize-reference-configuration.mjs --rehearse
node scripts/external-hosting/synchronize-reference-configuration.mjs --apply-approved-reference
```

Capture is restricted to the recognized Replit Development database. Inspection,
rehearsal and apply are restricted to the existing protected Production target.
The candidate workflow applies only the reviewed package. It does not publish
Live, change DNS, migrate schema, import customers, change the Owner, activate
providers, or enable financial execution. Conflicts fail visibly for review.

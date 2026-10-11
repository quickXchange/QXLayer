import { test } from "node:test";
import assert from "node:assert/strict";
import { assertMigrationReadback } from "../external-postgres/manifest-readback.mjs";
const m = [
  { file: "0001_application_schema.sql", sha256: "a" },
  { file: "0002_runtime_security.sql", sha256: "b" },
  { file: "0003_owned_auth.sql", sha256: "c" },
];
test("only inactive Clerk Staging allows the unapplied additive auth migration", () => {
  assertMigrationReadback(m.slice(0,2), m, { QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_AUTH_PROVIDER: "clerk" });
  for (const env of [{}, { QXLAYER_EXTERNAL_ENVIRONMENT: "production", QXLAYER_AUTH_PROVIDER: "clerk" },
    { QXLAYER_EXTERNAL_ENVIRONMENT: "staging", QXLAYER_AUTH_PROVIDER: "owned" }])
    assert.throws(() => assertMigrationReadback(m.slice(0,2), m, env));
  assert.throws(() => assertMigrationReadback([{...m[0],sha256:"wrong"},m[1]],m,
    {QXLAYER_EXTERNAL_ENVIRONMENT:"staging",QXLAYER_AUTH_PROVIDER:"clerk"}));
  assertMigrationReadback(m,m,{QXLAYER_EXTERNAL_ENVIRONMENT:"staging",QXLAYER_AUTH_PROVIDER:"owned"});
});

import test from "node:test";
import assert from "node:assert/strict";
import { validatePrivateInputs, verifyPrivateRuntime } from "./verify-production-private-runtime.mjs";
const input = { serverKey: "sb_secret_synthetic_production_only_value", sessionKey: "synthetic-production-session-key-unique" };
test("private verification rejects reused environment keys", () => {
  assert.throws(() => validatePrivateInputs({ ...input, otherServerKeys: [input.serverKey] }));
  assert.throws(() => validatePrivateInputs({ ...input, otherSessionKeys: [input.sessionKey] }));
  assert.throws(() => validatePrivateInputs({ ...input, serverKey: "sb_publishable_synthetic_only" }));
  assert.throws(() => validatePrivateInputs({ ...input, sessionKey: input.serverKey }));
  assert.throws(() => validatePrivateInputs({ ...input, otherServerKeys: [input.sessionKey] }));
  assert.throws(() => validatePrivateInputs({ ...input, otherSessionKeys: [input.serverKey] }));
});
test("native readonly check never claims migration, Publishing custody or Live database binding", async () => {
  const paths = [];
  const result = await verifyPrivateRuntime(input, async path => {
    paths.push(path); return { ok: true, json: async () => ({ users: [] }) };
  });
  assert.equal(paths.length, 2); assert.equal(result.serverCredentialAccepted, true);
  assert.equal(result.liveModified, false); assert.equal(result.ownerMigratedOrAccepted, false);
  assert.equal(result.publishingStoredValuesIndependentlyVerified, false);
  assert(!JSON.stringify(result).includes(input.serverKey));
  assert(!JSON.stringify(result).includes(input.sessionKey));
});
test("bad native server credentials fail closed", async () => {
  await assert.rejects(verifyPrivateRuntime(input, async () => ({ ok: false })));
});

import test from "node:test";
import assert from "node:assert/strict";
import { verifyAuthenticationCompatibility } from "./authentication-compatibility.mjs";
test("authentication retirement blocks Republish independently of runtime environment flags", () => {
  assert.throws(() => verifyAuthenticationCompatibility(), /REPUBLISH BLOCKED/);
});

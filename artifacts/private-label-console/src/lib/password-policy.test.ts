import test from "node:test";
import assert from "node:assert/strict";
import { newPasswordError } from "./password-policy";

test("Development new passwords accept exactly ten mixed-case alphanumeric characters without symbols", () => {
  assert.equal(newPasswordError("Abcdefgh12", true), "");
  assert.equal(newPasswordError("Abcdefgh1!", true), "");
  for (const value of ["Abcdefg12", "abcdefgh12", "ABCDEFGH12", "Abcdefghij", "Aa1".repeat(44)])
    assert(newPasswordError(value, true));
});
test("non-Development password behavior stays unchanged", () => {
  assert(newPasswordError("Abcdefgh12", false));
  assert.equal(newPasswordError("abcdefghijkl", false), "");
});

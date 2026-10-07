import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticLimiter, parseWebsiteDiagnostic } from "./error-diagnostics";
const valid = { errorId: `QXS-${"a".repeat(32)}`, category: "render_type", buildId: `site-${"b".repeat(16)}` };
test("accepts only the three safe fields", () => {
  assert.deepEqual(parseWebsiteDiagnostic(valid), valid);
  for (const field of ["stack", "message", "tenantId", "route", "response", "credentials"]) {
    assert.equal(parseWebsiteDiagnostic({ ...valid, [field]: "SYNTHETIC_PRIVATE_MARKER" }), null);
  }
});
test("rejects identifiers and categories containing private text", () => {
  for (const field of ["errorId", "buildId", "category"]) assert.equal(parseWebsiteDiagnostic({ ...valid, [field]: "SYNTHETIC_PRIVATE_MARKER" }), null);
  assert.equal(parseWebsiteDiagnostic({ ...valid, errorId: `${valid.errorId}\n` }), null);
  assert.equal(parseWebsiteDiagnostic({ ...valid, buildId: `${valid.buildId}\n` }), null);
  for (const input of [null, [], {}, "secret"]) assert.equal(parseWebsiteDiagnostic(input), null);
});
test("per-source limit, global limit and expiration", () => {
  let time = 1000;
  const limit = diagnosticLimiter(() => time);
  for (let i = 0; i < 10; i++) assert(limit("one"));
  assert.equal(limit("one"), false);
  for (let i = 0; i < 90; i++) assert(limit(`other-${i}`));
  assert.equal(limit("last"), false);
  time += 60_001;
  assert(limit("one"));
});

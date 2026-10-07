import assert from "node:assert/strict";
import test from "node:test";
import { createDiagnostic, diagnosticBody, errorCategory } from "./error-diagnostics";
test("safe diagnostic never serializes sensitive error details", () => {
  const error = new TypeError("SYNTHETIC_PRIVATE_MARKER: raw API response, tenant, credential");
  const diagnostic = createDiagnostic(error);
  assert.match(diagnostic.errorId, /^QXS-[a-f0-9]{32}$/);
  assert.equal(diagnostic.category, "render_type");
  const body = diagnosticBody({ ...diagnostic, stack: error.stack, tenantId: "private" } as typeof diagnostic);
  assert.deepEqual(Object.keys(JSON.parse(body)).sort(), ["buildId", "category", "errorId"]);
  assert(!body.includes("SYNTHETIC_PRIVATE_MARKER"));
  assert(!body.includes("tenantId"));
});
test("categories are allowlisted and hostile accessors cannot crash fallback", () => {
  assert.equal(errorCategory(new ReferenceError("private")), "missing_reference");
  assert.equal(errorCategory(new SyntaxError("private")), "script_syntax");
  assert.equal(errorCategory({ name: "ChunkLoadError", stack: "private" }), "asset_load");
  assert.equal(errorCategory({ get name() { throw new Error("private"); } }), "unknown");
  assert.equal(errorCategory("private"), "unknown");
});

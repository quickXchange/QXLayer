import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { preservesSessionsWithOneOwnerAddition as preserved } from "./preserved-session-addition";

const original = [{ digest: "a", subject: "owner" }, { digest: "c", subject: "customer" }];
const baseline = { count: original.length,
  hash: createHash("sha256").update(JSON.stringify(original)).digest("hex") };
test("a single new Owner session preserves the exact original session set", () => {
  assert(preserved(baseline, [original[0], { digest: "b", subject: "owner" }, original[1]], "owner"));
});
test("count growth never substitutes for exact original digest/subject preservation", () => {
  assert(!preserved(baseline, [{ digest: "a", subject: "changed" },
    { digest: "b", subject: "owner" }, original[1]], "owner"));
  assert(!preserved(baseline, [original[0], { digest: "b", subject: "owner" },
    { digest: "d", subject: "owner" }], "owner"));
});
test("another subject's additions, duplicates and unexpected counts are not waived", () => {
  assert(!preserved(baseline, [original[0], { digest: "b", subject: "customer" }, original[1]], "owner"));
  assert(!preserved(baseline, [original[0], original[0], original[1]], "owner"));
  assert(!preserved(baseline, original, "owner"));
  assert(!preserved(baseline, [...original, { digest: "d", subject: "owner" },
    { digest: "e", subject: "owner" }], "owner"));
});

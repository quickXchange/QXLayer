import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { frozenSourceChecksumSql } from "./frozen-source-checksum.mjs";

test("frozen payload integrity uses built-in PostgreSQL SHA-256, not MD5", () => {
  for (const payload of ["", '{"name":"VYNOX"}', '{"name":"é العربية 🔒"}']) {
    const expected = createHash("sha256").update(payload, "utf8").digest("hex");
    assert.equal(frozenSourceChecksumSql(payload),
      `encode(sha256(convert_to(source_text, 'UTF8')), 'hex') <> '${expected}'`);
    assert.notEqual(frozenSourceChecksumSql(payload), frozenSourceChecksumSql(payload + " "));
  }
  const generator = readFileSync(new URL("./prepare-configuration-migration.mjs", import.meta.url), "utf8");
  assert.match(generator, /frozenSourceChecksumSql\(payload\)/);
  assert.doesNotMatch(generator, /createHash\("md5"\)/);
  assert.match(generator, /Frozen source payload was changed/);
});

test("offline rehearsal retains disposable-only guards and uses a unique local password", () => {
  const source = readFileSync(new URL("../external-postgres/rehearsal.mjs", import.meta.url), "utf8");
  assert.match(source, /NODE_ENV !== "test"/);
  assert.match(source, /QXLAYER_MIGRATION_TEST !== "true"/);
  assert.match(source, /Disposable database must start empty/);
  assert.match(source, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(source, /url\.password = disposablePassword/);
  assert.doesNotMatch(source, /qxlayer_disposable_test_only/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
test("durable recovery tools are byte-identical to the previously reviewed encryption modules", async () => {
  for (const [name, expected] of [
    ["encrypted_backup.mjs", "ad161dd7bd5e4e03c7e21111ac49e0dee4180ae95b7c7ffa09a9dd6d3d131e3a"],
    ["encrypted_recovery.mjs", "e14c41de329db671731c2c0f944f19e074b386c9e11b5c833748ac693b75190f"],
  ]) assert.equal(createHash("sha256").update(await readFile(`scripts/recovery/${name}`)).digest("hex"), expected);
});

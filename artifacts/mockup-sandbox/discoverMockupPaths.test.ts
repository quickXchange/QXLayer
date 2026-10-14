import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { discoverMockupPaths } from "./discoverMockupPaths";

test("native discovery preserves nested public TSX targets and excludes helpers/hidden files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-discovery-"));
  const prefix = "src/components/mockups/";
  try {
    for (const file of ["Z.tsx", "nested/A.tsx", "_helper.tsx", "_private/B.tsx",
      "nested/_C.tsx", ".hidden.tsx", ".hidden/D.tsx", "Other.ts", "README.md"]) {
      const target = path.join(root, prefix, file);
      await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, "");
    }
    assert.deepEqual(await discoverMockupPaths(root), [prefix + "Z.tsx", prefix + "nested/A.tsx"]);
    await writeFile(path.join(root, prefix, "New.tsx"), "");
    assert.equal((await discoverMockupPaths(root)).length, 3);
    await rm(path.join(root, prefix, "Z.tsx"));
    assert.equal((await discoverMockupPaths(root)).length, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("a missing mockups directory returns an empty discovery result", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-empty-"));
  try { assert.deepEqual(await discoverMockupPaths(root), []); }
  finally { await rm(root, { recursive: true, force: true }); }
});

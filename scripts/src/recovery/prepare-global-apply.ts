// Offline only: curated reference/configuration data, never a database connection.
import { readFile } from "node:fs/promises";
import { classifyGlobal, globalManifestFingerprint, prepareGlobalApply } from "./global-foundation";
const [snapshotFile, approvalFile, mode] = process.argv.slice(2);
if (!snapshotFile || mode && mode !== "--emit-sql") throw new Error("Usage: snapshot.json [approvals.json --emit-sql]");
const snapshot = JSON.parse(await readFile(snapshotFile, "utf8"));
process.stdout.write(mode === "--emit-sql"
  ? prepareGlobalApply(snapshot, JSON.parse(await readFile(approvalFile, "utf8")))
  : JSON.stringify({ manifestFingerprint: globalManifestFingerprint, rows: classifyGlobal(snapshot) }, null, 2));

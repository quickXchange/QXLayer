// Offline preparation only. No database import, connection, query or write.
import { readFile } from "node:fs/promises";
import { approvedManifestFingerprint, classifyCatalog, prepareCatalogApply, type CatalogSnapshot, type CatalogApproval } from "./catalog-package";
const args = process.argv.slice(2);
const [snapshotPath, approvalPath, flag] = args;
if (!snapshotPath || args.length > 3 || (flag && flag !== "--emit-sql")) throw new Error("Usage: snapshot.json [approvals.json] [--emit-sql]. This tool never connects to a database.");
const snapshot: CatalogSnapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const plan = classifyCatalog(snapshot);
if (flag === "--emit-sql") {
  if (!approvalPath) throw new Error("Explicit per-key approval file required.");
  const approval: CatalogApproval = JSON.parse(await readFile(approvalPath, "utf8"));
  process.stdout.write(prepareCatalogApply(snapshot, approval));
} else {
  process.stdout.write(JSON.stringify({ approvedManifestFingerprint, capturedAt: snapshot.capturedAt, plan }, null, 2) + "\n");
}

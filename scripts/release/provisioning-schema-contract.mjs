import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const legacyDeliveryCheck = "white_label_request_delivery";
export const deliveryCheck = "white_label_request_delivery_requires_tenant";
const corrected = "CHECK (status <> 'delivered' OR tenant_id IS NOT NULL)";
const legacy = "CHECK ((status = 'delivered') = (tenant_id IS NOT NULL))";
const normalized = sql => sql.toLowerCase().replaceAll("::text", "")
  .replaceAll("public.", "").replace(/[\s();""]/g, "");
export const schemaDigest = source => createHash("sha256").update(source).digest("hex");

// Pure review of native Publish evidence. Never opens a database or executes SQL.
export function verifyProvisioningPlan({ diff, development, production, schemaSha256 }, source) {
  assert.equal(schemaDigest(source), schemaSha256, "Schema changed: refresh the native publishing review.");
  assert(source.includes(`check("${deliveryCheck}", sql\`status <> 'delivered' OR tenant_id IS NOT NULL\`)`),
    "The source must use the distinctly named corrected delivery CHECK.");
  assert(!source.includes(`check("${legacyDeliveryCheck}",`),
    "Do not reuse the legacy CHECK name: Publish misses same-name expression changes.");
  assert(diff.success, "Native schema diff failed; do not infer parity.");
  for (const field of ["tablesToRemove", "tablesToTruncate", "columnsToRemove", "schemasToRemove", "matViewsToRemove"]) {
    assert(Array.isArray(diff[field]) && diff[field].length === 0, `Unsafe or missing native diff field: ${field}`);
  }
  assert.equal(diff.hasStructuralDataLoss, false, "Production data loss is forbidden.");
  const relevant = rows => rows.filter(c => [legacyDeliveryCheck, deliveryCheck].includes(c.name));
  const dev = relevant(development);
  assert.equal(dev.length, 1, "Development must have exactly one delivery CHECK.");
  assert.equal(dev[0].name, deliveryCheck);
  assert.equal(dev[0].validated, true, "Development CHECK must be validated.");
  assert.equal(normalized(dev[0].definition), normalized(corrected), "Wrong Development delivery semantics.");
  const prod = relevant(production);
  assert.equal(prod.length, 1, "Unexpected Production delivery CHECK state: stop for review.");
  assert.equal(prod[0].validated, true, "Production CHECK must be validated.");
  if (prod[0].name === deliveryCheck) {
    assert.equal(normalized(prod[0].definition), normalized(corrected), "Wrong Production delivery semantics.");
    assert.equal(diff.hasDiff, false);
    assert.deepEqual(diff.statementsToExecute, [], "Review unrelated changes separately.");
    return "already-applied";
  }
  assert.equal(normalized(prod[0].definition), normalized(legacy), "Unexpected legacy predicate: stop for review.");
  assert.equal(diff.hasDiff, true, "Publish must detect the legacy CHECK replacement.");
  assert.deepEqual(diff.statementsToExecute.map(normalized), [
    `ALTER TABLE white_label_requests DROP CONSTRAINT ${legacyDeliveryCheck};`,
    `ALTER TABLE white_label_requests ADD CONSTRAINT ${deliveryCheck} ${corrected};`,
  ].map(normalized), "Native Publish must contain only the exact CHECK replacement, in order.");
  return "ready-for-native-publish";
}

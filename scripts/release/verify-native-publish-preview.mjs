import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export function decodeCatalog(response) {
  assert(response.success && response.exitCode === 0, "Catalog read failed");
  const csv = response.output.slice(response.output.indexOf("\n") + 1).trim();
  assert(csv.startsWith('"') && csv.endsWith('"'), "Unexpected metadata envelope");
  return JSON.parse(csv.slice(1, -1).replaceAll('""', '"'));
}
const hash = value => createHash("sha256").update(value ?? "").digest("hex");
export function canonical(value = "") {
  // Retain SQL string literals exactly; normalize only non-string formatting.
  return value.split(/('(?:''|[^'])*')/g).map((s, i) => i % 2 ? s :
    s.toLowerCase().replace(/"([a-z_][a-z_0-9]*)"/g, "$1")
      .replace(/\bpublic\./g, "").replace(/\bon (delete|update) no action\b/g, "")
      .replace(/\s/g, "").replace(/;$/, "")).join("");
}
function expression(statement, keyword) {
  const match = new RegExp(`\\b${keyword}\\s*\\(`, "i").exec(statement);
  if (!match) return null;
  const start = match.index + match[0].length;
  let depth = 1, quoted = false;
  for (let i = start; i < statement.length; i++) {
    if (statement[i] === "'") {
      if (quoted && statement[i + 1] === "'") { i++; continue; }
      quoted = !quoted; continue;
    }
    if (quoted) continue;
    if (statement[i] === "(") depth++;
    if (statement[i] === ")" && --depth === 0) return statement.slice(start, i);
  }
  throw Error("Unbalanced policy expression");
}
function defaultValue(value, type) {
  if (value === null) return null;
  const jsonLiteral = /^'((?:''|[^'])*)'::jsonb$/s.exec(value);
  if (type === "jsonb" && jsonLiteral) {
    return JSON.stringify(JSON.parse(jsonLiteral[1].replaceAll("''", "'")));
  }
  return canonical(type === "text" ? value.replace(/::text$/, "") : value);
}
export function verifyNative(native, dev, visibility, details) {
  assert(native.success && Array.isArray(native.statementsToExecute), "Native preview unavailable");
  const sql = native.statementsToExecute;
  const policyStatements = sql.filter(s => /\bCREATE POLICY\b/i.test(s));
  const policies = (dev.policies ?? []).map(expected => {
    const matches = policyStatements.filter(s => {
      const m = /CREATE POLICY "([^"]+)" ON (?:"public"\.)?"([^"]+)"/i.exec(s);
      return m && m[1] === expected.name && m[2] === expected.table;
    });
    const statement = matches[0] ?? "";
    const using = expression(statement, "USING"), check = expression(statement, "WITH CHECK");
    const kind = details.policyKinds.find(p => p.table === expected.table && p.name === expected.name);
    const command = /\bFOR (SELECT|ALL|INSERT|UPDATE|DELETE)\b/i.exec(statement)?.[1]?.toUpperCase();
    const roles = /\bTO\s+(.+?)(?=\s+USING|\s+WITH CHECK|;)/i.exec(statement)?.[1]
      ?.split(",").map(s => s.trim().replaceAll('"', "")).sort();
    return { table: expected.table, policy: expected.name, statementCount: matches.length,
      commandMatches: command === expected.command,
      rolesMatch: JSON.stringify(roles) === JSON.stringify([...expected.roles].sort()),
      permissiveMatches: statement.includes(`AS ${kind?.permissive}`),
      usingPresent: using !== null, withCheckRequired: expected.check !== null,
      withCheckPresent: check !== null, expectedUsingSha256: hash(expected.using),
      expectedCheckSha256: expected.check === null ? null : hash(expected.check),
      usingMatches: using !== null && canonical(using) === canonical(expected.using),
      checkMatches: expected.check === null ? check === null : check !== null && canonical(check) === canonical(expected.check) };
  });
  const declared = new Set(policies.map(p => `${p.table}.${p.policy}`));
  const unexpectedPolicies = policyStatements.filter(s => {
    const m = /CREATE POLICY "([^"]+)" ON (?:"public"\.)?"([^"]+)"/i.exec(s);
    return !m || !declared.has(`${m[2]}.${m[1]}`);
  });
  const inventory = sql.map((statement, index) => {
    let m;
    if (/CREATE POLICY/i.test(statement)) return { index, kind: "policy", reviewed: true };
    if ((m = /ALTER TABLE "(?:public"\.")?([^"]+)" ENABLE ROW LEVEL SECURITY/i.exec(statement)))
      return { index, kind: "enable_rls", table: m[1],
        matchesSourceEnableFlag: details.rlsTables.find(t => t.table === m[1])?.rls === true };
    if ((m = /CREATE TABLE "(?:public"\.")?([^"]+)" \(/i.exec(statement))) {
      const table = m[1], source = details.columns.filter(c => c.table === table);
      const lines = statement.split("\n").map(l => l.trim()).filter(l => /^"\w+"/.test(l));
      const columns = source.map(c => {
        const line = lines.find(l => l.startsWith(`"${c.name}" `));
        const defaultSql = line ? /\bDEFAULT (.*?)(?: NOT NULL|,$|$)/i.exec(line)?.[1] : null;
        return { name: c.name, present: !!line, typeMatches: !!line?.startsWith(`"${c.name}" ${c.type}`),
          notNullMatches: !!line && (/\bNOT NULL|PRIMARY KEY/i.test(line) === c.notNull),
          defaultMatches: defaultValue(defaultSql ?? null, c.type) === defaultValue(c.default, c.type) };
      });
      const checks = details.constraints.filter(c => c.table === table && c.type === "c").map(c => {
        const line = statement.split("\n").map(l => l.trim()).find(l => l.startsWith(`CONSTRAINT "${c.name}" `)) ?? "";
        // PG's deparser adds a redundant outer CHECK pair; retain inner syntax.
        const strip = s => canonical(s).replace(/^check\(\((.*)\)\)$/, "check($1)");
        return { name: c.name, matches: strip(line.replace(/^CONSTRAINT "[^"]+" /, "").replace(/,$/, "")) === strip(c.definition) };
      });
      const pks = details.constraints.filter(c => c.table === table && c.type === "p");
      const primaryKeysMatch = pks.every(c => {
        const name = /PRIMARY KEY \(([^)]+)\)/.exec(c.definition)?.[1];
        return !!lines.find(l => l.startsWith(`"${name}" `) && /PRIMARY KEY/.test(l));
      });
      return { index, kind: "create_table", table, exactColumnCount: source.length === lines.length,
        columns, checks, primaryKeysMatch, sourceTableKnown: source.length > 0 };
    }
    if ((m = /ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (.*);/is.exec(statement))) {
      const source = details.constraints.find(c => c.table === m[1] && c.name === m[2]);
      return { index, kind: "constraint", table: m[1], name: m[2],
        matchesSource: !!source && canonical(m[3]) === canonical(source.definition) };
    }
    if ((m = /CREATE UNIQUE INDEX "([^"]+)"/i.exec(statement))) {
      const source = details.indexes.find(i => i.name === m[1]);
      return { index, kind: "index", name: m[1],
        matchesSource: !!source && canonical(statement) === canonical(source.definition) };
    }
    return { index, kind: "unrecognized", statementSha256: hash(statement) };
  });
  const missingPrivateTables = (dev.authTables ?? []).filter(t =>
    !sql.some(s => new RegExp(`CREATE TABLE "${t.schema}"\\."${t.table}"`, "i").test(s)));
  const missingForce = details.rlsTables.filter(t => t.force &&
    !sql.some(s => s.includes(`"${t.table}"`) && /FORCE ROW LEVEL SECURITY/i.test(s)));
  return { status: "NATIVE_PUBLISH_BLOCKED", nativePlanFixed: false, liveModified: false, republished: false,
    statementsReviewed: inventory.length, statementInventory: inventory,
    policiesReviewed: policies.length, policyChecks: policies, unexpectedPolicies,
    missingUsing: policies.filter(p => !p.usingPresent).length,
    missingWithCheck: policies.filter(p => p.withCheckRequired && !p.withCheckPresent).length,
    missingPrivateSchema: !sql.some(s => /CREATE SCHEMA "vynox_supabase_auth"/i.test(s)),
    missingPrivateTables: missingPrivateTables.map(t => t.table),
    sourcePrivateColumnCount: dev.authColumns.length,
    sourcePrivateConstraints: visibility.privateConstraints,
    privateSchemaDdlPresent: sql.some(s => /vynox_supabase_auth/.test(s)),
    sourcePrivateSchemaVisibleToReader: visibility.authSchemaReaderUsage,
    missingForceRls: missingForce.map(t => t.table),
    hasStructuralDataLoss: native.hasStructuralDataLoss,
    maybeNonBackwardsCompatible: native.maybeNonBackwardsCompatible,
    nativePlanSha256: hash(JSON.stringify(native)),
    note: "Exact policy-expression matching is conservative; no missing/changed predicate or private schema can be accepted as verified." };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = "generated-artifacts/native-publish-investigation";
  const json = async path => JSON.parse(await readFile(`${root}/${path}.json`, "utf8"));
  const report = verifyNative(await json("native-fresh"), decodeCatalog(await json("development-catalog")),
    decodeCatalog(await json("development-visibility")), decodeCatalog(await json("development-schema-details")));
  await writeFile(`${root}/verification.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: report.status, statementsReviewed: report.statementsReviewed,
    policiesReviewed: report.policiesReviewed, missingUsing: report.missingUsing,
    missingWithCheck: report.missingWithCheck, missingPrivateTables: report.missingPrivateTables,
    missingForceRls: report.missingForceRls.length,
    publicSchemaChanges: report.statementInventory.filter(i => ["create_table","constraint","index"].includes(i.kind)) }, null, 2));
}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

// Static/read-only analysis. Never imports either application's runtime or connects to a database.
const require = createRequire(path.join(process.cwd(), "package.json"));
const ts = require("typescript");
const referenceArg = process.argv.indexOf("--reference");
if (referenceArg < 0 || !process.argv[referenceArg + 1]) {
  throw new Error("Usage: node scripts/migration/audit-projects.mjs --reference /path/to/QuickXchange");
}
const root = process.cwd();
const reference = path.resolve(process.argv[referenceArg + 1]);
if (reference === root || !fs.existsSync(path.join(reference, "artifacts/api-server/src"))) {
  throw new Error("Project 1 must be a separate, readable source checkout.");
}
const output = path.join(root, "docs/migration/inventory");
fs.mkdirSync(output, { recursive: true });
const slash = p => p.split(path.sep).join("/");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
function sourceFiles(base) {
  return ["artifacts", "lib", "scripts"].flatMap(p => files(path.join(base, p)))
    .filter(p => !/\/(?:node_modules|dist|\.replit-artifact|public|migration)\//.test(slash(p)))
    .filter(p => /\.(?:tsx?|mjs|cjs)$/.test(p));
}
function schemas(base) {
  const tables = [];
  for (const file of files(path.join(base, "lib/db/src/schema")).filter(p => p.endsWith(".ts"))) {
    const text = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(sf) === "pgTable" &&
          ts.isStringLiteral(node.arguments[0])) {
        const name = node.arguments[0].text;
        const columnNode = node.arguments[1];
        const columns = ts.isObjectLiteralExpression(columnNode) ? columnNode.properties
          .filter(ts.isPropertyAssignment).map(p => {
            const code = p.initializer.getText(sf);
            const sqlName = code.match(/^\w+\(\s*["']([^"']+)["']/)?.[1] ?? p.name.getText(sf);
            return { property: p.name.getText(sf), sqlName, definition: code };
          }) : [];
        tables.push({ name, file: slash(path.relative(base, file)),
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          tenantScoped: columns.some(c => c.sqlName === "tenant_id"),
          columns, declaration: node.getText(sf) });
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  return tables.sort((a, b) => a.name.localeCompare(b.name));
}
function api(base) {
  const specFile = "lib/api-spec/openapi.yaml";
  const lines = fs.readFileSync(path.join(base, specFile), "utf8").split("\n");
  const operations = [];
  let inPaths = false, endpoint, method, operation;
  for (const [i, line] of lines.entries()) {
    if (line === "paths:") { inPaths = true; continue; }
    if (inPaths && /^[a-zA-Z]/.test(line)) break;
    if (!inPaths) continue;
    const p = line.match(/^  (\/[^:]+):\s*$/);
    const m = line.match(/^    (get|post|patch|put|delete|head|options):/);
    if (p) { endpoint = p[1]; operation = null; }
    if (m) {
      method = m[1].toUpperCase();
      operation = { method, path: endpoint, operationId: null, file: specFile, line: i + 1 };
      operations.push(operation);
    }
    const id = line.match(/^      operationId:\s*(\S+)/);
    if (id && operation) operation.operationId = id[1];
  }
  const routes = [];
  for (const file of files(path.join(base, "artifacts/api-server/src/routes")).filter(p => p.endsWith(".ts"))) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(/\b(?:router|\w+Router)\.(get|post|put|patch|delete|head|options)\(\s*["'`]([^"'`]+)["'`]/g)) {
      routes.push({ method: m[1].toUpperCase(), path: m[2],
        file: slash(path.relative(base, file)), line: text.slice(0, m.index).split("\n").length,
        middlewareHint: text.slice(m.index, m.index + 450).match(/requireAuthentication|sameOriginMutation|requireOperator|requireCustomer|requireOwner/g) ?? [] });
    }
  }
  return { operations, routes, caveat: "Static route declarations. Parent router guards must be reviewed; absence of an inline guard does not establish anonymous access." };
}
function dependencies(base) {
  return ["package.json", ...["artifacts", "lib", "scripts"].flatMap(p => files(path.join(base, p)))
    .filter(p => p.endsWith("/package.json") && !/\/(?:node_modules|dist)\//.test(slash(p)))]
    .map(file => path.isAbsolute(file) ? file : path.join(base, file))
    .filter(fs.existsSync).flatMap(file => {
      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      return ["dependencies", "devDependencies", "peerDependencies"].flatMap(kind =>
        Object.entries(pkg[kind] ?? {}).map(([name, version]) =>
          ({ package: pkg.name, file: slash(path.relative(base, file)), kind, name, version })));
    });
}
function environment(base) {
  const names = new Map();
  for (const file of sourceFiles(base)) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(/(?:process\.env\.|import\.meta\.env\.)([A-Z][A-Z0-9_]+)|(?:process\.env|import\.meta\.env)\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g)) {
      const name = m[1] || m[2];
      const occurrences = names.get(name) ?? new Set();
      occurrences.add(slash(path.relative(base, file)));
      names.set(name, occurrences);
    }
  }
  return [...names.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([name, occurrences]) => ({ name, files: [...occurrences],
      exposure: name.startsWith("VITE_") || /^(BASE_URL|DEV|MODE|PROD|SSR)$/.test(name)
        ? "browser-visible/Vite built-in: never secret" : "server/tooling",
      category: /DATABASE_URL|CLERK.*KEY/.test(name) ? "required platform authentication/database" :
        /PRIVATE_OBJECT_DIR/.test(name) ? "required for configured storage features" :
        /^(BASE_URL|DEV|MODE|PROD|SSR)$/.test(name) ? "Vite built-in, not a user-provided secret" :
        /NODE_ENV|PORT|BASE_PATH|REPLIT|CI|LOG_LEVEL/.test(name) ? "runtime/development/deployment" : "feature-dependent optional; inspect consumers" }));
}
function fingerprint(base) {
  return sourceFiles(base).map(file => ({ file: slash(path.relative(base, file)),
    sha256: hash(fs.readFileSync(file)) })).sort((a, b) => a.file.localeCompare(b.file));
}
const p2 = { role: "Project 2 source; active white-label workspace", schemas: schemas(root),
  api: api(root), dependencies: dependencies(root), environment: environment(root),
  fingerprints: fingerprint(root) };
const p1 = { role: "Project 1 QuickXchange; reference only", repository: "https://github.com/quickXchange/QuickXchange-.git",
  commit: execFileSync("git", ["-C", reference, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  schemas: schemas(reference), api: api(reference), dependencies: dependencies(reference),
  environment: environment(reference), fingerprints: fingerprint(reference) };
const p1Tables = new Map(p1.schemas.map(t => [t.name, t]));
const database = p2.schemas.map(t => ({ sourceTable: t.name, sourceFile: t.file,
  target: `white_label.${t.name}`, tenantScoped: t.tenantScoped,
  collision: p1Tables.has(t.name), project1File: p1Tables.get(t.name)?.file ?? null,
  action: p1Tables.has(t.name) ? "ADAPT; isolate in new schema, never replace Project 1 table" : "ADAPT into new white_label schema" }));
const p1Operations = new Set(p1.api.operations.map(o => `${o.method} ${o.path}`));
const apiMap = p2.api.operations.map(o => ({ ...o, target: `/api/white-label${o.path}`,
  collision: p1Operations.has(`${o.method} ${o.path}`),
  action: "ADAPT; prefix paths and generated operation/schema names; retain existing Project 1 API" }));
const canonicalPath = value => value.replace(/\{[^}]+\}|:[A-Za-z_]\w*/g, "{}");
const specifiedRoutes = new Set(p2.api.operations.map(o => `${o.method} ${canonicalPath(o.path)}`));
const extraRoutes = p2.api.routes.filter(o => !specifiedRoutes.has(`${o.method} ${canonicalPath(o.path)}`));
const modelNames = base => [...fs.readFileSync(path.join(base, "lib/api-spec/openapi.yaml"), "utf8")
  .split("\ncomponents:")[1].matchAll(/^    (\w+):/gm)].map(m => m[1]);
const models1 = new Set(modelNames(reference));
const modelCollisions = modelNames(root).filter(name => models1.has(name));
const names1 = new Map();
for (const d of p1.dependencies) names1.set(d.name, [...new Set([...(names1.get(d.name) ?? []), d.version])]);
const dependencyMap = p2.dependencies.map(d => ({ ...d, project1Versions: names1.get(d.name) ?? [],
  action: d.name.startsWith("@workspace/") ? "Adapt workspace identity/imports; do not overwrite packages" :
    names1.has(d.name) ? "Reuse Project 1 dependency after API/version compatibility verification" : "Review isolated module requirement; no automatic installation" }));
const csv = rows => {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const cell = x => `"${String(typeof x === "object" && x !== null ? JSON.stringify(x) : x ?? "").replaceAll('"', '""')}"`;
  return keys.map(cell).join(",") + "\n" + rows.map(row => keys.map(k => cell(row[k])).join(",")).join("\n") + "\n";
};
const write = (name, value) => fs.writeFileSync(path.join(output, name),
  name.endsWith(".json") ? JSON.stringify(value, null, 2) + "\n" : value);
write("project2.json", p2); write("project1-reference.json", p1);
write("database-map.csv", csv(database)); write("api-map.csv", csv(apiMap));
write("extra-routes.csv", csv(extraRoutes.map(o => ({ ...o, target: `/api/white-label${o.path}` }))));
write("source-routes.csv", csv(p2.api.routes)); write("dependency-map.csv", csv(dependencyMap));
write("project2-environment.csv", csv(p2.environment)); write("project1-environment.csv", csv(p1.environment));
const summary = { generatedAt: new Date().toISOString(), referenceCommit: p1.commit,
  project2: { tables: p2.schemas.length, apiOperations: p2.api.operations.length,
    routeDeclarations: p2.api.routes.length, dependencies: p2.dependencies.length, environmentNames: p2.environment.length },
  project1: { tables: p1.schemas.length, apiOperations: p1.api.operations.length,
    routeDeclarations: p1.api.routes.length, dependencies: p1.dependencies.length, environmentNames: p1.environment.length },
  tableCollisions: database.filter(t => t.collision).map(t => t.sourceTable),
  apiCollisions: apiMap.filter(a => a.collision).map(a => `${a.method} ${a.path}`),
  schemaNameCollisions: modelCollisions, extraRouteCount: extraRoutes.length,
  noRuntimeWrites: true, noDatabaseAccess: true, noProject1Writes: true,
  limitations: ["No private/live Project 1 database, Secrets or service status was inspected.",
    "Runtime/provider readiness is not proven by source presence.",
    "Static env scan excludes secret files and may miss dynamically constructed variable names.",
    "Source declarations do not prove live database schema parity.",
    "Detailed feature-by-feature treatment and security gates are in ../project2-feature-inventory.md and ../migration-plan.md."] };
write("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));

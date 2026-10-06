import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const dir = path.join(root, "docs/migration");
const inv = path.join(dir, "inventory");
const readJSON = name => JSON.parse(fs.readFileSync(path.join(inv, name), "utf8"));
const source = readJSON("project2.json");
const reference = readJSON("project1-reference.json");
const summary = readJSON("summary.json");
function csv(name) {
  const text = fs.readFileSync(path.join(inv, name), "utf8");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) { row.push(field); field = ""; }
    else if (c === "\n" && !quoted) { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  assert.equal(quoted, false, `${name}: unclosed CSV field`);
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.filter(r => r.some(Boolean)).map(r => {
    assert.equal(r.length, headers.length, `${name}: inconsistent row shape`);
    return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  });
}
const unique = (values, label) => assert.equal(new Set(values).size, values.length, `${label}: duplicate entries`);
const opKey = o => `${o.method} ${o.path}`;
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const requiredDocs = ["README.md", "project2-feature-inventory.md", "project1-architecture.md",
  "compatibility-and-conflicts.md", "migration-plan.md", "asset-and-environment-plan.md",
  "security-and-validation.md", "implementation-checklist.md"];
for (const file of requiredDocs) assert.ok(fs.statSync(path.join(dir, file)).size > 100, `Missing document: ${file}`);
for (const [project, counts] of [[source, summary.project2], [reference, summary.project1]]) {
  assert.equal(project.schemas.length, counts.tables);
  assert.equal(project.api.operations.length, counts.apiOperations);
  assert.equal(project.api.routes.length, counts.routeDeclarations);
  assert.equal(project.dependencies.length, counts.dependencies);
  assert.equal(project.environment.length, counts.environmentNames);
  unique(project.schemas.map(t => t.name), `${project.role} tables`);
  unique(project.api.operations.map(opKey), `${project.role} operations`);
  unique(project.api.operations.map(o => o.operationId), `${project.role} operation IDs`);
  assert.ok(project.api.operations.every(o => o.operationId && o.path && o.method));
}
const databaseMap = csv("database-map.csv");
assert.equal(databaseMap.length, source.schemas.length);
unique(databaseMap.map(t => t.sourceTable), "Database map");
for (const table of source.schemas) {
  const mapped = databaseMap.find(t => t.sourceTable === table.name);
  assert.ok(mapped, `Unmapped source table ${table.name}`);
  assert.equal(mapped.target, `white_label.${table.name}`);
  assert.ok(mapped.action.startsWith("ADAPT"));
}
const apiMap = csv("api-map.csv");
assert.equal(apiMap.length, source.api.operations.length);
unique(apiMap.map(opKey), "API map");
for (const operation of source.api.operations) {
  const mapped = apiMap.find(o => opKey(o) === opKey(operation));
  assert.ok(mapped, `Unmapped API ${opKey(operation)}`);
  assert.equal(mapped.target, `/api/white-label${operation.path}`);
}
const extras = csv("extra-routes.csv");
assert.equal(extras.length, summary.extraRouteCount);
const canonical = p => p.replace(/\{[^}]+\}|:[A-Za-z_]\w*/g, "{}");
const mappedKeys = new Set([...apiMap, ...extras].map(o => `${o.method} ${canonical(o.path)}`));
for (const route of source.api.routes) {
  assert.ok(mappedKeys.has(`${route.method} ${canonical(route.path)}`), `Unmapped Express route ${opKey(route)}`);
}
assert.equal(csv("dependency-map.csv").length, source.dependencies.length);
assert.equal(csv("project2-environment.csv").length, source.environment.length);
assert.equal(csv("project1-environment.csv").length, reference.environment.length);
assert.equal(reference.commit, summary.referenceCommit);
assert.match(reference.commit, /^[a-f0-9]{40}$/);
const referenceTables = new Set(reference.schemas.map(t => t.name));
assert.deepEqual(summary.tableCollisions, source.schemas.filter(t => referenceTables.has(t.name)).map(t => t.name));
assert.ok(databaseMap.filter(t => t.collision === "true").every(t => t.target.startsWith("white_label.")));
for (const entry of source.fingerprints) {
  const filename = path.resolve(root, entry.file);
  assert.ok(filename.startsWith(root + path.sep), "Fingerprint path outside source");
  assert.equal(sha(fs.readFileSync(filename)), entry.sha256, `Source changed since audit: ${entry.file}`);
}
const referenceArg = process.argv.indexOf("--reference");
if (referenceArg >= 0) {
  const base = path.resolve(process.argv[referenceArg + 1]);
  assert.equal(execFileSync("git", ["-C", base, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), reference.commit);
  for (const entry of reference.fingerprints) {
    const filename = path.resolve(base, entry.file);
    assert.ok(filename.startsWith(base + path.sep), "Reference fingerprint path outside checkout");
    assert.equal(sha(fs.readFileSync(filename)), entry.sha256, `Reference changed since audit: ${entry.file}`);
  }
}
const catalog = JSON.parse(fs.readFileSync(path.join(root, "artifacts/api-server/src/products/exchange/visual-catalog.json")));
assert.equal(catalog.blobs.length, 241, "Update artwork inventory if catalog changed");
assert.equal(catalog.assets.length, 424, "Update artwork identity inventory if catalog changed");
assert.equal(catalog.unavailable.length, 10, "Update unavailable artwork inventory if catalog changed");
unique(catalog.blobs.map(b => b.filename), "Original artwork blobs");
assert.ok(catalog.blobs.every(b => /^[a-f0-9]{64}\.(?:svg|png|webp|jpg|jpeg)$/.test(b.filename)));

const escape = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const inline = text => escape(text).replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
function markdown(text) {
  const blocks = [], lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("```")) {
      const code = [];
      while (++i < lines.length && !lines[i].startsWith("```")) code.push(lines[i]);
      blocks.push(`<pre><code>${escape(code.join("\n"))}</code></pre>`); continue;
    }
    const heading = line.match(/^(#{1,6}) (.+)$/);
    if (heading) { const level = Math.min(heading[1].length + 1, 6); blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue; }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        if (!cells.every(c => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      blocks.push(`<div class="table-wrap"><table>${rows.map((r, j) => `<tr>${r.map(c =>
        `<${j === 0 ? "th" : "td"}>${inline(c)}</${j === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</table></div>`); continue;
    }
    if (/^[-+] /.test(line) || /^\d+\. /.test(line)) {
      blocks.push(`<p class="list">${inline(line)}</p>`); continue;
    }
    blocks.push(`<p>${inline(line)}</p>`);
  }
  return blocks.join("\n");
}
const downloads = fs.readdirSync(inv).filter(f => /\.(?:csv|json)$/.test(f)).sort();
const dataLinks = downloads.map(file => {
  const mime = file.endsWith(".csv") ? "text/csv" : "application/json";
  return `<a download="${escape(file)}" href="data:${mime};base64,${fs.readFileSync(path.join(inv, file)).toString("base64")}">${escape(file)}</a>`;
}).join("");
const contents = requiredDocs.map((file, i) =>
  `<section id="document-${i}">${markdown(fs.readFileSync(path.join(dir, file), "utf8"))}</section>`).join("");
const nav = requiredDocs.map((file, i) =>
  `<a href="#document-${i}">${escape(file.replace(/\.md$/, "").replaceAll("-", " "))}</a>`).join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Project 2 White-label Migration Handoff</title>
<style>*{box-sizing:border-box}body{margin:0;color:#1b263b;background:#f5f7fb;font:16px/1.6 system-ui,sans-serif}
header{background:#14213d;color:white;padding:48px max(24px,calc((100vw - 1200px)/2))}
h1{font-size:36px;line-height:1.15;margin:0 0 18px}header p{max-width:900px;color:#d6deec}
.status{display:inline-block;padding:5px 12px;border:1px solid #a7bce1;border-radius:6px;font-size:13px}
main{max-width:1248px;margin:auto;padding:24px}nav,.downloads{display:flex;gap:10px;flex-wrap:wrap}
a{color:#244faf}nav a,.downloads a{border:1px solid #c8d4e7;background:#fff;padding:7px 12px;border-radius:5px;text-decoration:none;font-size:14px}
section{padding:26px;background:#fff;margin:24px 0;border:1px solid #dce3ee;border-radius:8px;scroll-margin-top:20px}
h2{font-size:29px;line-height:1.3;margin-top:0}h3{font-size:23px;margin:30px 0 12px}h4{font-size:19px}
code{font:13px/1.5 ui-monospace,monospace;background:#edf2f9;padding:2px 5px;border-radius:3px;overflow-wrap:anywhere}
pre{white-space:pre-wrap;background:#edf2f9;padding:18px;border-radius:5px}pre code{padding:0}
.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5}
th,td{text-align:left;vertical-align:top;border:1px solid #dbe3ee;padding:10px}th{background:#edf2f9;font-weight:650}
.list{padding-left:15px;margin:8px 0}footer{font-size:13px;color:#596b85;padding:20px 0}
@media(max-width:600px){header{padding:30px 20px}h1{font-size:29px}main{padding:14px}section{padding:18px}h2{font-size:24px}}
@media print{nav,.downloads{display:none}body{background:white}section{break-inside:auto}header{color:#14213d;background:white;padding:20px}header p{color:#34435b}}
</style></head><body><header><span class="status">AUDIT COMPLETE · DESTINATION IMPLEMENTATION NOT PERFORMED</span>
<h1>Project 2 White-label Migration Handoff</h1>
<p>This workspace is the white-label source. QuickXchange is the Project 1 reference. All nine prerequisite outputs are prepared; existing applications, customer data and Production are unchanged.</p>
<p>Project 2: ${summary.project2.tables} tables · ${summary.project2.apiOperations} typed API operations · ${summary.extraRouteCount} extra routes.<br>
Project 1: ${summary.project1.tables} tables · ${summary.project1.apiOperations} typed API operations.</p></header>
<main><nav>${nav}</nav><section><h2>Machine-readable inventories and maps</h2>
<p>Download individual files below. All data is embedded in this document; no source-project connection is required. Environment inventories contain names only.</p>
<div class="downloads">${dataLinks}</div></section>${contents}
<footer>Generated ${escape(summary.generatedAt)} · Reference revision ${escape(summary.referenceCommit)}.<br>
Static source audit only. No database/provider execution, customer-file transfer, destination merge or publishing.</footer></main></body></html>`;
const report = path.join(root, "exports/project2-white-label-migration-handoff.html");
fs.mkdirSync(path.dirname(report), { recursive: true });
fs.writeFileSync(report, html);
console.log(`Validated: ${databaseMap.length} tables, ${apiMap.length} OpenAPI operations, ${extras.length} extra routes; documents, dependency/environment maps, source hashes and artwork counts match.`);
console.log(`Report: ${path.relative(root, report)} (${Buffer.byteLength(html)} bytes).`);

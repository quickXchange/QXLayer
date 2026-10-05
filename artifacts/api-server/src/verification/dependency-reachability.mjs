// Development-only dependency exposure checks. Not imported by the application.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

if (process.env.NODE_ENV === "production") throw new Error("Development-only verification.");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const proxySource = await readFile(new URL("../middlewares/clerkProxyMiddleware.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("proxy.ts", proxySource, ts.ScriptTarget.Latest, true);
let proxyCalls = 0;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "createProxyMiddleware") {
    proxyCalls++;
    const options = node.arguments[0];
    assert.ok(ts.isObjectLiteralExpression(options), "Reassess dynamic proxy options.");
    assert.ok(!options.properties.some(ts.isSpreadAssignment), "Reassess spread proxy options.");
    const names = options.properties.map(p => p.name?.getText(ast));
    assert.ok(!names.includes("pathFilter"), "Reassess newly configured glob filtering.");
    assert.ok(!names.includes("router"), "Reassess dynamic proxy routing.");
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(proxyCalls, 1);
assert.match(proxySource, /const CLERK_PROXY_PATH = '\/api\/__clerk';/);
assert.match(proxySource, /path\.replace\(new RegExp\(`\^\$\{CLERK_PROXY_PATH\}`\), ''\)/);

const previewSource = await readFile(new URL("../../../mockup-sandbox/mockupPreviewPlugin.ts", import.meta.url), "utf8");
assert.match(previewSource, /const MOCKUPS_DIR = "src\/components\/mockups";/);
assert.match(previewSource, /await glob\(`\$\{MOCKUPS_DIR\}\/\*\*\/\*\.tsx`,/);
assert.equal((previewSource.match(/\bglob\(/g) ?? []).length, 1);

const hpmEntry = require.resolve("http-proxy-middleware");
const hpmRequire = createRequire(hpmEntry);
const mmRequire = createRequire(hpmRequire.resolve("micromatch"));
const bracesEntry = mmRequire.resolve("braces");
const bracesOriginal = mmRequire("braces");
const bracesModule = require.cache[bracesEntry];
let bracesCalls = 0;
const blockedBraces = () => {
  bracesCalls++;
  throw new Error("Unexpected brace pattern processing in the plain proxy filter.");
};
const instrumentedBraces = Object.assign(blockedBraces, bracesOriginal);
for (const key of Object.keys(bracesOriginal)) {
  if (typeof bracesOriginal[key] === "function") instrumentedBraces[key] = blockedBraces;
}
bracesModule.exports = instrumentedBraces;
try {
  const { matchPathFilter } = await import(new URL("./path-filter.js", pathToFileURL(hpmEntry)));
  const nested = "{".repeat(10000) + "input" + "}".repeat(10000);
  for (const uri of ["/v1/client", "/" + nested, "/" + encodeURIComponent(nested), "/v1/client?pattern=" + nested]) {
    // Exactly the omitted pathFilter used by the application's static proxy options.
    assert.equal(matchPathFilter(undefined, uri, {}), true);
  }
  assert.equal(bracesCalls, 0);
} finally {
  bracesModule.exports = bracesOriginal;
}
console.log("PASS braces: static proxy options, constant preview patterns, four untrusted URL variants, zero brace-parser calls.");

const storageRequire = createRequire(require.resolve("@google-cloud/storage"));
const authRequire = createRequire(storageRequire.resolve("google-auth-library"));
const chain = [
  storageRequire,
  authRequire,
  createRequire(authRequire.resolve("gcp-metadata")),
  createRequire(authRequire.resolve("gtoken")),
];
const gaxiosEntries = chain.map(r => r.resolve("gaxios"));
assert.equal(new Set(gaxiosEntries).size, 1, "Reassess additional HTTP client versions.");
const gaxiosEntry = gaxiosEntries[0];
const gaxiosRequire = createRequire(gaxiosEntry);
const uuidEntry = gaxiosRequire.resolve("uuid");
const uuidOriginal = gaxiosRequire("uuid");
const uuidModule = require.cache[uuidEntry];
const gaxiosSource = await readFile(new URL("./gaxios.js", pathToFileURL(gaxiosEntry)), "utf8");
const methods = [...gaxiosSource.matchAll(/\buuid_1\.(v\d+)\b/g)].map(m => m[1]);
assert.deepEqual(methods, ["v4"], "Reassess new UUID functions in gaxios.");
let v4Calls = 0, affectedCalls = 0;
uuidModule.exports = new Proxy(uuidOriginal, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (["v3", "v5", "v6"].includes(property) && typeof value === "function") {
      return () => { affectedCalls++; throw new Error("Affected UUID method reached."); };
    }
    if (property === "v4") {
      return (...args) => {
        v4Calls++;
        assert.equal(args.length, 0, "Reassess caller-supplied UUID buffers.");
        return value(...args);
      };
    }
    return value;
  },
});
try {
  const { Gaxios } = gaxiosRequire(gaxiosEntry);
  const client = new Gaxios();
  let body = "", contentType = "";
  const response = await client.request({
    url: "https://example.invalid/dependency-verification",
    method: "POST",
    multipart: [{ headers: { "Content-Type": "text/plain" }, content: "Private file test payload" }],
    // Exercise the real request serializer without network access or credentials.
    adapter: async options => {
      contentType = options.headers["Content-Type"];
      for await (const chunk of options.body) body += chunk.toString();
      return { config: options, data: "verified", status: 200, statusText: "OK", headers: {} };
    },
  });
  assert.equal(response.status, 200);
  assert.match(contentType, /^multipart\/related; boundary=[0-9a-f-]{36}$/);
  assert.ok(body.includes("Private file test payload"));
  assert.equal(v4Calls, 1);
  assert.equal(affectedCalls, 0);
} finally {
  uuidModule.exports = uuidOriginal;
}
console.log("PASS uuid: all four storage/auth paths share the inspected gaxios; real multipart serializer called v4() once without buffers; zero affected-method calls.");

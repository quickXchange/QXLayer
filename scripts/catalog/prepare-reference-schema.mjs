// Carry the original immutable reference data forward; do not recapture Admin edits.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
const file="deploy/configuration/vynox-reference.json";
const original=JSON.parse(execFileSync("git",["show","HEAD:"+file],{encoding:"utf8"}));
assert.equal(original.version,1,"This reviewed transition is specifically reference schema 1→2.");
assert.equal(createHash("sha256").update(JSON.stringify(original.data)).digest("hex"),original.dataSha256);
const schema=JSON.parse(await readFile("deploy/migrations/schema-reference.json","utf8"));
assert.equal(new Set(schema.columns.map(c=>c.table_name)).size,44);
const payload={...original,version:2,schema};
await writeFile(file,JSON.stringify(payload,null,2)+"\n");
console.log(JSON.stringify({version:2,referenceDataUnchanged:true,approvedAdditiveTables:2,dataSha256:payload.dataSha256}));

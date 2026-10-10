import test from "node:test";
import assert from "node:assert/strict";
import { supabaseObject } from "./private-object-storage";
import { connectionOptions, runtimeRole } from "../../../../lib/db/src/connection-options";
import { assertExternalEnvironment } from "./external-environment";
import { applicationTableNames } from "../../../../lib/db/src/schema-table-names";
import reference from "../../../../deploy/migrations/rls-reference.json";

test("Existing Replit database defaults stay unchanged; external runtime fails closed", () => {
  assert.deepEqual(applicationTableNames().sort(),reference.tables.map(t=>t.name).sort(),"Code table coverage requires matching reviewed migrations.");
  const env = {DATABASE_URL:"postgresql://synthetic@localhost/disposable"};
  assert.deepEqual(connectionOptions(env), {connectionString:env.DATABASE_URL});
  assert.equal(runtimeRole(env),"pg_database_owner");
  assert.equal(runtimeRole({QXLAYER_DATABASE_PROVIDER:"supabase"}),"qxlayer_runtime");
  assert.throws(()=>connectionOptions({...env,QXLAYER_DATABASE_PROVIDER:"supabase"}));
  assert.throws(()=>runtimeRole({QXLAYER_DATABASE_PROVIDER:"unknown"}));
  assert.doesNotThrow(()=>assertExternalEnvironment({}));
  assert.throws(()=>assertExternalEnvironment({QXLAYER_DATABASE_PROVIDER:"supabase"}));
});
test("Private storage adapter retains object keys, refuses overwrite and uses bucket delete API", async () => {
  const calls: {url:string;init?:Parameters<typeof fetch>[1]}[] = [];
  const env = {SUPABASE_STORAGE_URL:"https://syntheticproject.supabase.co",
    SUPABASE_STORAGE_BUCKET:"qxlayer-private",SUPABASE_STORAGE_SERVICE_KEY:"synthetic-service-test-only"};
  const fetcher = (async (url,init) => {
    calls.push({url:String(url),init});
    return new Response(init?.method==="GET" ? "synthetic-file" : "{}",{status:200});
  }) as typeof fetch;
  const key = "white-label-orders/synthetic-owner/synthetic-object";
  const file = supabaseObject(key,env,fetcher);
  await file.save(Buffer.from("synthetic-file"),{metadata:{contentType:"text/plain"},preconditionOpts:{ifGenerationMatch:0}});
  assert.ok(calls[0].url.endsWith(`/storage/v1/object/qxlayer-private/${key}`));
  assert.equal((calls[0].init?.headers as Record<string,string>)["x-upsert"],"false");
  assert.deepEqual((await file.download())[0],Buffer.from("synthetic-file"));
  await file.delete({ignoreNotFound:true});
  assert.equal(calls[2].url,"https://syntheticproject.supabase.co/storage/v1/object/qxlayer-private");
  assert.deepEqual(JSON.parse(calls[2].init?.body as string),{prefixes:[key]});
  assert.throws(()=>supabaseObject("../escape",env,fetcher));
  assert.throws(()=>supabaseObject(key,{...env,SUPABASE_STORAGE_URL:"https://untrusted.invalid"},fetcher));
  const missing = supabaseObject(key,env,(async()=>new Response(null,{status:404})) as typeof fetch);
  assert.deepEqual(await missing.exists(),[false]);
  await assert.rejects(missing.download());
});

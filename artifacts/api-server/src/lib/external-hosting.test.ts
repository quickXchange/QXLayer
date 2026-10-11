import test from "node:test";
import assert from "node:assert/strict";
import { supabaseObject } from "./private-object-storage";
import { connectionOptions, runtimeRole } from "../../../../lib/db/src/connection-options";
import { assertExternalEnvironment } from "./external-environment";
import { applicationTableNames } from "../../../../lib/db/src/schema-table-names";
import reference from "../../../../deploy/migrations/rls-reference.json";
import { clerkProxyMiddleware } from "../middlewares/clerkProxyMiddleware";

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

test("Staging NODE_ENV=production accepts only test keys; Production behavior stays unchanged", () => {
  const host = "synthetic.clerk.accounts.dev";
  const base = { QXLAYER_DATABASE_PROVIDER: "supabase", QXLAYER_EXTERNAL_STARTUP_APPROVED: "true",
    NODE_ENV: "production", QXLAYER_STORAGE_PROVIDER: "supabase", QXLAYER_HEALTH_MONITOR_MODE: "disabled",
    PRODUCTION_ACCESS_GATE_ENABLED: "true", CLERK_AUTHORIZED_PARTIES: "https://stage.example.invalid",
    SESSION_SECRET: "synthetic", PRODUCTION_ACCESS_CODE: "synthetic",
    QXLAYER_PLATFORM_URL: "https://stage.example.invalid",
    SUPABASE_STORAGE_URL: "https://synthetic.supabase.co", SUPABASE_STORAGE_BUCKET: "synthetic",
    SUPABASE_STORAGE_SERVICE_KEY: "synthetic", DATABASE_URL: "postgresql://test@db.synthetic.supabase.co/postgres" };
  const staging = { ...base, QXLAYER_EXTERNAL_ENVIRONMENT: "staging",
    CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from(`${host}$`).toString("base64")}`,
    CLERK_SECRET_KEY: "sk_test_synthetic", QXLAYER_CLERK_DEVELOPMENT_HOST: host };
  assert.doesNotThrow(() => assertExternalEnvironment(staging));
  assert.throws(() => assertExternalEnvironment({ ...staging, CLERK_SECRET_KEY: "sk_live_synthetic" }));
  assert.throws(() => assertExternalEnvironment({ ...staging, CLERK_AUTHORIZED_PARTIES: "https://wrong.invalid" }));
  assert.throws(() => assertExternalEnvironment({ ...staging, QXLAYER_EXTERNAL_ENVIRONMENT: "typo" }));
  const production = { ...base, CLERK_PUBLISHABLE_KEY: "pk_live_synthetic", CLERK_SECRET_KEY: "sk_live_synthetic",
    CLERK_PROXY_PUBLIC_URL: "https://stage.example.invalid/api/__clerk" };
  assert.doesNotThrow(() => assertExternalEnvironment(production));
  assert.throws(() => assertExternalEnvironment({ ...production, CLERK_SECRET_KEY: "sk_test_synthetic" }));
  assert.throws(() => assertExternalEnvironment({ ...production, CLERK_PROXY_PUBLIC_URL: undefined }));
});

test("External Staging does not construct the Production Clerk proxy", () => {
  const before = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: "production", QXLAYER_DATABASE_PROVIDER: "supabase",
      QXLAYER_EXTERNAL_ENVIRONMENT: "staging", CLERK_SECRET_KEY: "sk_test_synthetic" });
    let passed = false;
    clerkProxyMiddleware()({} as never, {} as never, (() => { passed = true; }) as never);
    assert.equal(passed, true);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});

import assert from "node:assert/strict";
import { pool, withDatabase } from "@workspace/db";
if (process.env.NODE_ENV !== "development" || !process.argv.includes("--development-only"))
  throw Error("Explicit Development-only verification required.");
try {
  const identity = await pool.query("SELECT current_database() AS db");
  assert.equal(identity.rows[0].db, "heliumdb");
  await withDatabase({ actorId: "qxlayer-performance-synthetic-nonmember" }, async c => {
    const flags = await c.query("SELECT current_user,rolsuper,rolbypassrls,current_setting('row_security') AS rls FROM pg_roles WHERE rolname=current_user");
    assert.equal(flags.rows[0].current_user,"pg_database_owner");
    assert.equal(flags.rows[0].rolsuper,false);assert.equal(flags.rows[0].rolbypassrls,false);
    assert.equal(flags.rows[0].rls,"on");
    assert.equal((await c.query("SELECT id FROM tenants")).rowCount,0);
    assert.equal((await c.query("SELECT tenant_id FROM tenant_branding")).rowCount,0);
  });
  await assert.rejects(withDatabase({actorId:"qxlayer-performance-synthetic-nonmember"},c=>
    c.query("UPDATE tenant_branding SET brand_name=brand_name WHERE false")),e=>(e as {code?:string}).code==="25006");
  const clean=await pool.connect();
  try {
    const result=await clean.query("SELECT current_setting('app.actor_id',true) AS actor,current_setting('app.tenant_id',true) AS tenant,current_setting('app.can_write',true) AS write");
    assert.ok(!result.rows[0].actor);assert.ok(!result.rows[0].tenant);assert.notEqual(result.rows[0].write,"true");
  } finally {clean.release();}
  console.log("Development read-only check passed: restricted role, RLS row denial, write denial and pool context cleanup; no rows modified.");
} finally {await pool.end();}

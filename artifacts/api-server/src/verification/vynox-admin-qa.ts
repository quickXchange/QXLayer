/** Exact disposable Development fixture; never mutates existing identities/roles. */
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { pool, withDatabase } from "@workspace/db";
if (process.env.NODE_ENV !== "development" || process.env.QXLAYER_DATABASE_PROVIDER === "supabase" ||
    process.env.QXLAYER_OWNED_AUTH_QA_APPROVED !== "true") throw Error("Development QA only.");
const file = new URL("../../../../generated-artifacts/vynox-admin-qa.json", import.meta.url);
const c = await pool.connect();
try {
  if (process.argv.includes("--cleanup")) {
    const s = JSON.parse(await readFile(file, "utf8"));
    if (!s.id || s.actor !== `owned:${s.id}` || !s.email?.endsWith("@vynox-qa.invalid")) throw Error("Invalid QA scope.");
    await withDatabase({ actorId: s.actor, isSuperAdmin: true, canWrite: true }, async db => {
      const business = await db.query(`SELECT EXISTS(SELECT 1 FROM white_label_requests WHERE customer_user_id=$1)
        OR EXISTS(SELECT 1 FROM tenant_memberships WHERE clerk_user_id=$1) AS used`, [s.actor]);
      if (business.rows[0].used) throw Error("QA fixture has business data; cleanup refused.");
      await db.query("DELETE FROM platform_admins WHERE clerk_user_id=$1", [s.actor]);
    });
    await c.query(`DELETE FROM qxlayer_auth."user" WHERE id=$1 AND email=$2`, [s.id, s.email]);
    await unlink(file);
    console.log("Exact disposable administrator and auth fixture removed.");
  } else {
    try { await readFile(file); throw Error("Existing QA scope must be cleaned first."); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    const id = randomUUID(), password = `QA-only-${randomUUID()}`;
    const email = `${id}@vynox-qa.invalid`, actor = `owned:${id}`;
    await mkdir(new URL("../../../../generated-artifacts/", import.meta.url), { recursive: true });
    await writeFile(file, JSON.stringify({ id, actor, email, password }), { mode: 0o600 });
    await c.query("BEGIN");
    await c.query(`INSERT INTO qxlayer_auth."user" (id,name,email,"emailVerified") VALUES ($1,'VYNOX LAYER QA', $2,true)`, [id,email]);
    await c.query(`INSERT INTO qxlayer_auth.account (id,"accountId","userId","providerId",password) VALUES ($1,$2,$2,'credential',$3)`,
      [randomUUID(),id,await hashPassword(password)]);
    await c.query("COMMIT");
    await withDatabase({ actorId: actor, isSuperAdmin: true, canWrite: true }, db =>
      db.query("INSERT INTO platform_admins(clerk_user_id,active) VALUES($1,true)", [actor]));
    console.log("Disposable Development admin ready; credentials are only in ignored QA scope.");
  }
} finally { c.release(); await pool.end(); }

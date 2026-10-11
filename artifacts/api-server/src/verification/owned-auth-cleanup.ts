import { readFile, unlink } from "node:fs/promises";
import { clerkClient } from "@clerk/express";
import { pool, withDatabase } from "@workspace/db";

if (process.env.NODE_ENV !== "development" || process.env.QXLAYER_DATABASE_PROVIDER === "supabase" ||
    process.env.QXLAYER_OWNED_AUTH_QA_APPROVED !== "true") throw Error("Tracked Development QA cleanup only.");
const path = new URL("../../../../generated-artifacts/owned-auth-qa-scope.json", import.meta.url);
const scope = JSON.parse(await readFile(path, "utf8"));
if (scope.environment !== "development" || typeof scope.legacySubject !== "string" ||
    typeof scope.authUserId !== "string") throw Error("Exact disposable identity scope is required.");
const c = await pool.connect();
try {
  await c.query("BEGIN");
  const links = await c.query(`SELECT auth_user_id FROM qxlayer_auth.identity_link
    WHERE auth_user_id=$1 AND business_id=$2 AND proof_subject=$2`, [scope.authUserId, scope.legacySubject]);
  const localExists = await c.query(`SELECT id FROM qxlayer_auth."user" WHERE id=$1`, [scope.authUserId]);
  if (links.rowCount !== 1 && localExists.rowCount !== 0) throw Error("Tracked fixture does not match its recorded identity link.");
  const business = await withDatabase({ actorId: scope.legacySubject, isSuperAdmin: true }, client =>
    client.query(`SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE clerk_user_id=$1)
      OR EXISTS(SELECT 1 FROM public.tenant_memberships WHERE clerk_user_id=$1)
      OR EXISTS(SELECT 1 FROM public.white_label_requests WHERE customer_user_id=$1) AS used`, [scope.legacySubject]));
  if (business.rows[0].used) throw Error("Fixture has business records; automatic cleanup refused.");
  const u = await c.query(`SELECT email FROM qxlayer_auth."user" WHERE id=$1`, [scope.authUserId]);
  await c.query("DELETE FROM qxlayer_auth.verification WHERE value=$1 OR identifier=$2", [scope.authUserId, u.rows[0]?.email ?? ""]);
  await c.query("DELETE FROM qxlayer_auth.identity_link WHERE auth_user_id=$1", [scope.authUserId]);
  await c.query(`DELETE FROM qxlayer_auth."user" WHERE id=$1`, [scope.authUserId]);
  await c.query("COMMIT");
  try { await clerkClient.users.deleteUser(scope.legacySubject); }
  catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  const local = await c.query(`SELECT count(*)::int AS n FROM qxlayer_auth."user" WHERE id=$1`, [scope.authUserId]);
  if (local.rows[0].n !== 0) throw Error("Local cleanup readback failed.");
  try { await clerkClient.users.getUser(scope.legacySubject); throw Error("Legacy test identity still exists."); }
  catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  await unlink(path);
  console.log("Exact disposable owned/legacy identities removed; no business records or roles changed.");
} catch (e) { await c.query("ROLLBACK"); throw e; }
finally { c.release(); await pool.end(); }

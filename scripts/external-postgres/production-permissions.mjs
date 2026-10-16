import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const { Client } = createRequire(new URL("../../lib/db/package.json", import.meta.url))("pg");
export async function verifyProductionPermissions(appOptions, authOptions) {
  const app = new Client(appOptions), auth = new Client(authOptions);
  await app.connect(); await auth.connect();
  const tables = JSON.parse(await readFile(new URL("../../deploy/migrations/rls-reference.json", import.meta.url), "utf8")).tables;
  let assertions = 0;
  try {
    assert.equal((await app.query("SELECT current_user")).rows[0].current_user, "qxlayer_app");
    assert.equal((await auth.query("SELECT current_user")).rows[0].current_user, "qxlayer_auth_app");
    const flags = (await auth.query(`SELECT rolsuper,rolbypassrls,rolinherit,rolcreatedb,rolcreaterole,rolreplication
      FROM pg_roles WHERE rolname=current_user`)).rows[0];
    for (const enabled of Object.values(flags)) { assert.equal(enabled, false); assertions++; }
    const support = await auth.query(`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
      r.rolname<>current_user AS separate_owner,
      has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE') AS allowed,
      (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid AND p.polpermissive AND p.polcmd='*'
       AND p.polroles=ARRAY[(SELECT oid FROM pg_roles WHERE rolname=current_user)]
       AND pg_get_expr(p.polqual,p.polrelid)='true'
       AND pg_get_expr(p.polwithcheck,p.polrelid)='true') AS safe_policy
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner
      WHERE n.nspname='vynox_supabase_auth' AND c.relkind='r' ORDER BY c.relname`);
    assert.equal(support.rowCount,5); assertions++;
    for(const t of support.rows) {
      assert(t.relrowsecurity && t.relforcerowsecurity && t.separate_owner && t.allowed && t.safe_policy===1); assertions++;
    }
    for (const { name } of tables) {
      for (const role of ["anon", "authenticated", "service_role", "qxlayer_app", "qxlayer_auth_app"]) {
        const q = await app.query(`SELECT bool_or(has_table_privilege($1,$2,p)) AS allowed
          FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p`, [role, `public.${name}`]);
        assert.equal(q.rows[0].allowed, false, `Direct public grants forbidden for ${role}/${name}`); assertions++;
      }
    }
    await assert.rejects(app.query("SELECT * FROM vynox_supabase_auth.sessions"), e => e.code === "42501"); assertions++;
    await assert.rejects(auth.query("SELECT * FROM public.tenants"), e => e.code === "42501"); assertions++;
    await assert.rejects(auth.query("SET ROLE qxlayer_runtime"), e => e.code === "42501"); assertions++;
    const a = randomUUID(), b = randomUUID();
    await app.query("BEGIN; SET LOCAL ROLE qxlayer_runtime; SET LOCAL search_path=pg_catalog,public");
    const context = async (tenant, root, write, staff = false) => {
      for (const [key, value] of Object.entries({ "app.tenant_id": tenant, "app.is_super_admin": root,
        "app.can_write": write, "app.tenant_role": "tenant_admin", "app.can_manage_staff": staff }))
        await app.query("SELECT set_config($1,$2,true)", [key, String(value)]);
    };
    await context("", true, true);
    await app.query("INSERT INTO public.tenants(id,name,slug) VALUES($1,'Disposable permission A',$2),($3,'Disposable permission B',$4)",
      [a, `qa-${a}`, b, `qa-${b}`]);
    await app.query("INSERT INTO public.tenant_branding(tenant_id,brand_name) VALUES($1,'Synthetic A'),($2,'Synthetic B')", [a, b]);
    await context(a, false, true);
    const own = await app.query("SELECT tenant_id FROM public.tenant_branding");
    assert.deepEqual(own.rows.map(x => x.tenant_id), [a]); assertions++;
    assert.equal((await app.query("UPDATE public.tenant_branding SET brand_name='Allowed' WHERE tenant_id=$1", [a])).rowCount, 1); assertions++;
    assert.equal((await app.query("UPDATE public.tenant_branding SET brand_name='Denied' WHERE tenant_id=$1", [b])).rowCount, 0); assertions++;
    assert.equal((await app.query("DELETE FROM public.tenant_branding WHERE tenant_id=$1", [b])).rowCount, 0); assertions++;
    await app.query("SAVEPOINT denied_cross_write");
    await assert.rejects(app.query("INSERT INTO public.tenant_domains(tenant_id,domain) VALUES($1,$2)", [b, `qa-${b}.invalid`]), e => e.code === "42501"); assertions++;
    await app.query("ROLLBACK TO SAVEPOINT denied_cross_write");
    await context(b, false, false);
    assert.deepEqual((await app.query("SELECT tenant_id FROM public.tenant_branding")).rows.map(x => x.tenant_id), [b]); assertions++;
    await context("", false, false);
    assert.equal((await app.query("SELECT * FROM public.tenant_branding")).rowCount, 0); assertions++;
    for (const { name } of tables) { await app.query(`SELECT * FROM public."${name}" LIMIT 1`); assertions++; }
    await app.query("ROLLBACK");
    assert.equal((await app.query("SELECT current_user")).rows[0].current_user, "qxlayer_app"); assertions++;
    await auth.query("BEGIN");
    const subject = randomUUID(), digest = "a".repeat(64);
    await auth.query("INSERT INTO vynox_supabase_auth.sessions(digest,subject,envelope,expires_at) VALUES($1,$2,'synthetic-only',now()+interval '1 minute')", [digest, subject]);
    assert.equal((await auth.query("SELECT * FROM vynox_supabase_auth.sessions WHERE digest=$1", [digest])).rowCount, 1); assertions++;
    await auth.query("ROLLBACK");
    return { assertions, realRestrictedLogins: true, directBusinessLoginDenied: true, authPoolIsolated: true,
      anonymousAndForeignTenantDenied: true, ownTenantCrudVerified: true, fixturesRolledBack: true };
  } finally { await app.query("ROLLBACK").catch(() => {}); await auth.query("ROLLBACK").catch(() => {}); await app.end(); await auth.end(); }
}

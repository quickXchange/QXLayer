import type { PoolClient } from "pg";
import { pool } from "./index";
import { applicationTableNames } from "./schema-table-names";

export type DatabaseClient = PoolClient;
export interface DatabaseContext {
  actorId: string;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
  canWrite?: boolean;
  publicSlug?: string;
  publicDomain?: string;
  canManageStaff?: boolean;
}

/**
 * Drop the privileged login to PostgreSQL's built-in, non-bypassing database-owner
 * group inside every request transaction. Server checks remain authoritative for
 * capabilities; RLS independently filters tenant rows. No custom roles or DDL.
 * Read-only requests cannot execute database mutations.
 * ROLLBACK/COMMIT clear the context before the connection returns to the pool.
 */
export async function withDatabase<T>(
  context: DatabaseContext,
  work: (client: DatabaseClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(context.canWrite === true ? "BEGIN" : "BEGIN READ ONLY");
    await client.query("SET LOCAL ROLE pg_database_owner");
    await client.query("SET LOCAL search_path=pg_catalog,public");
    const security = await client.query<{ safe: boolean }>(`
      SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND
        NOT EXISTS (SELECT 1 FROM unnest($1::text[]) names(name)
          LEFT JOIN pg_class c ON c.relname=names.name
            AND c.relnamespace='public'::regnamespace
          WHERE c.oid IS NULL OR NOT c.relrowsecurity OR
            (c.relowner=r.oid AND NOT c.relforcerowsecurity) OR
            EXISTS (SELECT 1 FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) priv(name)
              WHERE NOT has_table_privilege(current_user,c.oid,priv.name)) OR
            (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid)<>2 OR
            (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid AND
              ((p.polname='qx_read' AND p.polcmd='r' AND p.polqual IS NOT NULL) OR
               (p.polname='qx_write' AND p.polcmd='*' AND p.polqual IS NOT NULL AND p.polwithcheck IS NOT NULL
                AND position('app.can_write' in pg_get_expr(p.polqual,p.polrelid))>0
                AND position('app.can_write' in pg_get_expr(p.polwithcheck,p.polrelid))>0)))<>2)
        AS safe FROM pg_roles r WHERE r.rolname=current_user`, [applicationTableNames()]);
    if (!security.rows[0]?.safe) throw new Error("Database isolation is not ready: review the native security migration and built-in role grants before serving requests.");
    await client.query("SET LOCAL row_security=on");
    await client.query(
      `SELECT set_config('app.actor_id', $1, true),
              set_config('app.tenant_id', $2, true),
              set_config('app.is_super_admin', $3, true),
              set_config('app.can_write', $4, true),
              set_config('app.public_slug', $5, true),
              set_config('app.public_domain', $6, true),
              set_config('app.can_manage_staff', $7, true)`,
      [context.actorId, context.tenantId ?? "", String(context.isSuperAdmin === true), String(context.canWrite === true), context.publicSlug ?? "", context.publicDomain ?? "", String(context.canManageStaff === true || context.isSuperAdmin === true)],
    );
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
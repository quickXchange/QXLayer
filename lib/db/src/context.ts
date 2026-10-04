import type { PoolClient } from "pg";
import { pool } from "./index";

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
 * Every runtime request uses a restricted role and transaction-local context.
 * The schema owner connection is reserved for development setup commands.
 * ROLLBACK/COMMIT clear the context before the connection returns to the pool.
 */
export async function withDatabase<T>(
  context: DatabaseContext,
  work: (client: DatabaseClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE private_label_runtime");
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
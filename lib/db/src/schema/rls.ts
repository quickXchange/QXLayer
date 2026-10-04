import { sql } from "drizzle-orm";
import { pgPolicy, pgRole } from "drizzle-orm/pg-core";

export const runtimeRole = pgRole("private_label_runtime").existing();
export const adminContext = sql`current_setting('app.is_super_admin', true) = 'true'`;
export const tenantContext = sql`tenant_id::text = nullif(current_setting('app.tenant_id', true), '')`;
export const tenantAccess = sql`(${adminContext} OR ${tenantContext})`;
export const writeAccess = sql`(${tenantAccess} AND current_setting('app.can_write', true) = 'true')`;

export function tenantPolicies(table: string) {
  return [
    pgPolicy(`${table}_read`, { for: "select", to: runtimeRole, using: tenantAccess }),
    pgPolicy(`${table}_write`, {
      for: "all",
      to: runtimeRole,
      using: writeAccess,
      withCheck: writeAccess,
    }),
  ];
}
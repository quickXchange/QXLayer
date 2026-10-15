import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export function applicationTableNames(): string[] {
  // This inventory feeds the PUBLIC tenant-RLS contract, not privileged Auth
  // support storage. Never discard a table's namespace before classification.
  return Object.values(schema).filter(t => is(t, PgTable))
    .map(t => getTableConfig(t))
    .filter(t => !t.schema || t.schema === "public")
    .map(t => t.name);
}

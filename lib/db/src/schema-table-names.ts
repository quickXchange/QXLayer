import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export function applicationTableNames(): string[] {
  return Object.values(schema).filter(t => is(t, PgTable)).map(t => getTableConfig(t).name);
}

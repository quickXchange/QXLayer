import assert from "node:assert/strict";
import test from "node:test";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { getTableConfig, PgDialect, PgTable } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";
import * as schema from "./schema";

// Offline diagnostic of the workspace generator, NOT a native Publish plan.
// No connection, schema mutation, SQL execution or release-snapshot replacement.
test("workspace Drizzle migration generation preserves every source policy predicate", async () => {
  const statements = await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson(schema),
  );
  const policies = statements.filter(statement => /^CREATE POLICY /i.test(statement));
  const tables = Object.values(schema).filter(value => is(value, PgTable));
  const dialect = new PgDialect();
  let usingCount = 0;
  let checkCount = 0;
  for (const table of tables) {
    const config = getTableConfig(table);
    for (const policy of config.policies) {
      const statement = policies.find(value =>
        value.startsWith(`CREATE POLICY "${policy.name}" ON "${config.name}" `));
      assert.ok(statement, `${config.name}.${policy.name}: missing generated policy`);
      if (policy.using) {
        const predicate = dialect.sqlToQuery(policy.using).sql;
        assert.ok(statement.includes(` USING (${predicate})`),
          `${config.name}.${policy.name}: lost or changed USING`);
        usingCount++;
      }
      if (policy.withCheck) {
        const predicate = dialect.sqlToQuery(policy.withCheck).sql;
        assert.ok(statement.includes(` WITH CHECK (${predicate})`),
          `${config.name}.${policy.name}: lost or changed WITH CHECK`);
        checkCount++;
      }
    }
  }
  assert.equal(policies.length, 84);
  assert.equal(usingCount, 84);
  assert.equal(checkCount, 42);
});

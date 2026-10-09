import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "./index";
import { withDatabase } from "./context";

test("missing security metadata fails closed before work, rolls back and releases", async () => {
  const original = pool.connect;
  const commands: string[] = [];
  let worked = false, released = false;
  pool.connect = (async () => ({
    query: async (command: string) => {
      commands.push(command);
      return { rows: command.includes("AS safe FROM pg_roles") ? [{ safe: false }] : [], rowCount: 0 };
    },
    release: () => { released = true; },
  })) as typeof pool.connect;
  try {
    await assert.rejects(withDatabase({ actorId: "fictional", tenantId: "fictional" },
      async () => { worked = true; }), /Database isolation is not ready/);
    assert.equal(worked, false); assert.equal(released, true);
    assert.ok(commands.includes("SET LOCAL ROLE pg_database_owner"));
    assert.ok(commands.includes("ROLLBACK"));
    assert.ok(!commands.includes("COMMIT"));
  } finally { pool.connect = original; }
});

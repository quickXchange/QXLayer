import { test } from "node:test";
import assert from "node:assert/strict";
import { pool, withDatabase } from "@workspace/db";

test("Batched setup retains every guard, parameterized context and transaction cleanup", async () => {
  const original = pool.connect;
  const calls: { text: string; params?: unknown[] }[] = [];
  let released = 0;
  const client = {
    query: async (text: string, params?: unknown[]) => {
      calls.push({ text, params });
      return { rows: [{ safe: true }] };
    },
    release: () => { released++; },
  };
  // No database connection or records are touched by this transport regression.
  pool.connect = (async () => client) as typeof pool.connect;
  try {
    await withDatabase({ actorId: "synthetic';--", tenantId: "synthetic", canWrite: false }, async () => {});
    assert.match(calls[0].text, /^BEGIN READ ONLY; SET LOCAL ROLE pg_database_owner;/);
    assert.match(calls[0].text, /search_path=pg_catalog,public; SET LOCAL row_security=on/);
    assert.match(calls[1].text, /pg_policy/);
    assert.equal(calls[1].params?.[0] instanceof Array, true);
    assert.match(calls[2].text, /set_config/);
    assert.equal(calls[2].params?.[0], "synthetic';--");
    assert.equal(calls.at(-1)?.text, "COMMIT");
    await assert.rejects(withDatabase({ actorId: "synthetic" }, async () => { throw Error("synthetic failure"); }));
    assert.equal(calls.at(-1)?.text, "ROLLBACK");
    client.query = async (text, params) => { calls.push({ text, params }); return { rows: [{ safe: false }] }; };
    let workRan = false;
    await assert.rejects(withDatabase({ actorId: "synthetic" }, async () => { workRan = true; }), /isolation is not ready/);
    assert.equal(workRan, false); assert.equal(calls.at(-1)?.text, "ROLLBACK");
    assert.equal(released, 3);
  } finally { pool.connect = original; }
});

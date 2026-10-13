import { test } from "node:test";
import assert from "node:assert/strict";
import { withRequestDeadline } from "@workspace/api-client-react";

test("bounds stalled token/network waits and aborts their signal", async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(withRequestDeadline(undefined, 10, async s => {
    signal = s; return new Promise<never>(() => {});
  }), /took too long/);
  assert.equal(signal?.aborted, true);
});
test("forwards caller cancellation and does not wait for a hung operation", async () => {
  const c = new AbortController();
  const p = withRequestDeadline(c.signal, 1000, async () => new Promise<never>(() => {}));
  c.abort(new Error("cancelled by caller"));
  await assert.rejects(p, /cancelled by caller/);
});
test("settled operations return normally", async () => {
  assert.equal(await withRequestDeadline(undefined, 1000, async () => "ok"), "ok");
});
test("already cancelled requests never start their operation", async () => {
  const c = new AbortController(); c.abort(new Error("already cancelled"));
  let started = false;
  await assert.rejects(withRequestDeadline(c.signal, 1000, async () => { started = true; }), /already cancelled/);
  assert.equal(started, false);
});
test("legacy clients without opt-in retain their signal", async () => {
  const c = new AbortController();
  assert.equal(await withRequestDeadline(c.signal, 0, async s => s), c.signal);
});

import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { readHiddenSecret, runInteractiveProductionSetup } from "./prepare-free-production-interactive.mjs";

const dbKey = "QXLAYER_PRODUCTION_SUPABASE_PROVISIONING_DB_PASSWORD";
const sessionKey = "QXLAYER_PRODUCTION_SUPABASE_AUTH_SESSION_SECRET";
const syntheticDb = "synthetic-only-database-value".repeat(2);
const syntheticSession = "synthetic-only-session-value".repeat(2);

function terminal() {
  const input = new PassThrough(), output = new PassThrough();
  input.isTTY = output.isTTY = true;
  input.setRawMode = () => {};
  output.columns = 80;
  const chunks = [];
  output.on("data", chunk => chunks.push(chunk.toString()));
  return { input, output, text: () => chunks.join("") };
}

test("hidden terminal input is returned without being echoed", async () => {
  const tty = terminal();
  const result = readHiddenSecret("Private value", tty);
  tty.input.write(`${syntheticDb}\r`);
  assert.equal(await result, syntheticDb);
  assert(!tty.text().includes(syntheticDb));
  assert.equal(tty.text(), "Private value: \n");
});

test("terminal cancellation rejects without echoing partial input", async () => {
  const tty = terminal();
  const result = readHiddenSecret("Private value", tty);
  tty.input.write(`${syntheticSession}\u0003`);
  await assert.rejects(result);
  assert(!tty.text().includes(syntheticSession));
});

test("non-interactive execution refuses before any prompt or provider action", async () => {
  let called = false;
  await assert.rejects(runInteractiveProductionSetup({
    input: { isTTY: false }, output: { isTTY: false },
    prompt: async () => { called = true; }, run: async () => { called = true; },
  }));
  assert.equal(called, false);
});

test("both values stay in private process scope and are released after setup", async () => {
  const tty = terminal(), env = { publicSetting: "retained" };
  let privateEnv, prompts = 0;
  const result = await runInteractiveProductionSetup({
    ...tty, env,
    prompt: async () => ++prompts === 1 ? syntheticDb : syntheticSession,
    run: async scoped => {
      privateEnv = scoped;
      assert.equal(scoped[dbKey], syntheticDb);
      assert.equal(scoped[sessionKey], syntheticSession);
      assert.equal(scoped.QXLAYER_STAGING_PAUSE_APPROVED, "true");
      assert.equal(scoped.QXLAYER_PRODUCTION_PROJECT_CREATION_APPROVED, "true");
      return "synthetic-complete";
    },
  });
  assert.equal(result, "synthetic-complete");
  assert.deepEqual(env, { publicSetting: "retained" });
  assert.equal(privateEnv[dbKey], undefined);
  assert.equal(privateEnv[sessionKey], undefined);
  assert(!tty.text().includes(syntheticDb) && !tty.text().includes(syntheticSession));
});

test("input cancellation prevents setup and failure releases credential references", async () => {
  const tty = terminal(); let called = false, privateEnv;
  await assert.rejects(runInteractiveProductionSetup({
    ...tty, env: {}, prompt: async () => { throw Error("synthetic cancellation"); },
    run: async () => { called = true; },
  }));
  assert.equal(called, false);
  await assert.rejects(runInteractiveProductionSetup({
    ...tty, env: {}, prompt: async () => syntheticDb,
    run: async scoped => { privateEnv = scoped; throw Error("synthetic failure"); },
  }));
  assert.equal(privateEnv[dbKey], undefined);
  assert.equal(privateEnv[sessionKey], undefined);
});

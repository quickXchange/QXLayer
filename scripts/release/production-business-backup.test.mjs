import test from "node:test";
import assert from "node:assert/strict";
import { sourceEnvironment } from "./production-business-backup.mjs";
test("source binding requires exact host, verified client TLS, channel binding and readonly transactions", () => {
  const env = sourceEnvironment("postgres://synthetic:synthetic@source.invalid/example?sslmode=disable", "source.invalid", "/synthetic");
  assert.equal(env.PGSSLMODE, "verify-full"); assert.equal(env.PGCHANNELBINDING, "require");
  assert.match(env.PGOPTIONS, /default_transaction_read_only=on/);
  assert.throws(() => sourceEnvironment("postgres://synthetic@other.invalid/example", "source.invalid", "/synthetic"));
  assert.throws(() => sourceEnvironment("postgres://synthetic@localhost/example", "localhost", "/synthetic"));
});

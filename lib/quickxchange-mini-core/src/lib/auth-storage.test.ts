import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Telegram bearer tokens are memory-only and legacy persisted credentials are removed", async () => {
  const source = await readFile(new URL("./auth.tsx", import.meta.url), "utf8");
  assert(!/sessionStorage\.getItem\(['"]tg_session_token/.test(source));
  assert(!/(?:sessionStorage|localStorage)\.setItem\(['"]tg_session_token/.test(source));
  assert(source.includes("sessionStorage.removeItem('tg_session_token')"));
  assert(source.includes("setSessionToken(session.token)"));
  assert(source.includes("createTelegramMiniAppSession"));
});

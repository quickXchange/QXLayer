import assert from "node:assert/strict";
import { test } from "node:test";
import { sendAuthMail } from "./mail";

test("sender rebrand preserves the mailbox and uses branded content", async () => {
  const from = process.env.QXLAYER_AUTH_MAIL_FROM;
  const key = process.env.QXLAYER_AUTH_RESEND_KEY;
  const original = globalThis.fetch;
  try {
    process.env.QXLAYER_AUTH_MAIL_FROM = "Former Brand <no-reply@example.com>";
    process.env.QXLAYER_AUTH_RESEND_KEY = "synthetic-test-only";
    let sent: Record<string, any> | undefined;
    globalThis.fetch = async (_input, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response("{}", { status: 200 });
    };
    await sendAuthMail("recipient@example.com", "Verify your VYNOX LAYER email", "https://example.com/verification");
    assert.equal(sent?.from, "VYNOX LAYER <no-reply@example.com>");
    assert.deepEqual(sent?.to, ["recipient@example.com"]);
    assert.match(sent?.text, /VYNOX LAYER$/);
    process.env.QXLAYER_AUTH_MAIL_FROM = "invalid sender";
    await assert.rejects(() => sendAuthMail("recipient@example.com", "Verification", "https://example.com"), /invalid/);
  } finally {
    globalThis.fetch = original;
    if (from === undefined) delete process.env.QXLAYER_AUTH_MAIL_FROM; else process.env.QXLAYER_AUTH_MAIL_FROM = from;
    if (key === undefined) delete process.env.QXLAYER_AUTH_RESEND_KEY; else process.env.QXLAYER_AUTH_RESEND_KEY = key;
  }
});

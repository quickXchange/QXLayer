import assert from "node:assert/strict";
import test from "node:test";
import { testProvider } from "./adapters";
import { validateSecrets } from "./input";

test("Quickex and WhiteBIT credentials require a complete, whitespace-free pair", () => {
  for (const key of ["quickex", "whitebit"]) {
    const invalid: Record<string, string>[] = [{ apiKey: "test" }, { apiKey: " test", secretKey: "secret" }, { apiKey: "test", secretKey: "sec\nret" }];
    for (const input of invalid)
      assert.throws(() => validateSecrets(key, input));
    assert.doesNotThrow(() => validateSecrets(key, { apiKey: "fictional-test-key", secretKey: "fictional-test-secret" }));
    assert.throws(() => validateSecrets(key, { apiKey: "test", secretKey: "secret", privateKey: "not-allowed" }));
  }
});
test("WhiteBIT diagnostic signs only the read-only balance route and returns no balances", async () => {
  const called: string[] = [];
  const transport: typeof fetch = async (url, init) => {
    called.push(String(url));
    assert.equal(init?.method, "POST");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, { request: "/api/v4/main-account/balance", nonce: 1234 });
    assert.ok((init?.headers as Record<string, string>)["X-TXC-SIGNATURE"]);
    return new Response(JSON.stringify({ USDT: { main_balance: "42" } }), { status: 200 });
  };
  const result = await testProvider("whitebit", {}, { apiKey: "fictional", secretKey: "fictional-secret" }, 1234, transport);
  assert.equal(result.state, "connected");
  assert.deepEqual(called, ["https://whitebit.com/api/v4/main-account/balance"]);
  assert.ok(!JSON.stringify(result).includes("42"));
});
test("diagnostic authentication/rate errors are actionable and never echo provider secrets or bodies", async () => {
  for (const status of [401, 403, 429, 500]) {
    const transport: typeof fetch = async () => new Response("private-account-and-secret-body", { status });
    await assert.rejects(() => testProvider("whitebit", {}, { apiKey: "fictional", secretKey: "fictional-secret" }, 1234, transport),
      (error: any) => error.message.includes(status === 429 ? "rate limit" : status < 429 ? "authentication" : "Provider request failed") &&
        !error.message.includes("private-account"));
  }
});

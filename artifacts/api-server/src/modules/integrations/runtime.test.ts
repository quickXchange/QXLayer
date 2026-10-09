import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { scopedVault } from "./vault";
import { mayManageSecrets, safeProviderEndpoint, validateSecrets } from "./input";
import { createQuickexOrder } from "./vendor/quickex/quickex";
import { getQuickexCredentialStorageState, withQuickexCredentials } from "./vendor/quickex/provider-credentials";

test("vault binds ciphertext to tenant, provider, environment and key, and rejects tampering", () => {
  const key = randomBytes(32), vault = scopedVault(() => key);
  const scope = { tenantId: "tenant-a", providerKey: "quickex", environment: "sandbox" };
  const secret = { apiKey: "fictional-test-only", secretKey: "not-a-provider-credential" };
  const encrypted = vault.seal(scope, secret);
  assert.deepEqual(vault.open(scope, encrypted), secret);
  assert.ok(!JSON.stringify(encrypted).includes(secret.apiKey));
  for (const changed of [{ ...scope, tenantId: "tenant-b" }, { ...scope, providerKey: "whitebit" }, { ...scope, environment: "production" }])
    assert.throws(() => vault.open(changed, encrypted));
  assert.throws(() => scopedVault(() => randomBytes(32)).open(scope, encrypted));
  assert.throws(() => vault.open(scope, { ...encrypted, tag: Buffer.alloc(16).toString("base64") }));
  assert.throws(() => vault.open(scope, { ...encrypted, version: "unknown" as any }));
});
test("credential management mode applies independently to roles", () => {
  assert.equal(mayManageSecrets("super_admin", "super_admin"), true);
  assert.equal(mayManageSecrets("super_admin", "customer"), false);
  assert.equal(mayManageSecrets("client_admin", "customer"), true);
  assert.equal(mayManageSecrets("client_admin", "both"), true);
  assert.equal(mayManageSecrets("client_admin", "super_admin"), false);
  assert.equal(mayManageSecrets("client_staff", "both"), false);
});
test("RPC endpoint policy blocks local/non-TLS/userinfo/unknown hosts", () => {
  for (const url of ["http://localhost/", "https://127.0.0.1/", "https://169.254.169.254/", "https://untrusted.example/", "https://a:b@eth-mainnet.g.alchemy.com/"])
    assert.throws(() => safeProviderEndpoint(url));
  assert.doesNotThrow(() => safeProviderEndpoint("https://eth-sepolia.g.alchemy.com/v2/fictional-test-only"));
  assert.throws(() => validateSecrets("1forge", { botToken: "wrong-provider-field" }));
});
test("Quickex credentials stay isolated in concurrent tenant contexts and never fall back globally", async () => {
  assert.equal((await getQuickexCredentialStorageState()).status, "absent");
  const values = await Promise.all(["tenant-a", "tenant-b"].map(publicKey =>
    withQuickexCredentials({ publicKey, secretKey: "fictional-test-only" }, async () => {
      await new Promise(r => setTimeout(r, 2));
      return (await getQuickexCredentialStorageState()).credentials.publicKey;
    })));
  assert.deepEqual(values, ["tenant-a", "tenant-b"]);
  assert.equal((await getQuickexCredentialStorageState()).status, "absent");
});
test("Quickex cannot create a real external financial order", () => {
  assert.throws(() => createQuickexOrder({ fromCurrency: "BTC", fromNetwork: "BTC", toCurrency: "ETH", toNetwork: "ETH",
    amount: 1, destinationAddress: "fictional", email: "fixture@example.invalid" }), /disabled in QXLayer Sandbox/);
});

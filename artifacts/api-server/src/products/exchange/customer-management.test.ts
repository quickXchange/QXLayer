import assert from "node:assert/strict";
import test from "node:test";
import { CreateSandboxOrderBody } from "@workspace/api-zod";
import { orderContact, customerIdForEmail } from "./customer-management";
test("contact collection is anonymous by default and requires explicit consent", () => {
  assert.deepEqual(orderContact({}), {});
  assert.throws(() => orderContact({ customerName: "Fictional", customerEmail: "qa@example.test" }));
  assert.throws(() => orderContact({ customerEmail: "qa@example.test", contactConsent: true }));
  const contact = orderContact({ customerName: " Fictional ", customerEmail: " QA@example.test ", contactConsent: true });
  assert.equal(contact.customerName, "Fictional");
  assert.equal(contact.customerEmail, "qa@example.test");
  assert.equal(contact.customerId, customerIdForEmail("qa@example.test"));
});
test("order contract rejects malformed contact details without changing anonymous checkout", () => {
  const input = { quoteToken: "a".repeat(40), idempotencyKey: "a0b11111-1111-4111-8111-111111111111" };
  assert.ok(CreateSandboxOrderBody.safeParse(input).success);
  assert.equal(CreateSandboxOrderBody.safeParse({ ...input, customerEmail: "not-email" }).success, false);
  assert.equal(CreateSandboxOrderBody.safeParse({ ...input, customerName: "a".repeat(121) }).success, false);
});

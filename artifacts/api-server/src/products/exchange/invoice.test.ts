import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import type { ExchangeOrder } from "@workspace/api-zod";
import { renderSandboxInvoice } from "./invoice";
import { validateSettings, websiteSettings } from "../../modules/website/settings";
const order = {
  id: "a0b11111-1111-4111-8111-111111111111", status: "completed", action: "swap",
  source: "source", destination: "dest", sourceSymbol: "BTC", destinationSymbol: "ETH",
  inputAmount: "1", outputAmount: "20", rate: "20", fee: "0", spreadBps: 0,
  paymentMethod: null, createdAt: new Date(), sandboxOnly: true,
  history: [{ status: "completed", at: new Date(), note: "Simulated completion." }],
} as ExchangeOrder;
test("invoice is a valid branded PDF with embedded Unicode font and sandbox metadata", async () => {
  const bytes = await renderSandboxInvoice(order, { brandName: "Échange ألفا", accentColor: "#22aa88", domain: "exchange.example", supportEmail: null });
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
  const pdf = await PDFDocument.load(bytes);
  assert.match(pdf.getTitle()!, /Échange ألفا.*Sandbox invoice/);
  assert.equal(pdf.getAuthor(), "Échange ألفا");
  assert.equal(pdf.getPageCount(), 1);
});
test("invoice wraps very long tenant text and paginates history", async () => {
  const bytes = await renderSandboxInvoice({ ...order, history: Array.from({ length: 80 }, () => order.history[0]) },
    { brandName: "A".repeat(120), accentColor: "#ffffff", domain: null, supportEmail: null });
  assert.ok((await PDFDocument.load(bytes)).getPageCount() > 1);
});
test("review link configuration rejects unsafe protocols and embedded credentials", () => {
  for (const url of ["javascript:alert(1)", "http://reviews.example", "/api/public/sites/test/branding/logo", "https://user:password@reviews.example"]) {
    assert.throws(() => validateSettings(websiteSettings("Test", { reviewLinks: [{ label: "Review", url }] })));
  }
  assert.doesNotThrow(() => validateSettings(websiteSettings("Test", { reviewLinks: [{ label: "Review", url: "https://reviews.example" }] })));
  assert.deepEqual(websiteSettings("Test", { reviewLinks: [] }).reviewLinks, []);
});

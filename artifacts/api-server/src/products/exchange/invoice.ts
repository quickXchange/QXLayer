import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { GetPublicSiteResponse, type ExchangeOrder } from "@workspace/api-zod";
import { trackOrder } from "./service";
import { getPublicSite } from "../../modules/website/service";
import { publicBrandingFile } from "../../modules/website/branding-files";
import { HttpError } from "../../lib/errors";

type InvoiceBrand = { brandName: string; accentColor: string; domain: string | null; supportEmail: string | null };
const fontBytes = () => {
  const bundled = new URL("./assets/DejaVuSans.ttf", import.meta.url);
  return readFile(existsSync(bundled) ? bundled : new URL("../../../assets/DejaVuSans.ttf", import.meta.url));
};

/** Pure rendering: no financial operation or remote image fetch is possible here. */
export async function renderSandboxInvoice(order: ExchangeOrder, brand: InvoiceBrand, logo?: { bytes: Uint8Array; contentType: string }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await fontBytes(), { subset: true });
  pdf.setTitle(`${brand.brandName} — Sandbox invoice ${order.id}`);
  pdf.setAuthor(brand.brandName);
  const hex = /^#[0-9a-f]{6}$/i.test(brand.accentColor) ? brand.accentColor : "#19705b";
  const accent = rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
  let page: PDFPage, y = 0;
  const newPage = () => {
    page = pdf.addPage([595.28, 841.89]); y = 782;
    page.drawRectangle({ x: 0, y: 820, width: 596, height: 22, color: accent });
    page.drawText("SANDBOX ONLY — NOT PROOF OF PAYMENT", { x: 45, y: 28, size: 9, font, color: rgb(.4, .4, .4) });
  };
  const safe = (text: string) => text.replace(/[\u0000-\u001f\u007f]/g, " ").normalize("NFC");
  const supported = new Set(font.getCharacterSet());
  const visible = (text: string) => Array.from(safe(text)).map(c => supported.has(c.codePointAt(0)!) ? c : "?").join("");
  const line = (text: string, size = 11, face: PDFFont = font) => {
    // Wrap even a single long identifier. Tenant text cannot overflow the page.
    let chunk = "";
    for (const char of visible(text)) {
      if (face.widthOfTextAtSize(chunk + char, size) > 500) {
        if (y < 65) newPage();
        page.drawText(chunk, { x: 45, y, size, font: face }); y -= size + 8; chunk = "";
      }
      chunk += char;
    }
    if (y < 65) newPage();
    page.drawText(chunk, { x: 45, y, size, font: face }); y -= size + 10;
  };
  newPage();
  if (logo) {
    // Only curated uploaded raster logos are allowed. Never fetch arbitrary URLs.
    const image = logo.contentType === "image/png" ? await pdf.embedPng(logo.bytes) : await pdf.embedJpg(logo.bytes);
    const fit = image.scaleToFit(120, 55);
    page!.drawImage(image, { x: 45, y: y - fit.height, width: fit.width, height: fit.height });
    y -= fit.height + 20;
  }
  line(brand.brandName, 23);
  line("Sandbox exchange invoice", 17);
  line(`Order: ${order.id}`);
  line(`Created: ${new Date(order.createdAt).toISOString()}`);
  line(`Status: ${order.status.toUpperCase()} (simulated)`);
  if (brand.domain) line(`Configured domain: ${brand.domain} (not proof of verification)`);
  if (brand.supportEmail) line(`Support: ${brand.supportEmail}`);
  y -= 10;
  line(`${order.action.toUpperCase()}: ${order.inputAmount} ${order.sourceSymbol} → ${order.outputAmount} ${order.destinationSymbol}`, 14);
  line(`Exchange rate: ${order.rate}`);
  line(`Source fee: ${order.fee} ${order.sourceSymbol}`);
  line(`Markup: ${order.spreadBps / 100}%`);
  if (order.destinationFee) line(`Destination fees: ${order.destinationFee} ${order.destinationSymbol}`);
  if (order.paymentMethod) line(`Recorded payment method: ${order.paymentMethod} (not charged)`);
  if (order.pricingSource) line(`Pricing source: ${order.pricingSource}`);
  y -= 10;
  line("This document records a simulated order, not a tax invoice or receipt.", 10);
  line("No funds received, traded, deposited or paid out. Do not send funds.", 10);
  line("Status history", 14);
  for (const event of order.history) {
    line(`${new Date(event.at).toISOString()} — ${event.status}`);
    line(event.note, 10);
  }
  return pdf.save();
}

export async function sandboxInvoice(slug: string, orderId: string, token: string) {
  // Reuse the exact tenant-bound private order capability before loading branding.
  const order = await trackOrder(slug, orderId, token);
  const site = GetPublicSiteResponse.parse(await getPublicSite(slug));
  let logo: { bytes: Uint8Array; contentType: string } | undefined;
  if (site.logoUrl === `/api/public/sites/${slug}/branding/logo`) {
    const { file, contentType } = await publicBrandingFile(slug, "logo");
    if (["image/png", "image/jpeg"].includes(contentType)) {
      // Bound streamed bytes for both App Storage and Supabase Storage adapters.
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of file.createReadStream()) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > 2_000_000) throw new HttpError(409, "Invoice logo exceeds the supported size. Use a logo below 2 MB.");
        chunks.push(bytes);
      }
      const bytes = Buffer.concat(chunks);
      logo = { bytes, contentType };
    }
  }
  return renderSandboxInvoice(order, { brandName: site.brandName, accentColor: site.accentColor,
    domain: site.domain, supportEmail: site.websiteSettings.supportEmail }, logo);
}

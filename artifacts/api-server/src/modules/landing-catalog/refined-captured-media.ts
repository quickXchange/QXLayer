import type { CapturedMedia } from "./captured-media";
const capture = (file: string, title: string, caption: string, device: CapturedMedia["device"]): CapturedMedia => ({
  file, title, caption, device, imageUrl: `/api/public/marketing-media/${file}`,
  mediaKind: "application_capture", sourceLabel: "Genuine sandbox capture · NovaX fictional demo · No live funds",
});
/** Direct 2× browser captures. NovaX is a fictional demonstration, not a client.
 * Admin images clip the actual content/drawer, excluding the platform sidebar.
 * Files live in immutable object storage, not the source repository. */
export const REFINED_CAPTURED_MEDIA: Record<string, CapturedMedia[]> = { crypto_exchange: [
  capture("2e105325d91d937b9ab7092d.webp", "Swap, before confirmation", "The working NovaX Exchange with a populated BTC-to-ETH sandbox quote, test networks, rate, fees and order action. No real funds or providers.", "desktop"),
  capture("8b0eb4bdb814877cfc37d613.webp", "A native mobile exchange", "The real responsive Swap widget at 430 CSS pixels. The estimate note displays the complete sandbox receive amount alongside rate, fees and the sandbox action.", "phone"),
  capture("a4f2885164c0f6b72f045e6d.webp", "A homepage with its own identity", "NovaX's own fictional brand and customer-facing homepage on the shared Exchange. Its navigation, hero and widget are actual application interfaces.", "desktop"),
  capture("e83d960458e1ac26f7ee2696.webp", "Convert with the details visible", "The working Convert interface showing 0.4 BTC to 7.93214 ETH in a sandbox estimate, with rate, limits and fees. This is not a live offer.", "desktop"),
  capture("314a2387ee6c92b5a74d0955.webp", "The customer homepage, on mobile", "The actual responsive NovaX header, homepage and calls to action at 390 CSS pixels. A fictional brand, not a delivered customer website.", "phone"),
  capture("b737d7dc195c356c2aab6534.webp", "The compact Swap view", "The native 390 CSS-pixel Swap interface. The full receive amount is available in the estimate note; sample assets use test networks only.", "phone"),
  capture("3760fc8a2a22897239c0e2cd.webp", "The operator's overview", "The actual read-only NovaX Admin overview with fictional order metrics. Captured from the customer administration content area, not a fabricated dashboard.", "desktop"),
  capture("9a37153c34d40b8ae803e0e9.webp", "Every order in one workspace", "The working read-only Orders list with four fictional anonymous orders and locked bulk controls. No real customer records are shown.", "desktop"),
  capture("39c1fd045bc8fd7a540ba4c5.webp", "Inspect a completed order", "The native View Order drawer for a completed fictional BTC-to-ETH order. The status is sample data; no payout, provider execution or live funds occurred.", "desktop"),
  capture("c53fa9bf27c903bf29969419.webp", "Payment details, without false promises", "The actual pending Buy order drawer. It shows a sandbox bank-transfer label and explicitly reports that payment instructions and account/card details are not collected.", "desktop"),
  capture("667b69492759f3aa0d4f50ce.webp", "Order created", "The native inline result for an isolated browser-held demo order, with a tracking link and explicit no-funds, no-payment and no-deposit-address disclosure.", "phone"),
  capture("8027d5547efbed49aba5f998.webp", "A clear view of order progress", "The actual standalone tracking page for the same temporary pending demo order. History is simulated; the private tracking token is not visible in the capture.", "phone"),
] };

import { REFINED_CAPTURED_MEDIA } from "./refined-captured-media";
export type CapturedMedia = {
  file: string; title: string; caption: string; imageUrl: string;
  mediaKind: "application_capture"; device: "desktop" | "phone" | "tablet"; sourceLabel: string;
};
/** Generated from reviewed, sanitized captures of the actual shared application.
 * Storage keys are immutable and explicitly allowlisted, never user-supplied. */
export const LEGACY_CAPTURED_MEDIA: Record<string, CapturedMedia[]> = {crypto_exchange:[
  {file:"cb19aee12b52653435cc9fe3.webp",title:"Your customer-facing Exchange",caption:"The actual shared NovaX Exchange with a populated 0.025 BTC → 0.49575875 ETH sandbox quote, test networks, rate and fees. Captured before creating a simulated order.",imageUrl:"/api/public/marketing-media/cb19aee12b52653435cc9fe3.webp",mediaKind:"application_capture",device:"desktop",sourceLabel:"Actual shared Exchange sandbox · fictional demo data"},
  {file:"ef8dff78ff1860f4d039fd37.webp",title:"The same Exchange, on mobile",caption:"The real responsive customer widget: asset and test-network selection, a populated sandbox quote, rate, fees and review action in a compact mobile layout.",imageUrl:"/api/public/marketing-media/ef8dff78ff1860f4d039fd37.webp",mediaKind:"application_capture",device:"phone",sourceLabel:"Actual shared Exchange sandbox · fictional demo data"},
  {file:"f11ef1cd07f634be34ca02f2.webp",title:"Your operator command centre",caption:"The actual read-only NovaX Admin overview, with deliberately fictional order metrics and a visible simulation disclosure. No real customer account or live performance data is shown.",imageUrl:"/api/public/marketing-media/f11ef1cd07f634be34ca02f2.webp",mediaKind:"application_capture",device:"desktop",sourceLabel:"Actual shared Exchange sandbox · fictional demo data"},
  {file:"66c1ab9aa3700a32a58fddd9.webp",title:"Every order, one clear workspace",caption:"The working operator Orders table with four seeded fictional orders, status filters and inspection-only controls. This is a capture of the actual shared interface, not an authored mockup.",imageUrl:"/api/public/marketing-media/66c1ab9aa3700a32a58fddd9.webp",mediaKind:"application_capture",device:"desktop",sourceLabel:"Actual shared Exchange sandbox · fictional demo data"},
  {file:"8a2b12f9556291968e58e8c0.webp",title:"Inspect the complete order",caption:"The real View Order drawer for a completed fictional BTC → ETH sandbox order. Order inspection is read-only and no provider, payment or fund movement is enabled.",imageUrl:"/api/public/marketing-media/8a2b12f9556291968e58e8c0.webp",mediaKind:"application_capture",device:"desktop",sourceLabel:"Actual shared Exchange sandbox · fictional demo data"},
  {file:"2a9c2092f8e43db2763e1d88.webp",title:"A transparent customer journey",caption:"Actual customer tracking for a permitted browser-held simulated order. The private tracking token is not visible; the snapshot was never saved to a customer database and cannot execute a payment.",imageUrl:"/api/public/marketing-media/2a9c2092f8e43db2763e1d88.webp",mediaKind:"application_capture",device:"desktop",sourceLabel:"Actual shared Exchange sandbox · fictional demo data"},
]};
// Keep previously saved CMS image URLs valid while upgrading generated defaults.
export const CAPTURED_MEDIA = REFINED_CAPTURED_MEDIA;
export const ALL_CAPTURED_MEDIA = [
  ...Object.values(CAPTURED_MEDIA).flat(), ...Object.values(LEGACY_CAPTURED_MEDIA).flat(),
];

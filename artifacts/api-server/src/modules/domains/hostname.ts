import { domainToASCII } from "node:url";
import { HttpError } from "../../lib/errors";

export function customerHostname(raw: string) {
  if (/[/\\:@?#%\s]/.test(raw.trim())) {
    throw new HttpError(400, "Enter a hostname without protocol, port or path.");
  }
  const domain = domainToASCII(raw.trim().toLowerCase().replace(/\.$/, ""));
  if (domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(domain)) {
    throw new HttpError(400, "Enter a hostname without protocol, port or path.");
  }
  const reserved = new Set((process.env.QXLAYER_PLATFORM_HOSTS ?? "").split(",").map(s => s.trim().toLowerCase()));
  if (process.env.QXLAYER_PLATFORM_URL) {
    try { reserved.add(new URL(process.env.QXLAYER_PLATFORM_URL).hostname); } catch { /* Invalid platform configuration grants no routing. */ }
  }
  if (reserved.has(domain) || domain.endsWith(".replit.dev") || domain === "localhost") {
    throw new HttpError(400, "Use a customer-owned domain, not a reserved QXLayer platform or Development hostname.");
  }
  return domain;
}

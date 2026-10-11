import { createStaticHandler } from "./lib/production-access-gate/static-handler.mjs";
import { fileURLToPath } from "node:url";

if (process.env.QXLAYER_EXTERNAL_ENVIRONMENT === "staging") {
  if (process.env.VERCEL_ENV !== "preview" ||
      !/^qxlayer-staging-[a-z0-9-]+\.vercel\.app$/.test(process.env.VERCEL_URL ?? ""))
    throw new Error("The integrated Staging frontend is Preview-only.");
  // Immutable Preview origins are not known until creation. Use the provider's
  // runtime identity; only Render needs a subsequent explicit origin readback.
  process.env.QXLAYER_PLATFORM_URL = `https://${process.env.VERCEL_URL}`;
}
const gateCode = process.env.QXLAYER_EXTERNAL_ENVIRONMENT === "staging"
  ? process.env.QXLAYER_STAGING_ACCESS_CODE : process.env.PRODUCTION_ACCESS_CODE;
if (!gateCode || process.env.PRODUCTION_ACCESS_GATE_ENABLED !== "true" ||
    !process.env.QXLAYER_PLATFORM_URL)
  throw new Error("Approved platform URL and Private Access configuration are required.");
export default createStaticHandler(fileURLToPath(new URL("./static/", import.meta.url)));

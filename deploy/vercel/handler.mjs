import { createStaticHandler } from "./lib/production-access-gate/static-handler.mjs";
import { fileURLToPath } from "node:url";

if (!process.env.PRODUCTION_ACCESS_CODE || process.env.PRODUCTION_ACCESS_GATE_ENABLED !== "true" ||
    !process.env.QXLAYER_PLATFORM_URL)
  throw new Error("Approved platform URL and Private Access configuration are required.");
export default createStaticHandler(fileURLToPath(new URL("./static/", import.meta.url)));

import type { RequestHandler } from "express";
import { DEMO_SLUG } from "./identity";
import { HttpError } from "../../lib/errors";

// Defense-in-depth if someone accidentally bypasses/reorders demo isolation.
// No retention job, deletion, database query or real provider is permitted.
export const guardPublicDemo: RequestHandler = (req, _res, next) => {
  if (req.get("x-qx-website-preview") !== undefined || req.query.preview !== undefined) {
    throw new HttpError(403, "Private website previews are read-only. Quotes and orders are disabled.");
  }
  if (req.params.slug === DEMO_SLUG) throw new HttpError(403, "Demo requests must use the isolated simulation service.");
  next();
};

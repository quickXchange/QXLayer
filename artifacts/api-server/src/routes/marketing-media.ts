import { Router } from "express";
import { privateObject } from "../lib/private-object-storage";
import { CAPTURED_MEDIA } from "../modules/landing-catalog/captured-media";
const router = Router();
router.get("/public/marketing-media/:file", async (req, res) => {
  const media = Object.values(CAPTURED_MEDIA).flat().find(m => m.file === req.params.file);
  if (!media) { res.status(404).json({ error: "Marketing image not found." }); return; }
  const file = privateObject(`marketing/explore/${media.file}`);
  const [bytes] = await file.download();
  res.set("Content-Type", "image/webp");
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.set("X-Content-Type-Options", "nosniff");
  res.send(bytes);
});
export default router;

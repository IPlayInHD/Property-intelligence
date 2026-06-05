import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { scrapeListing } from "../services/scraper";

const router = Router();

router.post("/scrape/listing-url", requireAuth, async (req, res) => {
  try {
    const { url } = req.body as { url: string };
    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    const allowed = ["bayut.com", "propertyfinder.ae", "dubizzle.com"];
    if (!allowed.some((domain) => url.includes(domain))) {
      res.status(400).json({ error: "URL must be from Bayut, Propertyfinder, or Dubizzle" });
      return;
    }

    const result = await scrapeListing(url);
    res.json(result);
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(400).json({ error: "Failed to scrape listing. The site may be blocking automated requests." });
  }
});

export default router;

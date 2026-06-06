import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { scrapeListing } from "../services/scraper";

const router = Router();

// Exact hostname allowlist — subdomains of these are also permitted
const ALLOWED_HOSTS = new Set([
  "www.bayut.com",
  "bayut.com",
  "www.propertyfinder.ae",
  "propertyfinder.ae",
  "www.dubizzle.com",
  "dubizzle.com",
  "dubai.dubizzle.com",
]);

// Block private/link-local/loopback ranges
const BLOCKED_HOST_PATTERN =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|fc00:|fe80:)/i;

function validateListingUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "URL must use http or https" };
  }

  // Reject userinfo (user:pass@host)
  if (parsed.username || parsed.password) {
    return { ok: false, error: "URL must not contain credentials" };
  }

  const host = parsed.hostname.toLowerCase();

  // Block private/internal addresses
  if (BLOCKED_HOST_PATTERN.test(host)) {
    return { ok: false, error: "URL host is not allowed" };
  }

  // Strict exact-host allowlist
  if (!ALLOWED_HOSTS.has(host)) {
    return { ok: false, error: "URL must be from Bayut, Propertyfinder, or Dubizzle" };
  }

  return { ok: true, url: parsed };
}

router.post("/scrape/listing-url", requireAuth, async (req, res) => {
  try {
    const { url } = req.body as { url: string };
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    const validation = validateListingUrl(url.trim());
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const result = await scrapeListing(validation.url.toString());
    res.json(result);
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(400).json({ error: "Failed to scrape listing. The site may be blocking automated requests." });
  }
});

export default router;

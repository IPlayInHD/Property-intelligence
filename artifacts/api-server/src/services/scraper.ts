import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ScrapedPropertyData {
  price: number | null;
  sizeSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  community: string | null;
  buildingName: string | null;
  propertyType: string | null;
  emirate: string | null;
  listingUrl: string;
  source: string;
}

function detectSource(url: string): string {
  if (url.includes("bayut.com")) return "bayut";
  if (url.includes("propertyfinder.ae")) return "propertyfinder";
  if (url.includes("dubizzle.com")) return "dubizzle";
  return "unknown";
}

function extractNumber(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

async function scrapeBayut(url: string, html: string): Promise<ScrapedPropertyData> {
  const $ = cheerio.load(html);

  const priceText = $('[data-testid="property-price"], .price, [class*="price"]').first().text();
  const sizeText = $('[aria-label*="sqft"], [class*="size"], [data-testid*="size"]').first().text();
  const bedsText = $('[aria-label*="bed"], [class*="bed"], [data-testid*="bed"]').first().text();
  const bathsText = $('[aria-label*="bath"], [class*="bath"], [data-testid*="bath"]').first().text();
  const locationText = $('[class*="location"], [data-testid*="location"]').first().text();

  const titleText = $("title").text();
  const h1Text = $("h1").first().text();

  // Determine emirate from URL or content
  let emirate: string | null = "Dubai";
  if (url.includes("abu-dhabi")) emirate = "Abu Dhabi";
  if (url.includes("sharjah")) emirate = "Sharjah";

  return {
    price: extractNumber(priceText),
    sizeSqft: extractNumber(sizeText),
    bedrooms: bedsText ? extractNumber(bedsText) : null,
    bathrooms: bathsText ? extractNumber(bathsText) : null,
    community: locationText.split(",")[0]?.trim() || null,
    buildingName: h1Text.split(" in ")[0]?.trim() || null,
    propertyType: titleText.toLowerCase().includes("villa")
      ? "villa"
      : titleText.toLowerCase().includes("studio")
      ? "studio"
      : "apartment",
    emirate,
    listingUrl: url,
    source: "bayut",
  };
}

async function scrapePropertyFinder(url: string, html: string): Promise<ScrapedPropertyData> {
  const $ = cheerio.load(html);

  const priceText = $('[data-testid="property-price"], .property-price, [class*="Price"]').first().text();
  const sizeText = $('[data-testid*="area"], [class*="Area"], [class*="area"]').first().text();
  const bedsText = $('[data-testid*="bed"], [class*="Beds"], [class*="beds"]').first().text();
  const bathsText = $('[data-testid*="bath"], [class*="Baths"], [class*="baths"]').first().text();

  const breadcrumbs = $('[class*="breadcrumb"], nav ol li').map((_, el) => $(el).text().trim()).get();
  const community = breadcrumbs.length > 2 ? breadcrumbs[breadcrumbs.length - 2] : null;

  let emirate: string | null = "Dubai";
  if (url.includes("abu-dhabi")) emirate = "Abu Dhabi";

  return {
    price: extractNumber(priceText),
    sizeSqft: extractNumber(sizeText),
    bedrooms: bedsText ? extractNumber(bedsText) : null,
    bathrooms: bathsText ? extractNumber(bathsText) : null,
    community,
    buildingName: null,
    propertyType: "apartment",
    emirate,
    listingUrl: url,
    source: "propertyfinder",
  };
}

async function scrapeDubizzle(url: string, html: string): Promise<ScrapedPropertyData> {
  const $ = cheerio.load(html);

  const priceText = $('[class*="price"], [data-testid*="price"]').first().text();
  const sizeText = $('[class*="area"], [data-testid*="size"]').first().text();
  const bedsText = $('[class*="bed"], [data-testid*="bed"]').first().text();
  const bathsText = $('[class*="bath"], [data-testid*="bath"]').first().text();
  const locationText = $('[class*="location"], [data-testid*="location"]').first().text();

  return {
    price: extractNumber(priceText),
    sizeSqft: extractNumber(sizeText),
    bedrooms: bedsText ? extractNumber(bedsText) : null,
    bathrooms: bathsText ? extractNumber(bathsText) : null,
    community: locationText.split(",")[0]?.trim() || null,
    buildingName: null,
    propertyType: "apartment",
    emirate: "Dubai",
    listingUrl: url,
    source: "dubizzle",
  };
}

export async function scrapeListing(url: string, retries = 3): Promise<ScrapedPropertyData> {
  const source = detectSource(url);
  const proxyUrl = process.env.PROXY_URL;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) await delay(2000 * attempt);

      const axiosConfig = {
        headers: {
          "User-Agent": randomUserAgent(),
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.google.com",
        },
        timeout: 20000,
        ...(proxyUrl ? { proxy: false as const } : {}),
      };

      const response = await axios.get(url, axiosConfig);
      const html = response.data as string;

      await delay(2000 + Math.random() * 1000);

      if (source === "bayut") return scrapeBayut(url, html);
      if (source === "propertyfinder") return scrapePropertyFinder(url, html);
      if (source === "dubizzle") return scrapeDubizzle(url, html);

      return {
        price: null,
        sizeSqft: null,
        bedrooms: null,
        bathrooms: null,
        community: null,
        buildingName: null,
        propertyType: null,
        emirate: null,
        listingUrl: url,
        source,
      };
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 403 || status === 429) {
        console.warn(`Scraper: ${status} on attempt ${attempt + 1} for ${url}`);
        if (attempt < retries - 1) await delay(5000 * (attempt + 1));
      } else {
        throw err;
      }
    }
  }

  throw new Error(`Failed to scrape ${url} after ${retries} attempts`);
}

import { db } from "@workspace/db";
import { listingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";
const RAPIDAPI_HOST = "uae-real-estate-data-api1.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

const HEADERS = {
  "x-rapidapi-key": RAPIDAPI_KEY,
  "x-rapidapi-host": RAPIDAPI_HOST,
  "Accept": "application/json",
};

interface BayutProperty {
  externalID?: string;
  id?: string | number;
  title?: string;
  description?: string;
  price?: number;
  area?: number;
  rooms?: number;
  baths?: number;
  purpose?: string;
  furnishingStatus?: string;
  floorNumber?: number;
  location?: Array<{ name?: string; level?: number }> | { name?: string };
  category?: Array<{ nameSingular?: string; nameSlug?: string }>;
  slug?: string;
}

interface ApiResponse {
  hits?: BayutProperty[];
  properties?: BayutProperty[];
  results?: BayutProperty[];
  data?: BayutProperty[] | { hits?: BayutProperty[]; properties?: BayutProperty[] };
}

function extractListings(data: unknown): BayutProperty[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as ApiResponse;

  if (Array.isArray(obj.hits) && obj.hits.length > 0) return obj.hits;
  if (Array.isArray(obj.properties) && obj.properties.length > 0) return obj.properties;
  if (Array.isArray(obj.results) && obj.results.length > 0) return obj.results;
  if (Array.isArray(obj.data)) return obj.data;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    const nested = obj.data as ApiResponse;
    if (Array.isArray(nested.hits)) return nested.hits;
    if (Array.isArray(nested.properties)) return nested.properties;
  }
  return [];
}

function mapFurnished(status?: string): boolean | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "furnished") return true;
  if (s === "unfurnished" || s === "un_furnished") return false;
  return null;
}

function extractCommunity(location: BayutProperty["location"]): string | null {
  if (!location) return null;
  if (Array.isArray(location)) {
    // Bayut locations are ordered from broad to specific; pick the most specific
    const sorted = [...location].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
    return sorted[0]?.name ?? null;
  }
  return (location as { name?: string }).name ?? null;
}

function extractEmirate(location: BayutProperty["location"]): string {
  if (!location) return "Dubai";
  if (Array.isArray(location)) {
    const top = [...location].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    const name = top[0]?.name?.toLowerCase() ?? "";
    if (name.includes("abu dhabi")) return "Abu Dhabi";
    if (name.includes("sharjah")) return "Sharjah";
    if (name.includes("ajman")) return "Ajman";
  }
  return "Dubai";
}

function mapProperty(prop: BayutProperty): typeof listingsTable.$inferInsert | null {
  // Only import for-sale listings
  if (prop.purpose && !prop.purpose.toLowerCase().includes("sale")) return null;

  const externalId = prop.externalID ?? String(prop.id ?? "");
  if (!externalId) return null;

  const listingUrl = `https://www.bayut.com/property/details-${externalId}.html`;
  const price = prop.price ?? 0;
  const area = prop.area ?? 0;
  const pricePerSqft = area > 0 ? Math.round(price / area) : null;
  const today = new Date().toISOString().split("T")[0];

  return {
    source: "bayut",
    listingUrl,
    community: extractCommunity(prop.location),
    emirate: extractEmirate(prop.location),
    buildingName: null,
    propertyType: prop.category?.[0]?.nameSingular?.toLowerCase() ?? null,
    bedrooms: prop.rooms ?? null,
    sizeSqft: area > 0 ? area.toFixed(2) : null,
    listedPrice: price > 0 ? price.toFixed(2) : null,
    pricePerSqft: pricePerSqft != null ? pricePerSqft.toFixed(2) : null,
    viewType: null,
    furnished: mapFurnished(prop.furnishingStatus),
    floorNumber: prop.floorNumber ?? null,
    firstSeen: today,
    lastSeen: today,
    daysListed: 0,
    isActive: true,
  };
}

async function tryEndpoint(url: string): Promise<BayutProperty[]> {
  console.log(`[bayut-sync] Trying: ${url}`);
  try {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`[bayut-sync] ${response.status} from ${url}: ${text.slice(0, 200)}`);
      return [];
    }
    const data: unknown = await response.json();
    const listings = extractListings(data);
    console.log(`[bayut-sync] Got ${listings.length} listings from ${url}`);
    return listings;
  } catch (err) {
    console.warn(`[bayut-sync] Error fetching ${url}:`, err);
    return [];
  }
}

export async function syncBayutListings(): Promise<number> {
  if (!RAPIDAPI_KEY) {
    console.warn("[bayut-sync] RAPIDAPI_KEY not set — skipping sync");
    return 0;
  }

  const endpoints = [
    `${BASE_URL}/search-properties?location_id=50&purpose=for-sale&page=1`,
    `${BASE_URL}/properties/list?locationExternalIDs=5002&purpose=for-sale&rentFrequency=monthly&page=1`,
    `${BASE_URL}/search-listings?location_id=50&purpose=for-sale`,
  ];

  let allListings: BayutProperty[] = [];

  for (const endpoint of endpoints) {
    const results = await tryEndpoint(endpoint);
    if (results.length > 0) {
      allListings = results;
      break; // Use first successful endpoint
    }
  }

  if (allListings.length === 0) {
    console.warn("[bayut-sync] No listings retrieved from any endpoint");
    return 0;
  }

  let synced = 0;

  for (const prop of allListings) {
    const row = mapProperty(prop);
    if (!row) continue;

    try {
      await db
        .insert(listingsTable)
        .values(row)
        .onConflictDoUpdate({
          target: listingsTable.listingUrl,
          set: {
            listedPrice: row.listedPrice,
            pricePerSqft: row.pricePerSqft,
            lastSeen: row.lastSeen,
            isActive: true,
          },
        });
      synced++;
    } catch (err) {
      console.warn(`[bayut-sync] Failed to upsert listing ${row.listingUrl}:`, err);
    }
  }

  console.log(`[bayut-sync] Synced ${synced} listings`);
  return synced;
}

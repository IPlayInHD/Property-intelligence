import { db } from "@workspace/db";
import { listingsTable } from "@workspace/db";

const RAPIDAPI_HOST = "uae-real-estate-data-api1.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

// Actual API response shape from UAE Real Estate Data API (PropertyFinder data)
interface PFProperty {
  property_id?: string;
  property_type?: string;
  price?: { value?: number; currency?: string; period?: string };
  address?: { full_name?: string; coordinates?: { lat?: number; lon?: number } };
  images?: string[];
  bedrooms?: number;
  bathrooms?: number;
  area?: { value?: number; unit?: string };
  furnishing?: string;
  floor?: number;
  title?: string;
  description?: string;
  url?: string;
  reference?: string;
}

interface SearchBuyResponse {
  success?: boolean;
  total_count?: number;
  data?: PFProperty[];
}

function parseEmirate(address: string): string {
  const a = address.toLowerCase();
  if (a.includes("abu dhabi")) return "Abu Dhabi";
  if (a.includes("sharjah")) return "Sharjah";
  if (a.includes("ajman")) return "Ajman";
  return "Dubai";
}

function parseCommunity(address: string): string | null {
  // address format: "Building Name, Community, City, Emirate"
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) return parts[parts.length - 2] ?? null;
  return null;
}

function parseBuildingName(address: string): string | null {
  const parts = address.split(",").map((p) => p.trim());
  return parts[0] ?? null;
}

function mapPropertyType(t?: string): string | null {
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.includes("villa")) return "villa";
  if (lower.includes("townhouse")) return "townhouse";
  if (lower.includes("penthouse")) return "penthouse";
  if (lower.includes("studio")) return "studio";
  return "apartment";
}

function mapFurnished(f?: string): boolean | null {
  if (!f) return null;
  const lower = f.toLowerCase();
  if (lower === "furnished") return true;
  if (lower === "unfurnished") return false;
  return null;
}

function mapProperty(prop: PFProperty): typeof listingsTable.$inferInsert | null {
  const price = prop.price?.value ?? 0;
  if (price === 0) return null;

  const id = prop.property_id ?? prop.reference ?? "";
  if (!id) return null;

  const address = prop.address?.full_name ?? "";
  const area = prop.area?.value ?? 0;
  const pricePerSqft = area > 0 ? Math.round(price / area) : null;
  const today = new Date().toISOString().split("T")[0];

  const listingUrl = prop.url
    ? prop.url.startsWith("http") ? prop.url : `https://www.propertyfinder.ae${prop.url}`
    : `https://www.propertyfinder.ae/en/property-details-${id}.html`;

  return {
    source: "propertyfinder",
    listingUrl,
    community: parseCommunity(address),
    emirate: parseEmirate(address),
    buildingName: parseBuildingName(address),
    propertyType: mapPropertyType(prop.property_type),
    bedrooms: prop.bedrooms ?? null,
    sizeSqft: area > 0 ? area.toFixed(2) : null,
    listedPrice: price.toFixed(2),
    pricePerSqft: pricePerSqft != null ? pricePerSqft.toFixed(2) : null,
    viewType: null,
    furnished: mapFurnished(prop.furnishing),
    firstSeen: today,
    lastSeen: today,
    daysListed: 0,
    isActive: true,
  };
}

export async function syncBayutListings(): Promise<number> {
  const key = process.env.RAPIDAPI_KEY ?? "";
  if (!key) {
    console.warn("[pf-sync] RAPIDAPI_KEY not set — skipping sync");
    return 0;
  }

  const headers = {
    "x-rapidapi-key": key,
    "x-rapidapi-host": RAPIDAPI_HOST,
    "Content-Type": "application/json",
  };

  // Fetch multiple pages across key communities
  const urls = [
    `${BASE_URL}/search-buy?location_id=50&property_type=apartment&page=1&sort=newest`,
    `${BASE_URL}/search-buy?location_id=50&property_type=villa&page=1&sort=newest`,
    `${BASE_URL}/search-buy?location_id=50&property_type=apartment&page=2&sort=newest`,
  ];

  let allProps: PFProperty[] = [];

  for (const url of urls) {
    console.log(`[pf-sync] Fetching: ${url}`);
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(`[pf-sync] ${res.status} from ${url}: ${text.slice(0, 200)}`);
        continue;
      }
      const json = (await res.json()) as SearchBuyResponse;
      const items = json.data ?? [];
      console.log(`[pf-sync] Got ${items.length} listings`);
      allProps = allProps.concat(items);
    } catch (err) {
      console.warn(`[pf-sync] Error fetching ${url}:`, err);
    }
  }

  if (allProps.length === 0) {
    console.warn("[pf-sync] No listings retrieved");
    return 0;
  }

  let synced = 0;
  for (const prop of allProps) {
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
      console.warn(`[pf-sync] Failed to upsert ${row.listingUrl}:`, err);
    }
  }

  console.log(`[pf-sync] Synced ${synced} listings`);
  return synced;
}

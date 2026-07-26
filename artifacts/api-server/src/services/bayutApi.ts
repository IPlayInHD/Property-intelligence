/**
 * #7 — Bayut API (RapidAPI, apidojo)  ·  UNOFFICIAL
 * Host: bayut.p.rapidapi.com  ·  Auth: RAPIDAPI_KEY (same key as #1)
 * Endpoints: auto-complete, properties/list, properties/detail, agencies/list, agents/list.
 *
 * Bayut's apidojo API requires a location `externalID` (obtained from
 * auto-complete) to list properties — so the typical flow is:
 *   autoComplete("Dubai Marina") -> take result.externalID -> propertiesList({ locationExternalIDs })
 */
import { apiConfig } from "./config";
import { rapidGet } from "./rapidapi";

const HOST = apiConfig.bayutHost;

export interface BayutLocation { externalID: string; name: string; raw: unknown; }
export interface BayutListing {
  externalID?: string; title?: string; price?: number; rooms?: number; baths?: number;
  area?: number; purpose?: string; location?: string; raw: unknown;
}

/** Resolve a free-text place (e.g. "Dubai Marina") to Bayut location externalIDs. */
export async function autoComplete(query: string): Promise<BayutLocation[]> {
  const data = await rapidGet<{ hits?: Record<string, unknown>[] }>(HOST, "/auto-complete", { query, hitsPerPage: 10 });
  const hits = data?.hits || [];
  return hits.map((h) => ({ externalID: String(h.externalID ?? ""), name: String(h.name ?? ""), raw: h }));
}

/** List properties for a location. `purpose` is "for-sale" or "for-rent". */
export async function propertiesList(opts: {
  locationExternalIDs: string;
  purpose?: "for-sale" | "for-rent";
  hitsPerPage?: number;
  page?: number;
  categoryExternalID?: number; // 4 = residential apartments, 16 = villas (verify in playground)
  roomsMin?: number;
  priceMin?: number;
  priceMax?: number;
}): Promise<BayutListing[]> {
  const data = await rapidGet<{ hits?: Record<string, unknown>[] }>(HOST, "/properties/list", {
    locationExternalIDs: opts.locationExternalIDs,
    purpose: opts.purpose ?? "for-sale",
    hitsPerPage: opts.hitsPerPage ?? 25,
    page: opts.page ?? 0,
    categoryExternalID: opts.categoryExternalID,
    roomsMin: opts.roomsMin,
    priceMin: opts.priceMin,
    priceMax: opts.priceMax,
    lang: "en",
  });
  const hits = data?.hits || [];
  return hits.map((h) => ({
    externalID: h.externalID as string,
    title: h.title as string,
    price: h.price as number,
    rooms: h.rooms as number,
    baths: h.baths as number,
    area: h.area as number,
    purpose: h.purpose as string,
    location: Array.isArray(h.location) ? (h.location as Record<string, unknown>[]).map((l) => l.name).join(", ") : undefined,
    raw: h,
  }));
}

/** Full detail for one property by its Bayut externalID. */
export async function propertyDetail(externalID: string): Promise<unknown | null> {
  return rapidGet(HOST, "/properties/detail", { externalID });
}

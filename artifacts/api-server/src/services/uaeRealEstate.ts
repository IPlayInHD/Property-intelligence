/**
 * #1 — UAE Real Estate API (RapidAPI, happyendpoint)
 * Host: uae-real-estate-api.p.rapidapi.com  ·  Auth: RAPIDAPI_KEY
 * Function: search UAE property listings and agencies.
 *
 * NOTE: response shapes below are best-effort from the API docs. After your
 * first live call, log the raw payload and adjust the `map*` helpers if the
 * field names differ. `rapidGet` returns null on any failure so callers stay safe.
 */
import { apiConfig } from "./config";
import { rapidGet } from "./rapidapi";

const HOST = apiConfig.uaeRealEstateHost;

export interface AgencyResult {
  name?: string;
  location?: string;
  raw: unknown;
}

/** Search agencies (documented example endpoint: /search-agencies). */
export async function searchAgencies(query: string): Promise<AgencyResult[]> {
  const data = await rapidGet<{ data?: unknown[]; results?: unknown[] }>(HOST, "/search-agencies", { query });
  if (!data) return [];
  const rows = (data.data || data.results || []) as Record<string, unknown>[];
  return rows.map((r) => ({ name: r.name as string, location: r.location as string, raw: r }));
}

/**
 * Generic passthrough for any other endpoint on this API (e.g. property search),
 * so you can wire additional endpoints once you confirm their paths in the
 * RapidAPI playground without editing this file.
 */
export async function uaeRealEstateGet<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T | null> {
  return rapidGet<T>(HOST, path, params);
}

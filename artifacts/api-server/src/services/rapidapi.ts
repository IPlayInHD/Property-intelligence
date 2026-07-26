/**
 * Shared RapidAPI client — used by the UAE Real Estate API (#1) and Bayut (#7),
 * which share a single RAPIDAPI_KEY.
 */
import axios, { type AxiosRequestConfig } from "axios";
import { apiConfig } from "./config";

if (!apiConfig.rapidApiKey) {
  console.warn("MISSING: RAPIDAPI_KEY not set — UAE Real Estate (#1) and Bayut (#7) APIs are disabled.");
}

export function isRapidApiEnabled(): boolean {
  return !!apiConfig.rapidApiKey;
}

/**
 * GET a RapidAPI endpoint. Returns `null` on any failure (missing key, network,
 * non-2xx) so callers degrade gracefully rather than throwing.
 */
export async function rapidGet<T = unknown>(
  host: string,
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  opts: AxiosRequestConfig = {},
): Promise<T | null> {
  if (!apiConfig.rapidApiKey) return null;
  const url = `https://${host}${path.startsWith("/") ? path : "/" + path}`;
  try {
    const res = await axios.get(url, {
      params,
      timeout: 12000,
      headers: {
        "X-RapidAPI-Key": apiConfig.rapidApiKey,
        "X-RapidAPI-Host": host,
      },
      ...opts,
    });
    return res.data as T;
  } catch (err) {
    console.warn(`RapidAPI GET ${host}${path} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

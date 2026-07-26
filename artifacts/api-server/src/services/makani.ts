/**
 * #13 — Makani API (Dubai Municipality geo-addressing, GOVERNMENT)  ·  OAuth 2.0
 * SCAFFOLD: request access via MakaniTeam@dm.gov.ae. Converts Makani numbers
 * ↔ coordinates and returns building summaries / entry points / transport access.
 * Useful to enrich the Quality-of-Life module with precise building geolocation.
 */
import axios from "axios";
import { apiConfig } from "./config";

const TOKEN_URL = process.env.MAKANI_TOKEN_URL || "https://www.makani.ae/api/oauth/token";
const BASE = process.env.MAKANI_BASE_URL || "https://www.makani.ae/api";

let token: string | null = null;
let tokenExpiresAt = 0;

export function isMakaniEnabled(): boolean { return !!(apiConfig.makani.clientId && apiConfig.makani.clientSecret); }

async function getToken(): Promise<string | null> {
  if (!isMakaniEnabled()) return null;
  if (token && Date.now() < tokenExpiresAt) return token;
  try {
    const res = await axios.post(TOKEN_URL, null, {
      params: { grant_type: "client_credentials", client_id: apiConfig.makani.clientId, client_secret: apiConfig.makani.clientSecret },
      timeout: 12000,
    });
    token = res.data.access_token;
    tokenExpiresAt = Date.now() + ((res.data.expires_in ?? 1800) - 60) * 1000;
    return token;
  } catch (err) {
    console.warn("Makani token fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Resolve a 10-digit Makani number to coordinates + building info. */
export async function lookupMakani(makaniNumber: string): Promise<unknown | null> {
  const t = await getToken();
  if (!t) { console.warn("Makani (#13) not configured — set MAKANI_CLIENT_ID/SECRET."); return null; }
  try {
    const res = await axios.get(`${BASE}/makani/${makaniNumber}`, { timeout: 12000, headers: { Authorization: `Bearer ${t}` } });
    return res.data;
  } catch (err) {
    console.warn("Makani lookup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

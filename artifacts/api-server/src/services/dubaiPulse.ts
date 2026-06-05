import axios from "axios";

const BASE_URL = "https://api.dubaipulse.gov.ae";
let accessToken: string | null = null;
let tokenExpiresAt = 0;

if (!process.env.DUBAI_PULSE_API_KEY || !process.env.DUBAI_PULSE_API_SECRET) {
  console.warn("MISSING: DUBAI_PULSE_API_KEY and/or DUBAI_PULSE_API_SECRET not set — using cached DLD data only");
}

async function refreshToken(): Promise<string | null> {
  if (!process.env.DUBAI_PULSE_API_KEY || !process.env.DUBAI_PULSE_API_SECRET) {
    return null;
  }

  try {
    const response = await axios.post(`${BASE_URL}/oauth/client_credential/accesstoken`, null, {
      params: {
        grant_type: "client_credentials",
        client_id: process.env.DUBAI_PULSE_API_KEY,
        client_secret: process.env.DUBAI_PULSE_API_SECRET,
      },
      timeout: 10000,
    });
    accessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + 25 * 60 * 1000; // 25 minutes
    return accessToken;
  } catch (err) {
    console.warn("Dubai Pulse token refresh failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  return refreshToken();
}

export interface DldTransactionRecord {
  transaction_id?: string;
  community: string;
  building_name?: string;
  property_type: string;
  bedrooms?: number;
  size_sqft?: number;
  sale_price: number;
  price_per_sqft?: number;
  transaction_date: string;
  emirate?: string;
  floor_number?: number;
}

export async function fetchDldTransactions(params: {
  community?: string;
  property_type?: string;
  bedrooms?: number;
  emirate?: string;
  from_date?: string;
  limit?: number;
}): Promise<DldTransactionRecord[]> {
  const token = await getAccessToken();
  if (!token) {
    console.warn("Dubai Pulse: no token available, returning empty results");
    return [];
  }

  try {
    const response = await axios.get(`${BASE_URL}/dataset/DLD_TRANSACTIONS`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        community: params.community,
        property_type: params.property_type,
        beds: params.bedrooms,
        emirate: params.emirate ?? "Dubai",
        from_date: params.from_date,
        limit: params.limit ?? 100,
      },
      timeout: 15000,
    });
    return response.data?.data ?? response.data ?? [];
  } catch (err) {
    console.warn("Dubai Pulse fetch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * #3 — Dubai API Gallery: DLD Developer Details (GOVERNMENT)
 * Digital Dubai iPaaS · OAuth 2.0 client-credentials.
 * Base: apis.dubai.gov.ae/secure/dld/developerdetails/1.0.0
 *
 * Returns details of real-estate developers and their projects registered with
 * the Dubai Land Department. Credentials come from the Digital Dubai developer
 * portal (env: DUBAI_DLD_CLIENT_ID / DUBAI_DLD_CLIENT_SECRET / DUBAI_DLD_DDA_KEY).
 *
 * ⚠️ Government endpoints are geo-restricted to the UAE and the exact token URL /
 * request shape must be confirmed against the portal's API docs on first use.
 */
import axios from "axios";
import { apiConfig } from "./config";

let token: string | null = null;
let tokenExpiresAt = 0;

const cfg = apiConfig.dldGov;

if (!cfg.clientId || !cfg.clientSecret) {
  console.warn("MISSING: DUBAI_DLD_CLIENT_ID/SECRET not set — DLD Developer Details API (#3) disabled.");
}

async function getToken(): Promise<string | null> {
  if (!cfg.clientId || !cfg.clientSecret) return null;
  if (token && Date.now() < tokenExpiresAt) return token;
  try {
    const res = await axios.post(cfg.tokenUrl, null, {
      params: { grant_type: "client_credentials", client_id: cfg.clientId, client_secret: cfg.clientSecret },
      timeout: 12000,
    });
    token = res.data.access_token;
    tokenExpiresAt = Date.now() + ((res.data.expires_in ?? 1800) - 60) * 1000;
    return token;
  } catch (err) {
    console.warn("DLD gov token fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Look up developer details. `path`/`params` map to the portal's endpoints. */
export async function getDeveloperDetails(path = "/developers", params: Record<string, string | number> = {}): Promise<unknown | null> {
  const t = await getToken();
  if (!t) return null;
  try {
    const res = await axios.get(`${cfg.baseUrl}${path}`, {
      params,
      timeout: 12000,
      headers: { Authorization: `Bearer ${t}`, "x-DDA-Key": cfg.ddaKey },
    });
    return res.data;
  } catch (err) {
    console.warn("DLD gov getDeveloperDetails failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

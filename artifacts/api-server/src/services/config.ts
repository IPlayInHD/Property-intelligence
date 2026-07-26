/**
 * Central configuration for all external data-provider APIs.
 *
 * Every secret is read from an environment variable — NEVER hard-code keys.
 * Set these in your host (Replit/Netlify/…) → Environment variables.
 *
 * See docs/API-INTEGRATION.md for the full provider list, how to obtain each
 * key, and which analysis modules consume it.
 */

export const apiConfig = {
  // #1 UAE Real Estate API + #7 Bayut API — both on RapidAPI, one shared key
  rapidApiKey: process.env.RAPIDAPI_KEY || "",
  uaeRealEstateHost: process.env.UAE_RE_RAPIDAPI_HOST || "uae-real-estate-api.p.rapidapi.com",
  bayutHost: process.env.BAYUT_RAPIDAPI_HOST || "bayut.p.rapidapi.com",

  // #2 Google Geocoding / Places
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY || "",

  // #3 Dubai API Gallery — DLD Developer Details (Digital Dubai OAuth 2.0)
  dldGov: {
    clientId: process.env.DUBAI_DLD_CLIENT_ID || "",
    clientSecret: process.env.DUBAI_DLD_CLIENT_SECRET || "",
    ddaKey: process.env.DUBAI_DLD_DDA_KEY || "",
    tokenUrl: process.env.DUBAI_DLD_TOKEN_URL || "https://apis.dubai.gov.ae/oauth2/token",
    baseUrl: process.env.DUBAI_DLD_BASE_URL || "https://apis.dubai.gov.ae/secure/dld/developerdetails/1.0.0",
  },

  // #4 Zyla UAE Real Estate Data API (Bearer token)
  zylaKey: process.env.ZYLA_API_KEY || "",

  // #9 Reelly (off-plan / primary market)
  reellyKey: process.env.REELLY_API_KEY || "",

  // #13 Makani — Dubai Municipality geo-addressing (OAuth 2.0)
  makani: {
    clientId: process.env.MAKANI_CLIENT_ID || "",
    clientSecret: process.env.MAKANI_CLIENT_SECRET || "",
  },

  // Deferred (paid / partner / license) — documented, not wired yet:
  //   #6 DLD API Gateway, #8 PropertyFinder Enterprise, #10 Madhmoun, #14 REIDIN
} as const;

/** Report which providers are configured — handy for a /health or admin check. */
export function apiStatus() {
  return {
    rapidApi: !!apiConfig.rapidApiKey,          // #1 + #7
    googlePlaces: !!apiConfig.googlePlacesKey,   // #2
    dldGovOAuth: !!(apiConfig.dldGov.clientId && apiConfig.dldGov.clientSecret), // #3
    zyla: !!apiConfig.zylaKey,                    // #4
    reelly: !!apiConfig.reellyKey,                // #9
    makani: !!(apiConfig.makani.clientId && apiConfig.makani.clientSecret),      // #13
  };
}

/** Throw a consistent, descriptive error when a provider isn't configured. */
export function requireKey(value: string, envName: string, provider: string): string {
  if (!value) {
    throw new Error(`${provider} is not configured — set ${envName} in your environment variables (see docs/API-INTEGRATION.md).`);
  }
  return value;
}

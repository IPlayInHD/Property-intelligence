import axios from "axios";

const BASE_URL = "https://maps.googleapis.com/maps/api";

if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.warn("MISSING: GOOGLE_PLACES_API_KEY not set — QoL scores will use OpenStreetMap fallback only");
}

export interface PlaceResult {
  name: string;
  types: string[];
  rating?: number;
  vicinity?: string;
  geometry: { location: { lat: number; lng: number } };
}

export async function nearbySearch(params: {
  lat: number;
  lng: number;
  radius: number;
  type: string;
}): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.get(`${BASE_URL}/place/nearbysearch/json`, {
      params: {
        location: `${params.lat},${params.lng}`,
        radius: params.radius,
        type: params.type,
        key: apiKey,
      },
      timeout: 10000,
    });
    return response.data?.results ?? [];
  } catch (err) {
    console.warn("Google Places nearbySearch failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getDistanceToMetro(
  lat: number,
  lng: number,
  metroStations: Array<{ lat: number; lng: number }>
): Promise<number | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !metroStations.length) return null;

  try {
    const destinations = metroStations
      .slice(0, 5)
      .map((s) => `${s.lat},${s.lng}`)
      .join("|");

    const response = await axios.get(`${BASE_URL}/distancematrix/json`, {
      params: {
        origins: `${lat},${lng}`,
        destinations,
        mode: "walking",
        key: apiKey,
      },
      timeout: 10000,
    });

    const elements = response.data?.rows?.[0]?.elements ?? [];
    const distances = elements
      .filter((e: { status: string; distance?: { value: number } }) => e.status === "OK")
      .map((e: { distance: { value: number } }) => e.distance.value);

    return distances.length ? Math.min(...distances) : null;
  } catch (err) {
    console.warn("Google Distance Matrix failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

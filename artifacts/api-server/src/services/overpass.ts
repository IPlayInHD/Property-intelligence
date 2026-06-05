import axios from "axios";

const BASE_URL = "https://overpass-api.de/api/interpreter";

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

async function overpassQuery(query: string): Promise<OsmElement[]> {
  try {
    const response = await axios.post(BASE_URL, `data=${encodeURIComponent(query)}`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    return response.data?.elements ?? [];
  } catch (err) {
    console.warn("Overpass API query failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getMetroStations(lat: number, lng: number, radiusM = 2000): Promise<OsmElement[]> {
  const query = `[out:json][timeout:10];
node["railway"="station"](around:${radiusM},${lat},${lng});
out;`;
  return overpassQuery(query);
}

export async function getBusStops(lat: number, lng: number, radiusM = 500): Promise<OsmElement[]> {
  const query = `[out:json][timeout:10];
node["highway"="bus_stop"](around:${radiusM},${lat},${lng});
out;`;
  return overpassQuery(query);
}

export async function getParks(lat: number, lng: number, radiusM = 1000): Promise<OsmElement[]> {
  const query = `[out:json][timeout:10];
(
  way["leisure"="park"](around:${radiusM},${lat},${lng});
  node["leisure"="park"](around:${radiusM},${lat},${lng});
);
out center;`;
  return overpassQuery(query);
}

export async function getMajorRoads(lat: number, lng: number, radiusM = 500): Promise<OsmElement[]> {
  const query = `[out:json][timeout:10];
way["highway"~"motorway|trunk|primary"](around:${radiusM},${lat},${lng});
out;`;
  return overpassQuery(query);
}

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

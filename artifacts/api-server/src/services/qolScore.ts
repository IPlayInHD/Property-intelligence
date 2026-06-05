import { db } from "@workspace/db";
import { qolCacheTable, communitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { nearbySearch } from "./googlePlaces";
import {
  getMetroStations, getBusStops, getParks, getMajorRoads, distanceM,
} from "./overpass";

export interface QolScoreResult {
  totalScore: number;
  transportScore: number;
  educationScore: number;
  healthcareScore: number;
  retailScore: number;
  recreationScore: number;
  noiseScore: number;
  amenitiesData: object;
  warning: string | null;
}

async function getCommunityCoords(community: string, emirate: string): Promise<{ lat: number; lng: number } | null> {
  const rows = await db
    .select()
    .from(communitiesTable)
    .where(and(eq(communitiesTable.name, community), eq(communitiesTable.emirate, emirate)))
    .limit(1);

  if (!rows.length) return null;
  return { lat: parseFloat(String(rows[0].latitude)), lng: parseFloat(String(rows[0].longitude)) };
}

async function scoreTransport(lat: number, lng: number): Promise<number> {
  const metroStations = await getMetroStations(lat, lng, 2000);
  const busStops = await getBusStops(lat, lng, 200);

  let score = 0;
  if (metroStations.length > 0) {
    const nearest = metroStations.reduce((min, s) => {
      const d = distanceM(lat, lng, s.lat!, s.lon!);
      return d < min ? d : min;
    }, Infinity);

    if (nearest <= 500) score = 20;
    else if (nearest <= 1000) score = 15;
    else if (nearest <= 2000) score = 10;
    else score = 5;
  } else {
    score = 3;
  }

  if (busStops.length > 0) score = Math.min(score + 3, 20);

  return score;
}

async function scoreEducation(lat: number, lng: number): Promise<number> {
  const schools = await nearbySearch({ lat, lng, radius: 2000, type: "school" });
  const ratedSchools = schools.filter((s) => (s.rating ?? 0) >= 4.0);
  return Math.min(schools.length * 4 + ratedSchools.length * 2, 20);
}

async function scoreHealthcare(lat: number, lng: number): Promise<number> {
  const hospitals = await nearbySearch({ lat, lng, radius: 3000, type: "hospital" });
  const clinics = await nearbySearch({ lat, lng, radius: 1000, type: "doctor" });
  return Math.min(hospitals.length * 10 + clinics.length * 3, 20);
}

async function scoreRetail(lat: number, lng: number): Promise<number> {
  const supermarkets = await nearbySearch({ lat, lng, radius: 500, type: "supermarket" });
  const restaurants = await nearbySearch({ lat, lng, radius: 1000, type: "restaurant" });
  const malls = await nearbySearch({ lat, lng, radius: 3000, type: "shopping_mall" });

  let score = 0;
  if (supermarkets.length > 0) score += 10;
  if (restaurants.length > 10) score += 5;
  if (malls.length > 0) score += 5;
  return Math.min(score, 20);
}

async function scoreRecreation(lat: number, lng: number): Promise<number> {
  const parks = await getParks(lat, lng, 1000);
  const gyms = await nearbySearch({ lat, lng, radius: 500, type: "gym" });
  const beaches = await nearbySearch({ lat, lng, radius: 2000, type: "natural_feature" });

  let score = 0;
  if (parks.length > 0) score += 8;
  if (gyms.length > 0) score += 6;
  score += Math.min(beaches.length * 2, 6);
  return Math.min(score, 20);
}

async function scoreNoise(lat: number, lng: number): Promise<number> {
  const majorRoads = await getMajorRoads(lat, lng, 500);
  // DXB airport coordinates
  const airportLat = 25.2532, airportLng = 55.3657;
  const distanceToAirport = distanceM(lat, lng, airportLat, airportLng);

  let roadScore = 10;
  if (majorRoads.length > 0) roadScore = Math.max(0, 10 - majorRoads.length * 3);

  let airportScore = 10;
  if (distanceToAirport < 5000) airportScore = 2;
  else if (distanceToAirport < 10000) airportScore = 5;
  else if (distanceToAirport < 20000) airportScore = 8;

  return Math.min(roadScore + airportScore, 20);
}

export async function calculateQolScore(community: string, emirate: string): Promise<QolScoreResult> {
  // Check cache first (30-day TTL)
  const cached = await db
    .select()
    .from(qolCacheTable)
    .where(and(eq(qolCacheTable.community, community), eq(qolCacheTable.emirate, emirate)))
    .limit(1);

  if (cached.length) {
    const row = cached[0];
    const cachedAt = new Date(row.cachedAt!);
    const ageMs = Date.now() - cachedAt.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (ageMs < thirtyDaysMs) {
      return {
        totalScore: parseFloat(String(row.totalScore ?? 0)),
        transportScore: parseFloat(String(row.transportScore ?? 0)),
        educationScore: parseFloat(String(row.educationScore ?? 0)),
        healthcareScore: parseFloat(String(row.healthcareScore ?? 0)),
        retailScore: parseFloat(String(row.retailScore ?? 0)),
        recreationScore: parseFloat(String(row.recreationScore ?? 0)),
        noiseScore: parseFloat(String(row.noiseScore ?? 0)),
        amenitiesData: (row.amenitiesData as object) ?? {},
        warning: null,
      };
    }
  }

  const coords = await getCommunityCoords(community, emirate);
  if (!coords) {
    return {
      totalScore: 50,
      transportScore: 10, educationScore: 10, healthcareScore: 10,
      retailScore: 10, recreationScore: 10, noiseScore: 0,
      amenitiesData: {},
      warning: "Community coordinates not found — using estimated scores",
    };
  }

  const hasGoogleKey = !!process.env.GOOGLE_PLACES_API_KEY;
  let warning: string | null = null;
  if (!hasGoogleKey) {
    warning = "Google Places API not configured — scores based on OpenStreetMap data only";
  }

  const [transport, education, healthcare, retail, recreation, noise] = await Promise.all([
    scoreTransport(coords.lat, coords.lng),
    scoreEducation(coords.lat, coords.lng),
    scoreHealthcare(coords.lat, coords.lng),
    scoreRetail(coords.lat, coords.lng),
    scoreRecreation(coords.lat, coords.lng),
    scoreNoise(coords.lat, coords.lng),
  ]);

  const total = transport + education + healthcare + retail + recreation + noise;

  // Cache the result
  try {
    await db.insert(qolCacheTable).values({
      community,
      emirate,
      latitude: coords.lat.toString(),
      longitude: coords.lng.toString(),
      transportScore: transport.toString(),
      educationScore: education.toString(),
      healthcareScore: healthcare.toString(),
      retailScore: retail.toString(),
      recreationScore: recreation.toString(),
      noiseScore: noise.toString(),
      totalScore: total.toString(),
      amenitiesData: {},
    }).onConflictDoUpdate({
      target: [qolCacheTable.community, qolCacheTable.emirate],
      set: {
        transportScore: transport.toString(),
        educationScore: education.toString(),
        healthcareScore: healthcare.toString(),
        retailScore: retail.toString(),
        recreationScore: recreation.toString(),
        noiseScore: noise.toString(),
        totalScore: total.toString(),
        amenitiesData: {},
        cachedAt: new Date(),
      },
    });
  } catch {
    // ignore cache write errors
  }

  return {
    totalScore: total, transportScore: transport, educationScore: education,
    healthcareScore: healthcare, retailScore: retail, recreationScore: recreation,
    noiseScore: noise, amenitiesData: {}, warning,
  };
}

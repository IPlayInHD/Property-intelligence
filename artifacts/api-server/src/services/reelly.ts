/**
 * #9 — Reelly API (off-plan / primary market)  ·  Auth: API key header (REELLY_API_KEY)
 * SCAFFOLD: key issued per client by Reelly. Read-only GET REST endpoints.
 * Off-plan catalogue for Dubai, Abu Dhabi, Sharjah & RAK (launches since 2020).
 * Docs: https://docs.reelly.ai/docs/reelly-api-v20-getting-started
 */
import axios from "axios";
import { apiConfig } from "./config";

const BASE = process.env.REELLY_BASE_URL || "https://api.reelly.ai/v2";

export function isReellyEnabled(): boolean { return !!apiConfig.reellyKey; }

export async function reellyGet<T = unknown>(path: string, params: Record<string, string | number> = {}): Promise<T | null> {
  if (!apiConfig.reellyKey) { console.warn("Reelly (#9) not configured — set REELLY_API_KEY."); return null; }
  try {
    const res = await axios.get(`${BASE}${path}`, {
      params, timeout: 12000, headers: { "X-API-Key": apiConfig.reellyKey },
    });
    return res.data as T;
  } catch (err) {
    console.warn("Reelly request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Off-plan projects (verify path + params against Reelly docs on first call). */
export async function getOffPlanProjects(params: Record<string, string | number> = {}): Promise<unknown | null> {
  return reellyGet("/projects", params);
}

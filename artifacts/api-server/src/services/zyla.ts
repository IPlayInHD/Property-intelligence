/**
 * #4 — Zyla UAE Real Estate Data API  ·  Auth: Bearer token (ZYLA_API_KEY)
 * SCAFFOLD: no key yet (7-day trial). Wire endpoints once you activate it.
 * Docs: https://zylalabs.com/api-marketplace/...uae+real+estate+data++api/11013
 */
import axios from "axios";
import { apiConfig } from "./config";

const BASE = process.env.ZYLA_BASE_URL || "https://zylalabs.com/api/11013";

export function isZylaEnabled(): boolean { return !!apiConfig.zylaKey; }

export async function zylaGet<T = unknown>(path: string, params: Record<string, string | number> = {}): Promise<T | null> {
  if (!apiConfig.zylaKey) { console.warn("Zyla (#4) not configured — set ZYLA_API_KEY."); return null; }
  try {
    const res = await axios.get(`${BASE}${path}`, {
      params, timeout: 12000, headers: { Authorization: `Bearer ${apiConfig.zylaKey}` },
    });
    return res.data as T;
  } catch (err) {
    console.warn("Zyla request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

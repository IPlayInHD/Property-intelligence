/**
 * Community normalization — DLD official land-registry area names ↔ the
 * community names portals, users and the engine use.
 *
 * DLD registers transactions under official area names (e.g. Dubai Marina is
 * "Marsa Dubai"). Listings and the analysis engine use marketing names. Without
 * this bridge, `WHERE community = 'Dubai Marina'` matches ZERO DLD rows.
 *
 * Apply `canonicalCommunity()` on BOTH sides — when importing DLD data and when
 * the engine looks up a listing's community — so they meet on the same value.
 *
 * ⚠️ Starter map of high-confidence pairs. Expand it from DLD's official
 * communities/areas reference dataset for full coverage.
 * NOTE: keep in sync with scripts/src/community-map.ts.
 */

// key = lower-cased DLD area name  →  canonical (marketing) community name
const DLD_ALIASES: Record<string, string> = {
  "marsa dubai": "Dubai Marina",
  "burj khalifa": "Downtown Dubai",
  "al thanyah fifth": "Jumeirah Lake Towers",
  "al barsha south fourth": "Jumeirah Village Circle",
  "al barsha south fifth": "Jumeirah Village Triangle",
  "al khairan first": "Dubai Creek Harbour",
  "madinat al mataar": "Dubai South",
  "palm jabal ali": "Palm Jebel Ali",
  "hadaeq sheikh mohammed bin rashid": "Mohammed Bin Rashid City",
  "me'aisem first": "Dubai Production City",
  "wadi al safa 5": "Dubai Land Residence Complex",
  // pass-through (DLD name already matches the common name) — listed for clarity
  "business bay": "Business Bay",
  "palm jumeirah": "Palm Jumeirah",
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bJvc\b/i, "JVC").replace(/\bJlt\b/i, "JLT").replace(/\bDifc\b/i, "DIFC");
}

/** Return the canonical community name for a DLD area name or a portal name. */
export function canonicalCommunity(name: string | null | undefined): string {
  if (!name) return "";
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (DLD_ALIASES[key]) return DLD_ALIASES[key];
  // common portal abbreviations
  if (key === "jvc") return "Jumeirah Village Circle";
  if (key === "jvt") return "Jumeirah Village Triangle";
  if (key === "jlt") return "Jumeirah Lake Towers";
  return titleCase(name.trim());
}

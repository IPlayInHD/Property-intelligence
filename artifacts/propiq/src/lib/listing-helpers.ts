/**
 * Returns the correct search-results URL for a listing on its source platform.
 * These are persistent category pages (not individual listing deep-links that expire).
 * Bayut/PropertyFinder/Dubizzle URLs verified from live search results.
 */
export function getListingSearchUrl(
  source: string | null | undefined,
  community: string | null | undefined,
  propertyType: string | null | undefined,
): string {
  const s = source ?? "";
  const ck = (community ?? "").toLowerCase().trim();
  const pt = (propertyType ?? "apartment").toLowerCase();

  const bayutSlug: Record<string, string> = {
    "dubai marina":    "dubai-marina",
    "downtown dubai":  "downtown-dubai",
    "jvc":             "jumeirah-village-circle",
    "business bay":    "business-bay",
    "palm jumeirah":   "palm-jumeirah",
    "jbr":             "jumeirah-beach-residence",
    "arabian ranches": "arabian-ranches",
    "mirdif":          "mirdif",
    "dubai hills":     "dubai-hills-estate",
  };

  const pfSlug: Record<string, string> = {
    "dubai marina":    "dubai-marina",
    "downtown dubai":  "downtown-dubai",
    "jvc":             "jumeirah-village-circle",
    "business bay":    "business-bay",
    "palm jumeirah":   "palm-jumeirah",
    "jbr":             "jumeirah-beach-residence",
    "arabian ranches": "arabian-ranches",
    "mirdif":          "mirdif",
    "dubai hills":     "dubai-hills-estate",
  };

  // slug + numeric community ID confirmed from Dubizzle URL structure
  const dzInfo: Record<string, { slug: string; id: string }> = {
    "dubai marina":    { slug: "dubai-marina",                id: "61974" },
    "downtown dubai":  { slug: "downtown-dubai",              id: "62008" },
    "jvc":             { slug: "jumeirah-village-circle-jvc", id: "61984" },
    "business bay":    { slug: "business-bay",                id: "61976" },
    "palm jumeirah":   { slug: "palm-jumeirah",               id: "62017" },
    "jbr":             { slug: "jumeirah-beach-residence",    id: "61978" },
    "arabian ranches": { slug: "arabian-ranches",             id: "61962" },
    "mirdif":          { slug: "mirdif",                      id: "61997" },
    "dubai hills":     { slug: "dubai-hills-estate",          id: "62085" },
  };

  if (s === "bayut") {
    const slug = bayutSlug[ck] ?? ck.replace(/\s+/g, "-");
    const t = pt === "villa" ? "villas"
      : pt === "townhouse" ? "townhouses"
      : pt === "studio"    ? "studio-apartments"
      : "apartments";
    return `https://www.bayut.com/for-sale/${t}/dubai/${slug}/`;
  }

  if (s === "propertyfinder") {
    const slug = pfSlug[ck] ?? ck.replace(/\s+/g, "-");
    const t = pt === "villa"      ? "villas"
      : pt === "townhouse" ? "townhouses"
      : "apartments";
    return `https://www.propertyfinder.ae/en/buy/dubai/${t}-for-sale-${slug}.html`;
  }

  // dubizzle (default)
  const info = dzInfo[ck];
  const t = pt === "villa"      ? "villa"
    : pt === "townhouse" ? "townhouse"
    : "apartment";
  if (info) {
    return `https://dubai.dubizzle.com/en/property-for-sale/residential/${t}/in/${info.slug}/${info.id}/`;
  }
  return `https://dubai.dubizzle.com/en/property-for-sale/residential/${t}/`;
}

/**
 * Returns a curated Unsplash CDN photo URL that matches the community/property type.
 * All photo IDs are stable permanent Unsplash assets. The component should add an
 * onError handler to fall back to the colour-gradient placeholder if the image
 * ever fails to load.
 */
const COMMUNITY_PHOTO: Record<string, string> = {
  "Dubai Marina":    "1600596542815-ffad4c1539a9",
  "JBR":             "1512918728672-1cde2d9d7a22",
  "Downtown Dubai":  "1545324418-cc1a3fa10c00",
  "Business Bay":    "1600607687939-ce8a6c25118c",
  "JVC":             "1600210492493-0946911123ea",
  "Palm Jumeirah":   "1512917774080-9991f1c4c750",
  "Arabian Ranches": "1493246507139-91e8fad9978e",
  "Dubai Hills":     "1582268611958-ebfd161ef9cf",
  "Mirdif":          "1600566752355-35792bedcfea",
};

const TYPE_PHOTO: Record<string, string> = {
  villa:     "1512917774080-9991f1c4c750",
  townhouse: "1493246507139-91e8fad9978e",
  penthouse: "1613977257363-707ba9348227",
  studio:    "1600210492493-0946911123ea",
};

export function getListingPhotoUrl(
  community: string | null | undefined,
  propertyType: string | null | undefined,
): string {
  const photoId =
    COMMUNITY_PHOTO[community ?? ""] ??
    TYPE_PHOTO[(propertyType ?? "").toLowerCase()] ??
    "1600596542815-ffad4c1539a9";
  return `https://images.unsplash.com/photo-${photoId}?w=800&q=80&auto=format&fit=crop`;
}

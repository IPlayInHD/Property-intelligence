import { useState, useCallback, useEffect } from "react";
import { useSearch, Link } from "wouter";
import {
  useGetListings,
  useGetCommunities,
  getGetListingsQueryKey,
} from "@workspace/api-client-react";
import type { Listing } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, LayoutGrid, List, BedDouble, Maximize2,
  ChevronLeft, ChevronRight, SlidersHorizontal, X,
  ExternalLink, Zap, TrendingUp,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRICE_MIN = 200_000;
const PRICE_MAX = 20_000_000;
const PRICE_STEP = 100_000;
const SIZE_MIN = 200;
const SIZE_MAX = 10_000;
const SIZE_STEP = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `AED ${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  return `AED ${(v / 1_000).toFixed(0)}K`;
}

function fmtSize(v: number): string {
  return `${v.toLocaleString()} sqft`;
}

function communityGradient(community: string | null | undefined): string {
  const s = community ?? "";
  const h = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const gs = [
    "from-blue-700 via-blue-800 to-slate-900",
    "from-violet-700 via-violet-800 to-slate-900",
    "from-rose-700 via-rose-800 to-slate-900",
    "from-amber-600 via-amber-800 to-slate-900",
    "from-teal-600 via-teal-800 to-slate-900",
    "from-emerald-700 via-emerald-800 to-slate-900",
    "from-cyan-700 via-cyan-800 to-slate-900",
    "from-indigo-700 via-indigo-800 to-slate-900",
  ];
  return gs[h % gs.length];
}

function SourceBadge({ source }: { source: string | null | undefined }) {
  if (!source) return null;
  const map: Record<string, { label: string; cls: string }> = {
    bayut:          { label: "Bayut",    cls: "bg-red-600 text-white" },
    propertyfinder: { label: "Finder",   cls: "bg-blue-700 text-white" },
    dubizzle:       { label: "Dubizzle", cls: "bg-green-700 text-white" },
  };
  const cfg = map[source] ?? { label: source, cls: "bg-muted text-foreground" };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (!score) return null;
  const color = score >= 75 ? "bg-teal-500" : score >= 55 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className={`${color} text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1`}>
      <TrendingUp className="h-3 w-3" />
      {Math.round(score)}
    </div>
  );
}

// ─── Property cards ───────────────────────────────────────────────────────────
function PropertyCard({ listing, view }: { listing: Listing; view: "grid" | "list" }) {
  const gradient = communityGradient(listing.community);
  const hasReport = !!listing.existingAnalysisId;

  if (view === "list") {
    return (
      <div className="group flex gap-4 bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30 rounded-xl p-4 transition-all">
        <Link href={`/listings/${listing.id}`} className="flex-1">
          <div className="flex gap-4">
            <div className={`w-24 h-20 rounded-lg bg-gradient-to-br ${gradient} shrink-0 flex items-center justify-center`}>
              <span className="text-white/80 text-xs font-medium text-center px-2 leading-tight">
                {listing.community}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <SourceBadge source={listing.source} />
                    {hasReport && <ScoreBadge score={listing.existingScore} />}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug">
                    {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} Bed`}{" "}
                    <span className="capitalize">{listing.propertyType}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{listing.buildingName} · {listing.community}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary font-mono text-sm">
                    AED {listing.listedPrice?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    AED {listing.pricePerSqft?.toLocaleString()} /sqft
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {listing.bedrooms !== null && (
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-3 w-3" />
                    {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} BR`}
                  </span>
                )}
                {listing.sizeSqft && (
                  <span className="flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" />
                    {listing.sizeSqft?.toLocaleString()} sqft
                  </span>
                )}
                {listing.viewType && listing.viewType !== "None" && <span>{listing.viewType} view</span>}
                {listing.furnished && <span>Furnished</span>}
                <span className="ml-auto">{listing.daysListed}d listed</span>
              </div>
            </div>
          </div>
        </Link>
        <div className="flex flex-col gap-2 justify-center shrink-0 ml-2">
          {listing.listingUrl && (
            <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full">
                <ExternalLink className="h-3 w-3" />
                View Listing
              </Button>
            </a>
          )}
          <Link href={`/listings/${listing.id}`}>
            <Button size="sm" className="gap-1.5 text-xs w-full" variant={hasReport ? "secondary" : "default"}>
              <Zap className="h-3 w-3" />
              {hasReport ? "View Report" : "Run PropIQ Analysis"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30 rounded-xl overflow-hidden transition-all hover:shadow-md hover:shadow-primary/5 flex flex-col">
      <Link href={`/listings/${listing.id}`}>
        <div className={`relative h-40 bg-gradient-to-br ${gradient} flex items-end p-4 cursor-pointer`}>
          <div className="absolute top-3 left-3 flex gap-1.5">
            <SourceBadge source={listing.source} />
            {hasReport && <ScoreBadge score={listing.existingScore} />}
          </div>
          {listing.viewType && listing.viewType !== "None" && (
            <span className="absolute top-3 right-3 text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded">
              {listing.viewType} view
            </span>
          )}
          <div className="text-white">
            <div className="text-xl font-bold font-mono">AED {listing.listedPrice?.toLocaleString()}</div>
            <div className="text-xs text-white/70 font-mono">{listing.pricePerSqft?.toLocaleString()} /sqft</div>
          </div>
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/listings/${listing.id}`}>
          <h3 className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors">
            {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} Bed`}{" "}
            <span className="capitalize">{listing.propertyType}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{listing.buildingName}</p>
          <p className="text-xs text-muted-foreground">{listing.community}, {listing.emirate}</p>
        </Link>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground border-t border-border/30 pt-3">
          {listing.bedrooms !== null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" />
              {listing.bedrooms === 0 ? "Studio" : listing.bedrooms}
            </span>
          )}
          {listing.sizeSqft && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {listing.sizeSqft?.toLocaleString()}
            </span>
          )}
          {listing.furnished && <span>Furnished</span>}
          <span className="ml-auto">{listing.daysListed}d</span>
        </div>
        <div className="flex gap-2 mt-3">
          {listing.listingUrl && (
            <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                <ExternalLink className="h-3 w-3" />
                View Listing
              </Button>
            </a>
          )}
          <Link href={`/listings/${listing.id}`} className={listing.listingUrl ? "flex-1" : "w-full"}>
            <Button size="sm" className="w-full gap-1.5 text-xs" variant={hasReport ? "secondary" : "default"}>
              <Zap className="h-3 w-3" />
              {hasReport ? "View Report" : "Run PropIQ Analysis"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:opacity-70"><X className="h-3 w-3" /></button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Listings() {
  const searchStr = useSearch();

  const initialQ = new URLSearchParams(searchStr).get("q") ?? "";

  const [search, setSearch] = useState(initialQ);
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [emirate, setEmirate] = useState("");
  const [community, setCommunity] = useState("");
  const [viewType, setViewType] = useState("");
  const [furnished, setFurnished] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [sizeRange, setSizeRange] = useState<[number, number]>([SIZE_MIN, SIZE_MAX]);
  const [priceActive, setPriceActive] = useState(false);
  const [sizeActive, setSizeActive] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(searchStr).get("q") ?? "";
    if (q !== search) setSearch(q);
  }, [searchStr]);

  const { data: communitiesData } = useGetCommunities();
  const communities = (communitiesData ?? []) as { id: number; name: string; emirate: string }[];

  const params: Record<string, string | number> = { page, limit: 24, sort };
  if (search) params.q = search;
  if (propertyType) params.propertyType = propertyType;
  if (bedrooms) params.bedrooms = parseInt(bedrooms);
  if (emirate) params.emirate = emirate;
  if (community) params.community = community;
  if (viewType) params.viewType = viewType;
  if (furnished) params.furnished = furnished;
  if (priceActive) {
    if (priceRange[0] > PRICE_MIN) params.priceMin = priceRange[0];
    if (priceRange[1] < PRICE_MAX) params.priceMax = priceRange[1];
  }
  if (sizeActive) {
    if (sizeRange[0] > SIZE_MIN) params.sizeMin = sizeRange[0];
    if (sizeRange[1] < SIZE_MAX) params.sizeMax = sizeRange[1];
  }

  const { data, isLoading } = useGetListings(params as any, {
    query: { queryKey: getGetListingsQueryKey(params as any) },
  });

  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 24);

  const priceFilterActive = priceActive && (priceRange[0] > PRICE_MIN || priceRange[1] < PRICE_MAX);
  const sizeFilterActive = sizeActive && (sizeRange[0] > SIZE_MIN || sizeRange[1] < SIZE_MAX);
  const activeFilterCount = [propertyType, bedrooms, emirate, community, viewType, furnished].filter(Boolean).length
    + (priceFilterActive ? 1 : 0)
    + (sizeFilterActive ? 1 : 0);

  const clearFilters = useCallback(() => {
    setPropertyType(""); setBedrooms(""); setEmirate(""); setCommunity("");
    setViewType(""); setFurnished("");
    setPriceRange([PRICE_MIN, PRICE_MAX]); setPriceActive(false);
    setSizeRange([SIZE_MIN, SIZE_MAX]); setSizeActive(false);
    setPage(1);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold">Browse Properties</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading..." : `${total.toLocaleString()} active listings`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${showFilters ? "bg-primary/10 border-primary/30" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              className={`px-2.5 py-1.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              className={`px-2.5 py-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search community, building, area..."
            className="pl-9 bg-card/60"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-44 bg-card/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="price-asc">Price: Low → High</SelectItem>
            <SelectItem value="price-desc">Price: High → Low</SelectItem>
            <SelectItem value="size">Largest first</SelectItem>
            <SelectItem value="score">Best PropIQ Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="bg-card/60 border border-border/50 rounded-xl p-5 space-y-5">
          {/* Row 1: Type + Beds + Emirate + Community + View Type */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Property type</label>
              <Select value={propertyType} onValueChange={(v) => { setPropertyType(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50 h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Bedrooms</label>
              <Select value={bedrooms} onValueChange={(v) => { setBedrooms(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50 h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="0">Studio</SelectItem>
                  <SelectItem value="1">1 BR</SelectItem>
                  <SelectItem value="2">2 BR</SelectItem>
                  <SelectItem value="3">3 BR</SelectItem>
                  <SelectItem value="4">4 BR</SelectItem>
                  <SelectItem value="5">5+ BR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Emirate</label>
              <Select value={emirate} onValueChange={(v) => { setEmirate(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50 h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="Dubai">Dubai</SelectItem>
                  <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                  <SelectItem value="Sharjah">Sharjah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Community</label>
              <Select value={community} onValueChange={(v) => { setCommunity(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50 h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  {communities.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">View type</label>
              <Select value={viewType} onValueChange={(v) => { setViewType(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50 h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="Marina">Marina</SelectItem>
                  <SelectItem value="Sea">Sea</SelectItem>
                  <SelectItem value="City">City</SelectItem>
                  <SelectItem value="Garden">Garden</SelectItem>
                  <SelectItem value="None">No view</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Furnished + Price slider + Size slider */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Furnished</label>
              <Select value={furnished} onValueChange={(v) => { setFurnished(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50 h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="true">Furnished</SelectItem>
                  <SelectItem value="false">Unfurnished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">Price range</label>
                <span className="text-xs font-mono text-foreground/80">
                  {fmtPrice(priceRange[0])} – {priceRange[1] >= PRICE_MAX ? "Any" : fmtPrice(priceRange[1])}
                </span>
              </div>
              <Slider
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={priceRange}
                onValueChange={(vals) => {
                  setPriceRange(vals as [number, number]);
                  setPriceActive(true);
                  setPage(1);
                }}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>{fmtPrice(PRICE_MIN)}</span>
                <span>{fmtPrice(PRICE_MAX)}+</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">Size range</label>
                <span className="text-xs font-mono text-foreground/80">
                  {fmtSize(sizeRange[0])} – {sizeRange[1] >= SIZE_MAX ? "Any" : fmtSize(sizeRange[1])}
                </span>
              </div>
              <Slider
                min={SIZE_MIN}
                max={SIZE_MAX}
                step={SIZE_STEP}
                value={sizeRange}
                onValueChange={(vals) => {
                  setSizeRange(vals as [number, number]);
                  setSizeActive(true);
                  setPage(1);
                }}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>{fmtSize(SIZE_MIN)}</span>
                <span>{fmtSize(SIZE_MAX)}+</span>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/30">
              {propertyType && <FilterChip label={propertyType} onRemove={() => setPropertyType("")} />}
              {bedrooms && <FilterChip label={bedrooms === "0" ? "Studio" : `${bedrooms} BR`} onRemove={() => setBedrooms("")} />}
              {emirate && <FilterChip label={emirate} onRemove={() => setEmirate("")} />}
              {community && <FilterChip label={community} onRemove={() => setCommunity("")} />}
              {viewType && <FilterChip label={`${viewType} view`} onRemove={() => setViewType("")} />}
              {furnished === "true" && <FilterChip label="Furnished" onRemove={() => setFurnished("")} />}
              {furnished === "false" && <FilterChip label="Unfurnished" onRemove={() => setFurnished("")} />}
              {priceFilterActive && (
                <FilterChip
                  label={`${fmtPrice(priceRange[0])} – ${priceRange[1] >= PRICE_MAX ? "Any" : fmtPrice(priceRange[1])}`}
                  onRemove={() => { setPriceRange([PRICE_MIN, PRICE_MAX]); setPriceActive(false); }}
                />
              )}
              {sizeFilterActive && (
                <FilterChip
                  label={`${fmtSize(sizeRange[0])} – ${sizeRange[1] >= SIZE_MAX ? "Any" : fmtSize(sizeRange[1])}`}
                  onRemove={() => { setSizeRange([SIZE_MIN, SIZE_MAX]); setSizeActive(false); }}
                />
              )}
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {Array(12).fill(0).map((_, i) => (
            <Skeleton key={i} className={view === "grid" ? "h-80 rounded-xl" : "h-24 rounded-xl"} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">No listings found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
          {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {listings.map((l) => (
            <PropertyCard key={l.id} listing={l} view={view} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="w-9"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

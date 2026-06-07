import { useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useGetListings, getGetListingsQueryKey } from "@workspace/api-client-react";
import type { Listing } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, LayoutGrid, List, BedDouble, Maximize2,
  ChevronLeft, ChevronRight, SlidersHorizontal, X,
  ExternalLink, Zap, TrendingUp,
} from "lucide-react";

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
    bayut:          { label: "Bayut",   cls: "bg-red-600 text-white" },
    propertyfinder: { label: "Finder",  cls: "bg-blue-700 text-white" },
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

function PropertyCard({ listing, view }: { listing: Listing; view: "grid" | "list" }) {
  const gradient = communityGradient(listing.community);

  if (view === "list") {
    return (
      <Link href={`/listings/${listing.id}`}>
        <div className="group flex gap-4 bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30 rounded-xl p-4 cursor-pointer transition-all">
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
                  {listing.existingAnalysisId && <ScoreBadge score={listing.existingScore} />}
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
              {listing.bedrooms !== null && <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} BR`}</span>}
              {listing.sizeSqft && <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{listing.sizeSqft?.toLocaleString()} sqft</span>}
              {listing.viewType && listing.viewType !== "None" && <span>{listing.viewType} view</span>}
              {listing.furnished && <span>Furnished</span>}
              <span className="ml-auto">{listing.daysListed}d listed</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="group bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md hover:shadow-primary/5">
        <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-end p-4`}>
          <div className="absolute top-3 left-3 flex gap-1.5">
            <SourceBadge source={listing.source} />
            {listing.existingAnalysisId && <ScoreBadge score={listing.existingScore} />}
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
        <div className="p-4">
          <h3 className="font-semibold text-sm">
            {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} Bed`}{" "}
            <span className="capitalize">{listing.propertyType}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{listing.buildingName}</p>
          <p className="text-xs text-muted-foreground">{listing.community}, {listing.emirate}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground border-t border-border/30 pt-3">
            {listing.bedrooms !== null && (
              <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{listing.bedrooms === 0 ? "Studio" : listing.bedrooms}</span>
            )}
            {listing.sizeSqft && (
              <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{listing.sizeSqft?.toLocaleString()}</span>
            )}
            {listing.furnished && <span>Furnished</span>}
            <span className="ml-auto">{listing.daysListed}d</span>
          </div>
          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <Zap className="h-3 w-3" />
              {listing.existingAnalysisId ? "View Report" : "Run PropIQ Analysis"}
            </div>
          </div>
        </div>
      </div>
    </Link>
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

export default function Listings() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [emirate, setEmirate] = useState("");
  const [furnished, setFurnished] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = search;

  const params: Record<string, string | number> = { page, limit: 24, sort };
  if (debouncedSearch) params.q = debouncedSearch;
  if (propertyType) params.propertyType = propertyType;
  if (bedrooms) params.bedrooms = parseInt(bedrooms);
  if (emirate) params.emirate = emirate;
  if (furnished) params.furnished = furnished;

  const { data, isLoading } = useGetListings(params as any, {
    query: { queryKey: getGetListingsQueryKey(params as any) },
  });

  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 24);

  const hasFilters = !!(propertyType || bedrooms || emirate || furnished);

  const clearFilters = useCallback(() => {
    setPropertyType("");
    setBedrooms("");
    setEmirate("");
    setFurnished("");
    setPage(1);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
            {hasFilters && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {[propertyType, bedrooms, emirate, furnished].filter(Boolean).length}
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
          <SelectTrigger className="w-40 bg-card/60">
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
        <div className="bg-card/60 border border-border/50 rounded-xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Property type</label>
              <Select value={propertyType} onValueChange={(v) => { setPropertyType(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Any" /></SelectTrigger>
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
              <label className="text-xs text-muted-foreground mb-1 block">Bedrooms</label>
              <Select value={bedrooms} onValueChange={(v) => { setBedrooms(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Any" /></SelectTrigger>
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
              <label className="text-xs text-muted-foreground mb-1 block">Emirate</label>
              <Select value={emirate} onValueChange={(v) => { setEmirate(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="Dubai">Dubai</SelectItem>
                  <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                  <SelectItem value="Sharjah">Sharjah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Furnished</label>
              <Select value={furnished} onValueChange={(v) => { setFurnished(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="true">Furnished</SelectItem>
                  <SelectItem value="false">Unfurnished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {propertyType && <FilterChip label={propertyType} onRemove={() => setPropertyType("")} />}
              {bedrooms && <FilterChip label={bedrooms === "0" ? "Studio" : `${bedrooms} BR`} onRemove={() => setBedrooms("")} />}
              {emirate && <FilterChip label={emirate} onRemove={() => setEmirate("")} />}
              {furnished === "true" && <FilterChip label="Furnished" onRemove={() => setFurnished("")} />}
              {furnished === "false" && <FilterChip label="Unfurnished" onRemove={() => setFurnished("")} />}
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
            <Skeleton key={i} className={view === "grid" ? "h-72 rounded-xl" : "h-24 rounded-xl"} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">No listings found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
          {hasFilters && (
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
          <Button
            variant="outline" size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
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
          <Button
            variant="outline" size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

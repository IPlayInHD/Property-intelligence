import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetListing,
  useCreateAnalysis,
  useGetAnalysis,
  getGetListingQueryKey,
  getGetAnalysisQueryKey,
} from "@workspace/api-client-react";
import type { Listing } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, BedDouble, Maximize2, ExternalLink,
  Zap, CheckCircle2, AlertCircle, TrendingUp,
  Building2, Eye, Sofa, Calendar, BarChart3,
  Crown, X,
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
    bayut:          { label: "Bayut",    cls: "bg-red-600 text-white" },
    propertyfinder: { label: "Property Finder", cls: "bg-blue-700 text-white" },
    dubizzle:       { label: "Dubizzle", cls: "bg-green-700 text-white" },
  };
  const cfg = map[source] ?? { label: source, cls: "bg-muted text-foreground" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Analysis Progress Overlay ────────────────────────────────────────────────
const STEPS = [
  { label: "Pulling 5,396 DLD transactions from database...",      duration: 2200 },
  { label: "Finding comparable sales in the community...",         duration: 2800 },
  { label: "Scoring quality of life across 6 dimensions...",       duration: 3000 },
  { label: "Modelling Bear, Base and Bull scenarios...",           duration: 3200 },
  { label: "Calculating true rental yield and gross return...",    duration: 2000 },
];

function AnalysisOverlay({ analysisId, onDone }: { analysisId: string; onDone: (id: string) => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const animDone = useRef(false);
  const [, setLocation] = useLocation();

  // Drive the step animation
  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setActiveStep(i);
      }, elapsed);
      timers.push(t);
      const tc = setTimeout(() => {
        setCompletedSteps(prev => [...prev, i]);
        if (i === STEPS.length - 1) {
          animDone.current = true;
        }
      }, elapsed + step.duration - 200);
      timers.push(tc);
      elapsed += step.duration;
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Poll the analysis
  const { data: analysis } = useGetAnalysis(analysisId, {
    query: {
      queryKey: getGetAnalysisQueryKey(analysisId),
      refetchInterval: (q) => {
        const status = (q.state.data as any)?.status;
        return status === "pending" ? 2000 : false;
      },
    },
  });

  // Redirect when both animation done and analysis complete
  useEffect(() => {
    if (!analysis) return;
    const status = (analysis as any).status;
    if (status === "complete" || status === "failed") {
      if (animDone.current) {
        setLocation(`/analysis/${analysisId}`);
      } else {
        const totalAnim = STEPS.reduce((a, s) => a + s.duration, 0);
        const remaining = totalAnim - STEPS.slice(0, activeStep + 1).reduce((a, s) => a + s.duration, 0);
        const wait = Math.max(0, remaining);
        setTimeout(() => setLocation(`/analysis/${analysisId}`), wait);
      }
    }
  }, [analysis, analysisId, setLocation, activeStep]);

  const totalDuration = STEPS.reduce((a, s) => a + s.duration, 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-md">
        {/* Logo + title */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-4">
            <BarChart3 className="h-7 w-7 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-serif font-bold">Running PropIQ Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">Our intelligence models are at work…</p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const isComplete = completedSteps.includes(i);
            const isActive = activeStep === i && !isComplete;
            const isPending = i > activeStep;
            return (
              <motion.div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isComplete ? "bg-primary/5 border border-primary/20" :
                  isActive  ? "bg-card border border-primary/40 shadow-sm" :
                              "opacity-30"
                }`}
                animate={isActive ? { scale: [1, 1.01, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="shrink-0 w-5 h-5">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : isActive ? (
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-muted" />
                  )}
                </div>
                <span className={`text-sm ${isComplete ? "text-primary" : isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-8 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: totalDuration / 1000, ease: "linear" }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Typically completes in 10–15 seconds
        </p>
      </div>
    </motion.div>
  );
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div
        className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Crown className="h-6 w-6 text-amber-500" />
        </div>
        <h2 className="text-lg font-serif font-bold mb-2">Monthly limit reached</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You've used all your analyses this month. Upgrade to Analyst or Pro to run more.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/account">
            <Button className="w-full gap-2">
              <Crown className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="w-full">Maybe later</Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Similar card ─────────────────────────────────────────────────────────────
function SimilarCard({ listing }: { listing: Listing }) {
  const gradient = communityGradient(listing.community);
  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="group bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30 rounded-xl overflow-hidden cursor-pointer transition-all">
        <div className={`h-28 bg-gradient-to-br ${gradient} flex items-end p-3`}>
          <div className="text-white">
            <div className="font-bold font-mono text-sm">AED {listing.listedPrice?.toLocaleString()}</div>
            <div className="text-white/70 text-xs">{listing.pricePerSqft?.toLocaleString()} /sqft</div>
          </div>
        </div>
        <div className="p-3">
          <p className="text-xs font-medium">
            {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} Bed`}{" "}
            <span className="capitalize">{listing.propertyType}</span>
          </p>
          <p className="text-xs text-muted-foreground truncate">{listing.buildingName}</p>
          <p className="text-xs text-muted-foreground">{listing.sizeSqft?.toLocaleString()} sqft</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = parseInt(id ?? "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [pendingAnalysisId, setPendingAnalysisId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: listing, isLoading, isError } = useGetListing(numId, {
    query: { queryKey: getGetListingQueryKey(numId), enabled: !isNaN(numId) },
  });

  const createMutation = useCreateAnalysis({
    mutation: {
      onSuccess: (data) => {
        setPendingAnalysisId(data.id);
      },
      onError: (error: any) => {
        if (error?.status === 403 && error?.data?.upgradeRequired) {
          setShowUpgrade(true);
        } else if (error?.status === 401) {
          setLocation(`/login?returnTo=/listings/${id}`);
        } else {
          toast({
            title: "Could not start analysis",
            description: error?.data?.message ?? "Unknown error",
            variant: "destructive",
          });
        }
      },
    },
  });

  const handleRunAnalysis = () => {
    if (!user) {
      setLocation(`/login?returnTo=/listings/${id}`);
      return;
    }
    createMutation.mutate({ data: { listingId: numId } as any });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-32" />
        <div className="h-56 bg-muted rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-24">
        <AlertCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
        <p className="text-lg font-medium">Listing not found</p>
        <Link href="/listings">
          <Button variant="outline" className="mt-4">Back to Browse</Button>
        </Link>
      </div>
    );
  }

  const gradient = communityGradient(listing.community);
  const hasReport = !!(listing as any).existingAnalysisId;
  const existingScore = (listing as any).existingScore;
  const similar = (listing as any).similar ?? [];

  const specs = [
    { icon: BedDouble, label: "Bedrooms", value: listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} BR` },
    { icon: Maximize2, label: "Size", value: listing.sizeSqft ? `${listing.sizeSqft?.toLocaleString()} sqft` : "—" },
    { icon: Building2, label: "Type", value: <span className="capitalize">{listing.propertyType}</span> },
    { icon: Eye, label: "View", value: listing.viewType || "—" },
    { icon: Sofa, label: "Furnished", value: listing.furnished ? "Yes" : "No" },
    { icon: Calendar, label: "Days listed", value: `${listing.daysListed ?? 0} days` },
  ];

  return (
    <>
      {/* Analysis overlay */}
      <AnimatePresence>
        {pendingAnalysisId && (
          <AnalysisOverlay analysisId={pendingAnalysisId} onDone={(id) => setLocation(`/analysis/${id}`)} />
        )}
      </AnimatePresence>

      {/* Upgrade modal */}
      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back nav */}
        <Link href="/listings">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </button>
        </Link>

        {/* Hero card */}
        <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient}`}>
          <div className="px-8 py-10">
            {/* Top row */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <SourceBadge source={listing.source} />
                {hasReport && (
                  <div className="bg-teal-500 text-white text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    PropIQ Score: {existingScore ? Math.round(existingScore) : "—"}
                  </div>
                )}
              </div>
              {listing.listingUrl && (
                <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                  <button className="text-white/70 hover:text-white text-xs flex items-center gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View original
                  </button>
                </a>
              )}
            </div>

            {/* Price + title */}
            <div className="text-white">
              <p className="text-4xl font-bold font-mono mb-1">
                AED {listing.listedPrice?.toLocaleString()}
              </p>
              <p className="text-white/70 font-mono text-sm mb-4">
                AED {listing.pricePerSqft?.toLocaleString()} per sqft
              </p>
              <h1 className="text-2xl font-serif font-bold mb-1">
                {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} Bedroom`}{" "}
                <span className="capitalize">{listing.propertyType}</span>
              </h1>
              <p className="text-white/80">{listing.buildingName}</p>
              <p className="text-white/60 text-sm">{listing.community}, {listing.emirate}</p>
            </div>

            {/* CTA */}
            <div className="mt-8 flex gap-3">
              {hasReport ? (
                <Link href={`/analysis/${(listing as any).existingAnalysisId}`}>
                  <Button size="lg" className="gap-2 bg-white text-slate-900 hover:bg-white/90">
                    <BarChart3 className="h-5 w-5" />
                    View Analysis Report
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="gap-2 bg-white text-slate-900 hover:bg-white/90"
                  onClick={handleRunAnalysis}
                  disabled={createMutation.isPending}
                >
                  <Zap className="h-5 w-5" />
                  Run PropIQ Analysis
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {specs.map((s) => (
            <Card key={s.label} className="bg-card/60 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <s.icon className="h-4 w-4" />
                  <span className="text-xs">{s.label}</span>
                </div>
                <div className="font-semibold text-sm">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What PropIQ analyses */}
        {!hasReport && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-serif font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                What PropIQ will analyse
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  "Price Fairness vs DLD data",
                  "Quality of Life Score",
                  "3-Year Price Forecast",
                  "Rental Yield Calculation",
                  "Market Liquidity Score",
                  "Community Trends",
                ].map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {m}
                  </div>
                ))}
              </div>
              <Button
                className="mt-6 gap-2"
                onClick={handleRunAnalysis}
                disabled={createMutation.isPending}
              >
                <Zap className="h-4 w-4" />
                Run PropIQ Analysis — Free for Pro users
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Similar properties */}
        {similar.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-serif font-bold">Similar in {listing.community}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {similar.map((s: Listing) => <SimilarCard key={s.id} listing={s} />)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

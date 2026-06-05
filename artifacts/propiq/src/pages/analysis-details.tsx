import { useParams, useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import {
  useGetAnalysis, getGetAnalysisQueryKey,
  useGetCommunities,
  useRunPriceFairness, useRunQolScore, useRunForecast,
  useRunLiquidity, useRunRentalYield, useRunTrends,
  useDeleteAnalysis,
} from "@workspace/api-client-react";
import CommunityMap from "@/components/ui/CommunityMap";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Download, Share2, TrendingUp, TrendingDown,
  Minus, AlertCircle, Info, Lock, ExternalLink,
} from "lucide-react";
import { Link } from "wouter";

function formatAed(val: number): string {
  if (val >= 1_000_000) return `AED ${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `AED ${(val / 1_000).toFixed(0)}K`;
  return `AED ${val.toLocaleString()}`;
}

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const stroke = pct >= 70 ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444";
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={stroke} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold">{Math.round(pct)}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

function FairnessGauge({ score }: { score: number }) {
  const clamped = Math.min(30, Math.max(-30, score));
  const pct = ((clamped + 30) / 60) * 100;

  let color = "#22C55E";
  let label = "Good Value";
  if (score > 10) { color = "#EF4444"; label = "Significantly Overpriced"; }
  else if (score > 5) { color = "#F59E0B"; label = "Slightly Overpriced"; }
  else if (score >= -5) { color = "#22C55E"; label = "Fairly Priced"; }
  else if (score >= -10) { color = "#0A8A8A"; label = "Good Value"; }
  else { color = "#0A8A8A"; label = "Significant Opportunity"; }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <span className="font-mono text-5xl font-bold" style={{ color }}>
          {score > 0 ? "+" : ""}{score.toFixed(1)}%
        </span>
        <Badge
          className="mb-2 text-sm"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
        >
          {label}
        </Badge>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden bg-muted">
        <div className="absolute inset-y-0 left-1/3 right-1/3 bg-green-500/20 rounded" />
        <div
          className="absolute top-0 h-full w-1 rounded"
          style={{ left: `${pct}%`, background: color, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>-30% Opportunity</span>
        <span>Fair Value</span>
        <span>+30% Overpriced</span>
      </div>
    </div>
  );
}

function SubScoreBar({ label, value, max = 20, tooltip }: { label: string; value: number; max?: number; tooltip: string }) {
  const pct = (value / max) * 100;
  const color = pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-help flex items-center gap-1">
              {label} <Info className="h-3 w-3 opacity-50" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">{tooltip}</TooltipContent>
        </Tooltip>
        <span className="font-mono text-sm font-medium" style={{ color }}>
          {value}<span className="text-muted-foreground">/{max}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function LockedModule({ name, requiredPlan }: { name: string; requiredPlan: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/30 p-6 bg-card/40">
      <div className="absolute inset-0 backdrop-blur-sm bg-background/40 flex flex-col items-center justify-center gap-3 z-10">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">{name} — {requiredPlan} tier</p>
          <p className="text-sm text-muted-foreground mt-1">Upgrade to unlock this module</p>
        </div>
        <Link href="/account">
          <Button size="sm" variant="outline" className="mt-1">Upgrade Plan</Button>
        </Link>
      </div>
      <div className="opacity-10 space-y-3">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-40 bg-muted rounded" />
      </div>
    </div>
  );
}

interface PropertyData {
  community: string;
  emirate: string;
  propertyType: string;
  bedrooms: number;
  bathrooms?: number;
  sizeSqft: number;
  listedPrice: number;
  listingType: string;
  buildingName?: string;
  viewType?: string;
}

export default function AnalysisDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: communities } = useGetCommunities();

  const { data: analysis, isLoading } = useGetAnalysis(id!, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id!),
      refetchInterval: (query) => {
        const data = query.state.data as { status?: string } | undefined;
        return data?.status === "pending" ? 3000 : false;
      },
    },
  });

  const deleteAnalysis = useDeleteAnalysis();

  const handleDelete = async () => {
    if (!confirm("Delete this analysis permanently?")) return;
    await deleteAnalysis.mutateAsync({ id: id! });
    toast({ title: "Analysis deleted" });
    setLocation("/dashboard");
  };

  const handleDownload = () => {
    const url = `/api/analysis/${id}/report`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `propiq-report-${id?.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard" });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Analysis not found</h2>
        <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const pd = analysis.propertyData as unknown as PropertyData;
  const results = (analysis.results ?? {}) as Record<string, unknown>;
  const isPending = analysis.status === "pending";
  const plan = user?.plan ?? "starter";
  const isPro = plan === "pro";
  const isAnalyst = plan === "analyst" || isPro;

  const pricePsf = pd.sizeSqft ? Math.round(pd.listedPrice / pd.sizeSqft) : null;

  const communityGeo = communities?.find(
    (c) => c.name.toLowerCase() === pd.community.toLowerCase()
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-serif font-bold">
            {pd.bedrooms === 0 ? "Studio" : `${pd.bedrooms} BR`} {pd.propertyType} — {pd.community}
          </h1>
          <p className="text-muted-foreground mt-1">{pd.emirate} · {pd.listingType === "rent" ? "For Rent" : "For Sale"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleShare} data-testid="button-share">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload} data-testid="button-download">
            <Download className="h-4 w-4" /> PDF Report
          </Button>
        </div>
      </div>

      {/* Property Summary + Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-card/80 border-border/50">
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Listed Price</p>
                <p className="font-mono text-lg font-bold text-primary">{formatAed(pd.listedPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price/sqft</p>
                <p className="font-mono text-lg font-bold">{pricePsf ? `AED ${pricePsf.toLocaleString()}` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Size</p>
                <p className="font-mono text-lg font-bold">{pd.sizeSqft.toLocaleString()} sqft</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bedrooms</p>
                <p className="font-mono text-lg font-bold">{pd.bedrooms === 0 ? "Studio" : `${pd.bedrooms} BR`}</p>
              </div>
              {pd.buildingName && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Building</p>
                  <p className="text-base font-medium">{pd.buildingName}</p>
                </div>
              )}
              {pd.viewType && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">View</p>
                  <p className="text-base font-medium">{pd.viewType}</p>
                </div>
              )}
            </div>
            {/* Community Map */}
            {communityGeo && (
              <CommunityMap
                latitude={communityGeo.latitude ?? 25.2}
                longitude={communityGeo.longitude ?? 55.27}
                community={pd.community}
                emirate={pd.emirate}
                className="h-48 w-full"
              />
            )}
            {!communityGeo && (
              <CommunityMap
                latitude={pd.emirate === "Abu Dhabi" ? 24.4667 : 25.2048}
                longitude={pd.emirate === "Abu Dhabi" ? 54.3667 : 55.2708}
                community={pd.community}
                emirate={pd.emirate}
                className="h-48 w-full"
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-border/50">
          <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
            {isPending ? (
              <div className="text-center space-y-2">
                <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Running analysis…</p>
                <p className="text-xs text-muted-foreground/60">Processing DLD comparables</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">PropIQ Score</p>
                <ScoreGauge score={analysis.overallScore ?? 0} size={130} />
                <Badge
                  className="text-xs"
                  variant={(analysis.overallScore ?? 0) >= 70 ? "default" : "secondary"}
                >
                  {(analysis.overallScore ?? 0) >= 70 ? "Strong Buy Signal" : (analysis.overallScore ?? 0) >= 50 ? "Neutral" : "Caution"}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {isPending && (
        <Card className="bg-card/80 border-primary/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
            <div>
              <p className="font-medium">Running intelligence modules…</p>
              <p className="text-sm text-muted-foreground">Querying DLD database, running comparable analysis, computing QoL scores. This takes 15–60 seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPending && (
        <>
          {/* Module 1: Price Fairness */}
          {results.priceFairness && (
            <ModulePriceFairness data={results.priceFairness as Record<string, unknown>} />
          )}

          {/* Module 2: QoL Score */}
          {results.qolScore && (
            <ModuleQolScore data={results.qolScore as Record<string, unknown>} />
          )}

          {/* Module 3: Forecast */}
          {isAnalyst ? (
            results.forecast ? (
              <ModuleForecast data={results.forecast as Record<string, unknown>} />
            ) : null
          ) : (
            <LockedModule name="Future Valuation Forecast" requiredPlan="Analyst" />
          )}

          {/* Module 4: Liquidity */}
          {isPro ? (
            results.liquidity ? (
              <ModuleLiquidity data={results.liquidity as Record<string, unknown>} />
            ) : null
          ) : (
            <LockedModule name="Liquidity Score" requiredPlan="Pro" />
          )}

          {/* Module 5: Rental Yield */}
          {isAnalyst ? (
            results.rentalYield ? (
              <ModuleRentalYield data={results.rentalYield as Record<string, unknown>} />
            ) : null
          ) : (
            <LockedModule name="True Rental Yield" requiredPlan="Analyst" />
          )}

          {/* Module 6: Trends */}
          {results.trends ? (
            <ModuleTrends data={results.trends as Record<string, unknown>} />
          ) : null}
        </>
      )}
    </motion.div>
  );
}

function ModulePriceFairness({ data }: { data: Record<string, unknown> }) {
  const comps = (data.comparables as Array<Record<string, unknown>>) ?? [];
  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">MODULE 1</span>
            Price Fairness Index
          </CardTitle>
          <Tooltip>
            <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              Compares the listed price per sqft against the median of recent DLD-registered transactions for comparable properties in the same community.
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-6">
        <FairnessGauge score={data.fairnessScore as number} />
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Listed PSF</p>
            <p className="font-mono font-bold">AED {(data.listedPsf as number).toLocaleString()}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Benchmark PSF</p>
            <p className="font-mono font-bold">AED {(data.benchmarkPsf as number).toLocaleString()}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Adjusted Benchmark</p>
            <p className="font-mono font-bold">AED {(data.adjustedBenchmarkPsf as number).toLocaleString()}</p>
          </div>
        </div>
        {!!(data.warning as string) && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{data.warning as string}</span>
          </div>
        )}
        {comps.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-3">DLD Comparable Transactions</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/50">
                      <th className="text-left py-2 pr-4">Community</th>
                      <th className="text-right py-2 pr-4">Beds</th>
                      <th className="text-right py-2 pr-4">Size</th>
                      <th className="text-right py-2 pr-4">Price</th>
                      <th className="text-right py-2">PSF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((c, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="py-2 pr-4">{c.community as string}</td>
                        <td className="py-2 pr-4 text-right font-mono">{c.bedrooms as number}</td>
                        <td className="py-2 pr-4 text-right font-mono">{(c.sizeSqft as number)?.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right font-mono">{formatAed(c.salePrice as number)}</td>
                        <td className="py-2 text-right font-mono text-primary">
                          {c.pricePerSqft ? `AED ${(c.pricePerSqft as number).toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleQolScore({ data }: { data: Record<string, unknown> }) {
  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">MODULE 2</span>
            Quality of Life Score
          </CardTitle>
          <Tooltip>
            <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              Scores the community across 6 dimensions using OpenStreetMap + Google Places data: transport, education, healthcare, retail, recreation, and noise environment.
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <ScoreGauge score={data.totalScore as number} size={140} />
            <p className="text-sm text-muted-foreground">Overall QoL</p>
          </div>
          <div className="flex-1 space-y-4 w-full">
            <SubScoreBar label="Transport" value={data.transportScore as number} tooltip="Proximity to metro stations, bus stops, and public transport links." />
            <SubScoreBar label="Education" value={data.educationScore as number} tooltip="Number and quality of schools within 2km." />
            <SubScoreBar label="Healthcare" value={data.healthcareScore as number} tooltip="Proximity to hospitals and clinics within 3km." />
            <SubScoreBar label="Retail & Dining" value={data.retailScore as number} tooltip="Walking distance to supermarkets, restaurants, and shopping malls." />
            <SubScoreBar label="Recreation" value={data.recreationScore as number} tooltip="Access to parks, gyms, beach, and leisure facilities." />
            <SubScoreBar label="Noise & Environment" value={data.noiseScore as number} tooltip="Distance from major highways, airports, and industrial zones (higher = quieter)." />
          </div>
        </div>
        {!!(data.warning as string) && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg p-3 mt-4">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{data.warning as string}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ForecastScenario {
  annualRate: number;
  year1Value: number;
  year3Value: number;
  year5Value: number;
  year3Change: number;
  year5Change: number;
  keyAssumption: string;
}

function ModuleForecast({ data }: { data: Record<string, unknown> }) {
  const [horizon, setHorizon] = useState<"1yr" | "3yr" | "5yr">("3yr");
  const chartData = (data.chartData as Array<{ year: string; bear: number; base: number; bull: number }>) ?? [];
  const base = data.base as ForecastScenario;
  const bear = data.bear as ForecastScenario;
  const bull = data.bull as ForecastScenario;

  const hChange = { "1yr": "year1Value", "3yr": "year3Value", "5yr": "year5Value" }[horizon];

  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">MODULE 3</span>
            Future Valuation Forecast
          </CardTitle>
          <div className="flex gap-1">
            {(["1yr", "3yr", "5yr"] as const).map((h) => (
              <Button
                key={h} size="sm" variant={horizon === h ? "default" : "outline"}
                className="h-7 text-xs" onClick={() => setHorizon(h)}
              >
                {h}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Bear", scenario: bear, color: "#EF4444" },
            { label: "Base", scenario: base, color: "#0A8A8A" },
            { label: "Bull", scenario: bull, color: "#22C55E" },
          ].map(({ label, scenario, color }) => (
            <div key={label} className="bg-muted/30 rounded-xl p-4 text-center space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color }}>{label} Case</p>
              <p className="font-mono text-xl font-bold">{formatAed(scenario[hChange as keyof ForecastScenario] as number)}</p>
              <p className="text-xs text-muted-foreground">{scenario.annualRate}%/yr</p>
              <p className="text-xs text-muted-foreground/70 leading-tight mt-2">{scenario.keyAssumption}</p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#7A94B4" }} />
            <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11, fill: "#7A94B4" }} />
            <RechartTooltip
              formatter={(v: number) => [formatAed(v)]}
              contentStyle={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
            />
            <Legend />
            <Area type="monotone" dataKey="bear" stroke="#EF4444" fill="#EF444420" strokeWidth={1.5} name="Bear" />
            <Area type="monotone" dataKey="base" stroke="#0A8A8A" fill="#0A8A8A20" strokeWidth={2} name="Base" />
            <Area type="monotone" dataKey="bull" stroke="#22C55E" fill="#22C55E20" strokeWidth={1.5} name="Bull" />
          </AreaChart>
        </ResponsiveContainer>
        {!!(data.warning as string) && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{data.warning as string}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleLiquidity({ data }: { data: Record<string, unknown> }) {
  const score = data.score as number;
  const scoreColor = score >= 7 ? "#22C55E" : score >= 4 ? "#F59E0B" : "#EF4444";
  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">MODULE 4</span>
          Liquidity Score
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">Pro</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="font-mono text-6xl font-bold" style={{ color: scoreColor }}>{score.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground mt-1">out of 10.0</p>
          </div>
          <div>
            <Badge className="text-sm mb-2" style={{ background: `${scoreColor}22`, color: scoreColor, border: `1px solid ${scoreColor}44` }}>
              {data.label as string}
            </Badge>
            <p className="text-sm text-muted-foreground">Ease of resale based on transaction velocity, supply/demand, and property characteristics.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Days on Market</p>
            <p className="font-mono font-bold">{data.avgDaysOnMarket ? `${data.avgDaysOnMarket} days` : "N/A"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Transactions (90d)</p>
            <p className="font-mono font-bold">{data.transactionsLast90Days as number}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Active Listings</p>
            <p className="font-mono font-bold">{(data.activeListingsCount as number | null) ?? "N/A"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Investor Ratio</p>
            <p className="font-mono font-bold">{data.investorRatio ? `${data.investorRatio}%` : "N/A"}</p>
          </div>
        </div>
        {!!(data.warning as string) && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{data.warning as string}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleRentalYield({ data }: { data: Record<string, unknown> }) {
  const [agencyMode, setAgencyMode] = useState(false);

  const grossYield = data.grossYield as number;
  const netYield = data.netYield as number;

  const waterfallData = [
    { name: "Gross Rent", value: data.marketRentAnnual as number },
    { name: "Service Charge", value: -(data.serviceChargeAnnual as number) },
    { name: "Vacancy", value: -(data.vacancyDeduction as number) },
    { name: "Management", value: agencyMode ? -(data.managementFee as number) : 0 },
    { name: "Maintenance", value: -(data.maintenanceReserve as number) },
    { name: "Net Income", value: data.netIncome as number },
  ].filter((d) => d.value !== 0);

  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">MODULE 5</span>
            True Rental Yield
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className={!agencyMode ? "text-foreground" : "text-muted-foreground"}>Self-Managed</span>
            <button
              onClick={() => setAgencyMode(!agencyMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${agencyMode ? "bg-primary" : "bg-muted"}`}
              data-testid="toggle-agency-mode"
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${agencyMode ? "translate-x-5" : "translate-x-1"}`} />
            </button>
            <span className={agencyMode ? "text-foreground" : "text-muted-foreground"}>Agency (8%)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-6">
        <div className="flex gap-8 items-start">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Gross Yield</p>
            <p className="font-mono text-5xl font-bold text-primary">{grossYield}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">True Net Yield</p>
            <p className={`font-mono text-5xl font-bold ${netYield >= 5 ? "text-success" : netYield >= 3 ? "text-warning" : "text-destructive"}`}>
              {netYield}%
            </p>
          </div>
          <div className="flex-1 space-y-1 mt-1">
            <p className="text-xs text-muted-foreground">Market Rent/yr: <span className="font-mono text-foreground">{formatAed(data.marketRentAnnual as number)}</span></p>
            <p className="text-xs text-muted-foreground">Service Charge: <span className="font-mono text-destructive">-{formatAed(data.serviceChargeAnnual as number)}</span></p>
            <p className="text-xs text-muted-foreground">Vacancy: <span className="font-mono text-destructive">-{formatAed(data.vacancyDeduction as number)}</span></p>
            {agencyMode && <p className="text-xs text-muted-foreground">Mgmt Fee: <span className="font-mono text-destructive">-{formatAed(data.managementFee as number)}</span></p>}
            <p className="text-xs text-muted-foreground">Maintenance Reserve: <span className="font-mono text-destructive">-{formatAed(data.maintenanceReserve as number)}</span></p>
            <Separator className="my-1" />
            <p className="text-xs font-medium">Net Income: <span className="font-mono text-success">{formatAed(data.netIncome as number)}</span></p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={waterfallData} layout="vertical">
            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: "#7A94B4" }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#7A94B4" }} />
            <RechartTooltip
              formatter={(v: number) => [formatAed(Math.abs(v))]}
              contentStyle={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value > 0 ? "#0A8A8A" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {!!(data.warning as string) && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{data.warning as string}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleTrends({ data }: { data: Record<string, unknown> }) {
  const qData = (data.quarterlyData as Array<{ period: string; avgPsf: number | null; transactionCount: number | null }>) ?? [];
  const profile = data.communityProfile as Record<string, unknown> ?? {};

  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">MODULE 6</span>
          Neighbourhood Trend Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-6">
        {qData.length > 0 ? (
          <>
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground">Average Price/sqft — 5 Year History</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={qData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#7A94B4" }} />
                  <YAxis tickFormatter={(v) => `${v}`} tick={{ fontSize: 10, fill: "#7A94B4" }} />
                  <RechartTooltip
                    formatter={(v: number) => [`AED ${v?.toLocaleString()}/sqft`]}
                    contentStyle={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="avgPsf" stroke="#C8960C" strokeWidth={2} dot={false} name="Avg PSF" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground">Transaction Volume</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={qData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#7A94B4" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#7A94B4" }} />
                  <RechartTooltip
                    contentStyle={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  />
                  <Bar dataKey="transactionCount" fill="#0A8A8A" name="Transactions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Insufficient historical data for this community</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">3yr Growth</p>
            <p className="font-mono font-bold text-primary">
              {profile.threeYearGrowth != null ? `${(profile.threeYearGrowth as number) > 0 ? "+" : ""}${profile.threeYearGrowth}%` : "N/A"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Common Type</p>
            <p className="font-mono font-bold capitalize">{(profile.mostCommonType as string) ?? "—"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Hold Period</p>
            <p className="font-mono font-bold">{(profile.avgHoldingPeriod as string) ?? "3–5 yrs"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Communities Tracked</p>
            <p className="font-mono font-bold">{(profile.totalCommunitiesTracked as number) ?? 50}</p>
          </div>
        </div>
        {!!(data.warning as string) && (
          <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{data.warning as string}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

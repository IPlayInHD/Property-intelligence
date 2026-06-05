import { useAuth } from "@/lib/auth";
import { useGetAnalysisHistory, useGetMarketOverview } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { Plus, Search, TrendingUp, Building2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: history, isLoading: historyLoading } = useGetAnalysisHistory();
  const { data: marketOverview, isLoading: marketLoading } = useGetMarketOverview();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("query") as string;
    if (query) {
      // Typically would search, but for now we just redirect to new analysis
      setLocation("/analysis/new");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(value);
  };

  const limit = user?.plan === 'starter' ? 5 : user?.plan === 'analyst' ? 100 : 9999;
  const used = user?.analysesUsedThisMonth || 0;
  const progress = limit === 9999 ? 0 : (used / limit) * 100;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Welcome back, {user?.fullName.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Here is your property intelligence overview.</p>
        </div>
        <Link href="/analysis/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Analysis
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Usage Card */}
        <Card className="col-span-1 bg-card/80 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Usage this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-3xl font-bold font-mono">{used}</span>
                <span className="text-muted-foreground"> / {limit === 9999 ? '∞' : limit}</span>
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded capitalize">
                {user?.plan} Plan
              </div>
            </div>
            {limit !== 9999 && (
              <Progress value={progress} className="h-2 mt-4" />
            )}
          </CardContent>
        </Card>

        {/* Quick Search */}
        <Card className="col-span-1 md:col-span-2 bg-card/80 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Quick Start</CardTitle>
            <CardDescription>Paste a property portal URL or enter manually</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input name="query" placeholder="e.g. https://www.propertyfinder.ae/..." className="pl-9 bg-background/50 h-10" />
              </div>
              <Button type="submit" variant="secondary" className="h-10">Start</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Market Pulse (Mocked from API) */}
      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold">Market Pulse</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {marketLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : (
            <>
              <Card className="bg-background/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg PSF (Dubai)</p>
                    <p className="text-xl font-bold font-mono">AED {marketOverview?.avgPsfDubai || '1,850'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                    <Percent className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Gross Yield</p>
                    <p className="text-xl font-bold font-mono">{marketOverview?.avgGrossYield || '6.2'}%</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Community</p>
                    <p className="text-xl font-bold truncate">{marketOverview?.topCommunity || 'Jumeirah Village Circle'}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold">Recent Analyses</h2>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/analysis/history")}>View all</Button>
        </div>
        
        {historyLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : history?.length === 0 ? (
          <Card className="bg-background/40 border-dashed">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No analyses yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Start by analysing a property to see institutional-grade metrics and forecasts.</p>
              <Link href="/analysis/new">
                <Button>Create your first analysis</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {history?.map((item) => (
              <Link key={item.id} href={`/analysis/${item.id}`}>
                <Card className="bg-card/60 hover:bg-card/90 transition-colors cursor-pointer border-border/50">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                        item.status === 'complete' ? 'bg-success/10 text-success' : 
                        item.status === 'failed' ? 'bg-destructive/10 text-destructive' : 
                        'bg-warning/10 text-warning animate-pulse'
                      }`}>
                        {item.status === 'complete' ? <CheckCircle2 className="h-6 w-6" /> : 
                         item.status === 'failed' ? <AlertCircle className="h-6 w-6" /> : 
                         <Clock className="h-6 w-6" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-lg">{item.bedrooms} Bed {item.propertyType} in {item.community}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="font-mono">{formatCurrency(item.listedPrice)}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {item.status === 'complete' && item.overallScore && (
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold font-mono text-primary">{item.overallScore}</div>
                        <div className="text-xs text-muted-foreground">PropIQ Score</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Add these to make it compile
function Activity({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}
function Percent({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>;
}

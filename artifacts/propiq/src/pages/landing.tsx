import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, ArrowRight, BarChart3, CheckCircle2, ChevronRight, Droplets, Map, Percent, ShieldAlert, XCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Activity className="h-4 w-4" />
              <span>The Bloomberg Terminal for UAE Real Estate</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight">
              Know What a Property Is <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-200">Really Worth</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Institutional-grade financial intelligence for serious investors. Stop guessing with portal listings. Start analysing with comprehensive, data-backed models.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 gap-2">
                  Analyse a Property
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 bg-card/50 backdrop-blur-sm border-border hover:bg-muted">
                  See How It Works
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
        
        {/* Stats Strip */}
        <div className="mt-20 border-y border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4 text-sm font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                180,000+ UAE transactions analysed
              </div>
              <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
              <div>6 intelligence modules</div>
              <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
              <div>Real DLD data</div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="features" className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">6 Modules of Intelligence</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Comprehensive analysis covering valuation, yields, liquidity, and livability.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Price Fairness Index", desc: "Compare against real DLD transactions, not inflated asking prices.", icon: ShieldAlert, color: "text-blue-400" },
              { title: "True Rental Yield", desc: "Calculate actual net yields after service charges and maintenance reserves.", icon: Percent, color: "text-success" },
              { title: "Future Valuation", desc: "5-year forecasting models based on macroeconomic indicators and supply.", icon: BarChart3, color: "text-primary" },
              { title: "Liquidity Score", desc: "Know how fast you can exit. Transaction velocity and active listing ratios.", icon: Droplets, color: "text-warning" },
              { title: "Quality of Life", desc: "Objective scoring of amenities, transport, and infrastructure proximity.", icon: Map, color: "text-purple-400" },
              { title: "Trend Analytics", desc: "Community-level price and volume trends to time your entry.", icon: Activity, color: "text-pink-400" }
            ].map((feature, i) => (
              <Card key={i} className="bg-background/40 backdrop-blur-md border-border/50 hover:bg-card/80 transition-colors">
                <CardHeader>
                  <feature.icon className={`h-8 w-8 mb-4 ${feature.color}`} />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-24 border-y border-border/50 relative">
        <div className="absolute inset-0 bg-secondary/20" />
        <div className="container relative mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Why Serious Investors Choose PropIQ</h2>
            <p className="text-muted-foreground">Portals are for browsing. PropIQ is for analysing.</p>
          </div>
          
          <div className="max-w-4xl mx-auto bg-card rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-4 border-b border-border bg-muted/50 p-4">
              <div className="font-medium text-muted-foreground">Feature</div>
              <div className="font-bold text-primary text-center">PropIQ</div>
              <div className="font-medium text-muted-foreground text-center">Propertyfinder</div>
              <div className="font-medium text-muted-foreground text-center">Bayut</div>
            </div>
            {[
              "Active Listings",
              "DLD Transaction Data",
              "Net Yield Calculation",
              "5-Year Forecasting",
              "Liquidity Scoring",
              "Quality of Life Metrics",
            ].map((feature, i) => (
              <div key={i} className="grid grid-cols-4 border-b border-border/50 p-4 hover:bg-muted/20 transition-colors">
                <div className="text-sm font-medium">{feature}</div>
                <div className="flex justify-center"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
                <div className="flex justify-center">{i < 2 ? <CheckCircle2 className="h-5 w-5 text-muted-foreground" /> : <XCircle className="h-5 w-5 text-muted-foreground/30" />}</div>
                <div className="flex justify-center">{i < 2 ? <CheckCircle2 className="h-5 w-5 text-muted-foreground" /> : <XCircle className="h-5 w-5 text-muted-foreground/30" />}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Transparent Pricing</h2>
            <p className="text-muted-foreground">Choose the intelligence tier that fits your needs.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-card/50 backdrop-blur-sm flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>For casual browsers</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-mono">Free</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 5 analyses per month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 3 core modules</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Basic yield calculation</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/signup">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </Card>
            
            <Card className="bg-secondary/40 backdrop-blur-sm border-primary flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
              <CardHeader>
                <CardTitle className="text-2xl">Analyst</CardTitle>
                <CardDescription>For active investors</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-mono">AED 30</span><span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 100 analyses per month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 5 intelligence modules</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 5-year forecasting</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> PDF reports</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/signup">
                  <Button className="w-full">Start Analyst Trial</Button>
                </Link>
              </div>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>For industry professionals</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-mono">AED 150</span><span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited analyses</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> All 6 modules</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Liquidity scoring</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> White-label reports</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> API access</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/signup">
                  <Button variant="outline" className="w-full">Upgrade to Pro</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-serif font-bold text-sm">P</span>
            </div>
            <span className="font-serif font-bold">PropIQ</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl text-center">
            Disclaimer: PropIQ provides estimates based on market data. Not financial advice. Past performance is not indicative of future results.
          </p>
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PropIQ Analytics.
          </div>
        </div>
      </footer>
    </div>
  );
}

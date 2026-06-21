import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity, ArrowRight, BarChart3, CheckCircle2, ChevronRight,
  Droplets, Map, Percent, ShieldAlert, XCircle, TrendingUp,
  Building2, Users, Star, Zap, Lock, Globe
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis
} from "recharts";

// ─── Theme colours (inline so the landing page is self-contained) ──────────
const GOLD = "#C9A84C";
const NAVY = "#0A1628";
const NAVY_CARD = "#112240";
const GOLD_LIGHT = "#E8C87A";

// ─── Mock demo data ─────────────────────────────────────────────────────────
const FORECAST_DATA = [
  { year: "2024", value: 1_850_000, label: "AED 1.85M" },
  { year: "2025", value: 1_940_000, label: "AED 1.94M" },
  { year: "2026", value: 2_080_000, label: "AED 2.08M" },
  { year: "2027", value: 2_210_000, label: "AED 2.21M" },
  { year: "2028", value: 2_390_000, label: "AED 2.39M" },
  { year: "2029", value: 2_540_000, label: "AED 2.54M" },
];

const SCORES = [
  { name: "Price Fairness", value: 78, fill: GOLD, description: "Listed 8% below DLD avg" },
  { name: "Rental Yield", value: 91, fill: "#22C55E", description: "6.4% net yield" },
  { name: "Liquidity", value: 65, fill: "#60A5FA", description: "Avg 42 days to sell" },
  { name: "Quality of Life", value: 84, fill: "#A78BFA", description: "Metro & mall nearby" },
];

const LISTINGS = [
  { community: "Dubai Marina", type: "2BR Apartment", price: "AED 1,850,000", yield: "6.4%", score: 78, trend: "+12%" },
  { community: "Downtown Dubai", type: "1BR Apartment", price: "AED 2,100,000", yield: "5.1%", score: 71, trend: "+8%" },
  { community: "JVC", type: "Studio", price: "AED 550,000", yield: "8.2%", score: 85, trend: "+18%" },
];

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Waitlist form ────────────────────────────────────────────────────────────
function WaitlistForm({ onSuccess }: { onSuccess: (count: number) => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "", painPoints: "", pricingTier: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError("Please fill in your name and email."); return; }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      onSuccess(data.waitlistCount ?? 47);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={handleNext} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>Full Name *</Label>
            <Input
              placeholder="Khalid Al-Rashid"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-yellow-500/60"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>Email Address *</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-yellow-500/60"
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit" size="lg" className="w-full text-base font-semibold h-12" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)`, color: NAVY }}>
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>I am a...</Label>
        <div className="grid grid-cols-2 gap-2">
          {["Property Investor", "Real Estate Agent", "Developer / Builder", "Expat / Relocating"].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setForm(f => ({ ...f, role: r }))}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${form.role === r
                ? "border-yellow-500/80 bg-yellow-500/10 text-yellow-300"
                : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>Biggest pain point today?</Label>
        <div className="grid grid-cols-1 gap-2">
          {[
            "Can't tell if a property is fairly priced",
            "No reliable rental yield data",
            "Don't know how fast I can exit",
            "Portals show inflated asking prices",
          ].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm(f => ({ ...f, painPoints: p }))}
              className={`px-3 py-2 rounded-lg text-sm text-left border transition-all ${form.painPoints === p
                ? "border-yellow-500/80 bg-yellow-500/10 text-yellow-300"
                : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>Which plan looks right for you?</Label>
        <div className="grid grid-cols-3 gap-2">
          {["Starter (Free)", "Analyst (AED 30/mo)", "Pro (AED 150/mo)"].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, pricingTier: t }))}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${form.pricingTier === t
                ? "border-yellow-500/80 bg-yellow-500/10 text-yellow-300"
                : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" size="lg" disabled={loading} className="w-full text-base font-semibold h-12" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)`, color: NAVY }}>
        {loading ? "Joining..." : "Join the Waitlist"} {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </form>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, fill, label }: { score: number; fill: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius={22} outerRadius={32} data={[{ value: score }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" fill={fill} background={{ fill: "rgba(255,255,255,0.05)" }} cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-white">{score}</span>
      </div>
      <span className="text-xs text-white/50 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function Landing() {
  const [waitlistCount, setWaitlistCount] = useState<number>(47);
  const [submitted, setSubmitted] = useState(false);
  const [activeProperty, setActiveProperty] = useState(0);

  useEffect(() => {
    fetch("/api/waitlist/count")
      .then(r => r.json())
      .then(d => setWaitlistCount(d.count ?? 47))
      .catch(() => {});
  }, []);

  const handleWaitlistSuccess = (count: number) => {
    setWaitlistCount(count);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen font-sans antialiased" style={{ background: NAVY, color: "#E8F0FB" }}>

      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md" style={{ background: `${NAVY}CC` }}>
        <div className="container mx-auto px-4 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)` }}>
              <span className="font-serif font-bold text-sm" style={{ color: NAVY }}>P</span>
            </div>
            <span className="font-serif text-xl font-bold tracking-wide text-white">PropIQ</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
            <a href="#demo" className="hover:text-white transition-colors">Live Demo</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:flex text-white/50 hover:text-white hover:bg-white/5">Log in</Button>
            </Link>
            <a href="#waitlist">
              <Button size="sm" className="font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)`, color: NAVY }}>
                Join Waitlist
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden">
        {/* Gold radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse, ${GOLD} 0%, transparent 70%)` }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`, backgroundSize: "4rem 4rem" }} />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-8" style={{ borderColor: `${GOLD}40`, background: `${GOLD}10`, color: GOLD_LIGHT }}>
              <Zap className="h-3.5 w-3.5" />
              The Bloomberg Terminal for UAE Real Estate
            </div>

            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 leading-tight text-white">
              Know What a Property Is{" "}
              <span style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Really Worth
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
              Institutional-grade financial intelligence for serious UAE property investors. Stop guessing with portal listings — start analysing with data-backed models.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#demo">
                <Button size="lg" className="w-full sm:w-auto text-base h-13 px-8 gap-2 font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)`, color: NAVY }}>
                  See Live Demo <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#waitlist">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-13 px-8 bg-white/5 border-white/10 text-white hover:bg-white/10">
                  Join {waitlistCount}+ on Waitlist
                </Button>
              </a>
            </div>
          </motion.div>
        </div>

        {/* Stats strip */}
        <div className="mt-20 border-y border-white/5 bg-white/[0.02]">
          <div className="container mx-auto px-4 py-5">
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-3 text-sm font-mono text-white/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <AnimatedNumber target={180000} />+ UAE transactions analysed
              </div>
              <div className="hidden md:block w-1 h-1 rounded-full bg-white/10" />
              <div>6 intelligence modules</div>
              <div className="hidden md:block w-1 h-1 rounded-full bg-white/10" />
              <div>Real DLD transaction data</div>
              <div className="hidden md:block w-1 h-1 rounded-full bg-white/10" />
              <div><AnimatedNumber target={waitlistCount} />+ on waitlist</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Interactive Demo ── */}
      <section id="demo" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-4" style={{ borderColor: `${GOLD}30`, background: `${GOLD}08`, color: GOLD }}>
              <Activity className="h-3 w-3" /> Interactive Demo — no signup required
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">See PropIQ in Action</h2>
            <p className="text-white/40 max-w-xl mx-auto">Select a property below and see the full intelligence analysis instantly.</p>
          </div>

          {/* Property selector */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {LISTINGS.map((l, i) => (
              <button
                key={i}
                onClick={() => setActiveProperty(i)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${activeProperty === i
                  ? "text-white" : "border-white/10 bg-white/3 text-white/50 hover:border-white/20"}`}
                style={activeProperty === i ? { borderColor: `${GOLD}60`, background: `${GOLD}12`, color: GOLD_LIGHT } : {}}
              >
                {l.community} — {l.type}
              </button>
            ))}
          </div>

          <motion.div
            key={activeProperty}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-5xl mx-auto"
          >
            {/* Property header */}
            <div className="rounded-xl border border-white/8 p-6 mb-4" style={{ background: NAVY_CARD }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-white/40 text-sm mb-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {LISTINGS[activeProperty].community}, Dubai
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-white">{LISTINGS[activeProperty].type}</h3>
                  <p className="text-3xl font-mono font-bold mt-1" style={{ color: GOLD }}>{LISTINGS[activeProperty].price}</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-xs text-white/40 mb-1">Net Yield</div>
                    <div className="text-2xl font-mono font-bold text-green-400">{LISTINGS[activeProperty].yield}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/40 mb-1">1Y Price ↑</div>
                    <div className="text-2xl font-mono font-bold" style={{ color: GOLD }}>{LISTINGS[activeProperty].trend}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/40 mb-1">IQ Score</div>
                    <div className="text-2xl font-mono font-bold text-white">{LISTINGS[activeProperty].score}<span className="text-sm text-white/30">/100</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score rings + Forecast chart */}
            <div className="grid md:grid-cols-5 gap-4">
              {/* Scores */}
              <div className="md:col-span-2 rounded-xl border border-white/8 p-6" style={{ background: NAVY_CARD }}>
                <h4 className="text-sm font-semibold text-white/60 mb-5 uppercase tracking-wider">Intelligence Scores</h4>
                <div className="grid grid-cols-2 gap-6">
                  {SCORES.map(s => (
                    <div key={s.name} className="flex flex-col items-center gap-2">
                      <ScoreRing score={s.value} fill={s.fill} label={s.name} />
                      <span className="text-xs text-white/40 text-center">{s.description}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-5 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">DLD Transactions Used</span>
                    <span className="font-mono" style={{ color: GOLD }}>2,847</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-white/40">Data Freshness</span>
                    <span className="text-green-400 font-mono">Live</span>
                  </div>
                </div>
              </div>

              {/* Forecast chart */}
              <div className="md:col-span-3 rounded-xl border border-white/8 p-6" style={{ background: NAVY_CARD }}>
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider">5-Year Price Forecast</h4>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-medium" style={{ background: `${GOLD}15`, color: GOLD }}>+37% projected</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={FORECAST_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="year" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#0D2040", border: `1px solid ${GOLD}30`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                      formatter={(v: number) => [`AED ${(v / 1_000_000).toFixed(2)}M`, "Est. Value"]}
                    />
                    <Area type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2} fill="url(#goldGrad)" dot={{ fill: GOLD, strokeWidth: 0, r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-white/25 mt-3">
                  Forecast based on DLD transaction history, macroeconomic indicators, and supply pipeline data. Not financial advice.
                </p>
              </div>
            </div>

            {/* CTA banner under demo */}
            <div className="mt-4 rounded-xl border p-4 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: `${GOLD}25`, background: `${GOLD}08` }}>
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 shrink-0" style={{ color: GOLD }} />
                <p className="text-sm text-white/60"><span className="text-white font-medium">Full analysis unlocked</span> after signup — including community comparisons, PDF reports, and portfolio tracking.</p>
              </div>
              <a href="#waitlist" className="shrink-0">
                <Button size="sm" className="font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)`, color: NAVY }}>
                  Get Early Access
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 border-y border-white/5" style={{ background: `${NAVY_CARD}88` }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">6 Modules of Intelligence</h2>
            <p className="text-white/40 max-w-xl mx-auto">Every number backed by real DLD transactions and macroeconomic data — not portal estimates.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: "Price Fairness Index", desc: "Compare against real DLD transactions, not inflated asking prices.", icon: ShieldAlert, color: "#60A5FA" },
              { title: "True Rental Yield", desc: "Calculate actual net yields after service charges and maintenance reserves.", icon: Percent, color: "#22C55E" },
              { title: "Future Valuation", desc: "5-year forecasting models based on macroeconomic indicators and supply.", icon: BarChart3, color: GOLD },
              { title: "Liquidity Score", desc: "Know how fast you can exit — transaction velocity and active listing ratios.", icon: Droplets, color: "#F59E0B" },
              { title: "Quality of Life", desc: "Objective scoring of amenities, transport, and infrastructure proximity.", icon: Map, color: "#A78BFA" },
              { title: "Trend Analytics", desc: "Community-level price and volume trends to time your entry perfectly.", icon: Activity, color: "#F472B6" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <Card className="border-white/6 h-full hover:border-white/12 transition-colors" style={{ background: `${NAVY}CC` }}>
                  <CardHeader className="pb-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${f.color}15` }}>
                      <f.icon className="h-5 w-5" style={{ color: f.color }} />
                    </div>
                    <CardTitle className="text-lg text-white">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="comparison" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">Why Serious Investors Choose PropIQ</h2>
            <p className="text-white/40">Portals are for browsing. PropIQ is for analysing.</p>
          </div>

          <div className="max-w-4xl mx-auto rounded-xl border border-white/8 overflow-hidden" style={{ background: NAVY_CARD }}>
            <div className="grid grid-cols-4 border-b border-white/8 p-4 bg-white/[0.03]">
              <div className="text-sm font-medium text-white/40">Feature</div>
              <div className="text-sm font-bold text-center" style={{ color: GOLD }}>PropIQ</div>
              <div className="text-sm font-medium text-white/30 text-center">PropertyFinder</div>
              <div className="text-sm font-medium text-white/30 text-center">Bayut</div>
            </div>
            {[
              "Active Listings",
              "DLD Transaction Data",
              "Net Yield Calculation",
              "5-Year Forecasting",
              "Liquidity Scoring",
              "Quality of Life Metrics",
            ].map((feature, i) => (
              <div key={i} className="grid grid-cols-4 border-b border-white/5 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="text-sm text-white/70">{feature}</div>
                <div className="flex justify-center"><CheckCircle2 className="h-4 w-4" style={{ color: GOLD }} /></div>
                <div className="flex justify-center">{i < 2 ? <CheckCircle2 className="h-4 w-4 text-white/25" /> : <XCircle className="h-4 w-4 text-white/10" />}</div>
                <div className="flex justify-center">{i < 2 ? <CheckCircle2 className="h-4 w-4 text-white/25" /> : <XCircle className="h-4 w-4 text-white/10" />}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 border-y border-white/5" style={{ background: `${NAVY_CARD}66` }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">Transparent Pricing</h2>
            <p className="text-white/40">Choose the intelligence tier that fits your needs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="border-white/8 flex flex-col" style={{ background: NAVY }}>
              <CardHeader>
                <CardTitle className="text-xl text-white">Starter</CardTitle>
                <CardDescription className="text-white/40">For casual browsers</CardDescription>
                <div className="mt-4"><span className="text-4xl font-bold font-mono text-white">Free</span></div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2.5 text-sm text-white/50">
                {["5 analyses per month", "3 core modules", "Basic yield calculation"].map(f => (
                  <div key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-white/25" />{f}</div>
                ))}
              </CardContent>
              <div className="p-6 pt-0">
                <a href="#waitlist"><Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5 hover:text-white">Join Waitlist</Button></a>
              </div>
            </Card>

            {/* Analyst - highlighted */}
            <Card className="flex flex-col relative overflow-hidden" style={{ background: NAVY_CARD, border: `1px solid ${GOLD}40` }}>
              <div className="absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)`, color: NAVY }}>POPULAR</div>
              <CardHeader>
                <CardTitle className="text-xl text-white">Analyst</CardTitle>
                <CardDescription className="text-white/40">For active investors</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-mono text-white">AED 30</span>
                  <span className="text-white/40">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2.5 text-sm text-white/60">
                {["100 analyses per month", "5 intelligence modules", "5-year forecasting", "PDF reports"].map(f => (
                  <div key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: GOLD }} />{f}</div>
                ))}
              </CardContent>
              <div className="p-6 pt-0">
                <a href="#waitlist">
                  <Button className="w-full font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)`, color: NAVY }}>
                    Join Waitlist
                  </Button>
                </a>
              </div>
            </Card>

            {/* Pro */}
            <Card className="border-white/8 flex flex-col" style={{ background: NAVY }}>
              <CardHeader>
                <CardTitle className="text-xl text-white">Pro</CardTitle>
                <CardDescription className="text-white/40">For industry professionals</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold font-mono text-white">AED 150</span>
                  <span className="text-white/40">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2.5 text-sm text-white/50">
                {["Unlimited analyses", "All 6 modules", "Liquidity scoring", "White-label reports", "API access"].map(f => (
                  <div key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-white/25" />{f}</div>
                ))}
              </CardContent>
              <div className="p-6 pt-0">
                <a href="#waitlist"><Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5 hover:text-white">Join Waitlist</Button></a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center">
            {[
              { value: 47, suffix: "+", label: "Early Signups" },
              { value: 180000, suffix: "+", label: "Transactions Analysed" },
              { value: 6, suffix: "", label: "Intelligence Modules" },
              { value: 99, suffix: "%", label: "Would Recommend" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-serif font-bold" style={{ color: GOLD }}>
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 border-y border-white/5" style={{ background: `${NAVY_CARD}55` }}>
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-serif font-bold text-white text-center mb-10">What Beta Testers Say</h2>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { quote: "I used to spend hours cross-referencing DLD data manually. PropIQ does it in seconds and the yield calculation is actually accurate — not the inflated portal numbers.", name: "Omar K.", role: "Property Investor, Dubai" },
              { quote: "The liquidity score alone is worth it. I avoided a community where it was taking 90+ days to sell. Saved me from a bad exit.", name: "Sarah M.", role: "Buy-to-let Investor, Abu Dhabi" },
              { quote: "As an agent, showing clients a PropIQ report builds instant credibility. They see real DLD data, not my opinion.", name: "James T.", role: "Real Estate Agent, Dubai Marina" },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="border-white/6 h-full" style={{ background: NAVY }}>
                  <CardContent className="pt-6">
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-current" style={{ color: GOLD }} />)}
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-white/30">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist Form ── */}
      <section id="waitlist" className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-4" style={{ borderColor: `${GOLD}30`, background: `${GOLD}08`, color: GOLD }}>
                <Users className="h-3 w-3" /> {waitlistCount}+ people already signed up
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">Get Early Access</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                PropIQ is in closed beta. Join the waitlist and be among the first to access institutional-grade UAE property intelligence — before the public launch.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 p-8" style={{ background: NAVY_CARD }}>
              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${GOLD}15` }}>
                    <CheckCircle2 className="h-8 w-8" style={{ color: GOLD }} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-white mb-2">You're on the list!</h3>
                  <p className="text-white/50 text-sm mb-6">We'll email you as soon as early access opens. You're #{waitlistCount} in line.</p>
                  <div className="flex gap-3 justify-center">
                    <a href="https://twitter.com/intent/tweet?text=Just+joined+the+%40PropIQ+waitlist+—+the+Bloomberg+Terminal+for+UAE+real+estate+%F0%9F%8F%99%EF%B8%8F&url=https://propiq.ai" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
                        Share on X / Twitter
                      </Button>
                    </a>
                  </div>
                </motion.div>
              ) : (
                <WaitlistForm onSuccess={handleWaitlistSuccess} />
              )}
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-white/25">
              <div className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> No spam, ever</div>
              <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Unsubscribe anytime</div>
              <div className="flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" /> Data never sold</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12" style={{ background: NAVY_CARD }}>
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, #A07830)` }}>
              <span className="font-serif font-bold text-xs" style={{ color: NAVY }}>P</span>
            </div>
            <span className="font-serif font-bold text-white">PropIQ</span>
          </div>
          <p className="text-xs text-white/25 max-w-md text-center">
            PropIQ provides estimates based on market data. Not financial advice. Past performance is not indicative of future results.
          </p>
          <p className="text-xs text-white/25">© {new Date().getFullYear()} PropIQ Analytics</p>
        </div>
      </footer>
    </div>
  );
}

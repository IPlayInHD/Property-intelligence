import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  motion, useScroll, useTransform, useSpring, useInView,
  useMotionValue, useMotionValueEvent, AnimatePresence,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity, ArrowRight, BarChart3, CheckCircle2, ChevronRight,
  Droplets, Map, Percent, ShieldAlert, XCircle,
  Users, Star, Lock, Globe, MousePointer2, Radar,
} from "lucide-react";
import CityScene, { type SceneState } from "@/components/three/CityScene";

// ─── Palette — obsidian night, champagne gold, holographic cyan ─────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C87A";
const GOLD_DEEP = "#A07830";
const CYAN = "#4FE3E9";
const OBSIDIAN = "#050B16";
const PANEL = "#0C1B33";

const TICKER_ITEMS = [
  { label: "Dubai Marina 2BR", value: "AED 1.85M", delta: "+12.4%", up: true },
  { label: "Downtown 1BR", value: "AED 2.10M", delta: "+8.1%", up: true },
  { label: "JVC Studio", value: "AED 550K", delta: "+18.2%", up: true },
  { label: "Palm Jumeirah Villa", value: "AED 18.4M", delta: "+22.7%", up: true },
  { label: "Business Bay 1BR", value: "AED 1.32M", delta: "-2.3%", up: false },
  { label: "JBR 3BR", value: "AED 3.65M", delta: "+9.8%", up: true },
  { label: "Arabian Ranches Villa", value: "AED 5.20M", delta: "+14.5%", up: true },
  { label: "DIFC 2BR", value: "AED 3.10M", delta: "+6.2%", up: true },
];

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    const dur = 1600;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setCount(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Ticker ──────────────────────────────────────────────────────────────────
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-black/30 py-2.5" aria-hidden>
      <div className="flex gap-10 whitespace-nowrap" style={{ animation: "ticker 42s linear infinite", width: "max-content" }}>
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
            <span className="text-white/40">{t.label}</span>
            <span className="text-white/80">{t.value}</span>
            <span style={{ color: t.up ? "#22C55E" : "#EF4444" }}>{t.delta} {t.up ? "▲" : "▼"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 3D tilt card ────────────────────────────────────────────────────────────
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    rx.set((0.5 - (e.clientY - r.top) / r.height) * 12);
  }, [rx, ry]);
  const onLeave = useCallback(() => { rx.set(0); ry.set(0); }, [rx, ry]);

  return (
    <div style={{ perspective: 900 }} className={className}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
        className="relative h-full will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── Waitlist form ───────────────────────────────────────────────────────────
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

  return (
    <AnimatePresence mode="wait">
      {step === 1 ? (
        <motion.form key="s1" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} onSubmit={handleNext} className="space-y-4">
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
          <Button type="submit" size="lg" className="w-full text-base font-semibold h-12" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: OBSIDIAN }}>
            Continue <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.form>
      ) : (
        <motion.form key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" size="lg" disabled={loading} className="w-full text-base font-semibold h-12" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: OBSIDIAN }}>
            {loading ? "Joining..." : "Join the Waitlist"} {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

// ─── Story chapter overlay ───────────────────────────────────────────────────
function Chapter({
  progress, range, align = "center", children,
}: {
  progress: any; range: [number, number, number, number]; align?: "left" | "right" | "center"; children: React.ReactNode;
}) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, [range[0], range[1]], [40, 0]);
  const pointerEvents = useTransform(opacity, (v: number) => (v > 0.5 ? "auto" : "none"));
  const alignClass = align === "left"
    ? "items-center justify-start pl-6 md:pl-[8vw]"
    : align === "right"
      ? "items-center justify-end pr-6 md:pr-[8vw]"
      : "items-center justify-center text-center";
  return (
    <motion.div style={{ opacity, y, pointerEvents }} className={`absolute inset-0 flex ${alignClass}`}>
      {children}
    </motion.div>
  );
}

function StatChip({ k, v, accent = GOLD_LIGHT }: { k: string; v: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 backdrop-blur-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{k}</div>
      <div className="text-lg font-mono font-bold" style={{ color: accent }}>{v}</div>
    </div>
  );
}

// ─── Feature data ────────────────────────────────────────────────────────────
const FEATURES = [
  { title: "Price Fairness Index", desc: "Compare against real DLD transactions, not inflated asking prices. Know instantly if you're overpaying.", icon: ShieldAlert, color: "#60A5FA", stat: "8%", statLabel: "avg overpricing detected" },
  { title: "True Rental Yield", desc: "Actual net yields after service charges, maintenance reserves, and realistic vacancy periods.", icon: Percent, color: "#22C55E", stat: "6.4%", statLabel: "real net yield vs 8% claimed" },
  { title: "Future Valuation", desc: "5-year forecasting models built on macroeconomic indicators and community supply pipelines.", icon: BarChart3, color: GOLD, stat: "+37%", statLabel: "5Y projection, Marina 2BR" },
  { title: "Liquidity Score", desc: "Know how fast you can exit before you enter. Transaction velocity and active listing ratios.", icon: Droplets, color: "#F59E0B", stat: "42", statLabel: "avg days-to-sell tracked" },
  { title: "Quality of Life", desc: "Objective scoring of amenities, metro access, schools, and infrastructure proximity.", icon: Map, color: "#A78BFA", stat: "84", statLabel: "QoL score, Dubai Marina" },
  { title: "Trend Analytics", desc: "Community-level price and volume trends so you can time your entry — and your exit.", icon: Activity, color: "#F472B6", stat: "180K+", statLabel: "transactions analysed" },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [waitlistCount, setWaitlistCount] = useState<number>(47);
  const [submitted, setSubmitted] = useState(false);

  const sceneState = useRef<SceneState>({ p: 0, mx: 0, my: 0 });

  const { scrollYProgress: pageProgress } = useScroll();
  const progressX = useSpring(pageProgress, { stiffness: 120, damping: 26 });

  const storyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: storyP } = useScroll({ target: storyRef, offset: ["start start", "end end"] });
  useMotionValueEvent(storyP, "change", (v) => { sceneState.current.p = v; });

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    sceneState.current.mx = (e.clientX / window.innerWidth - 0.5) * 2;
    sceneState.current.my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, []);

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
    <div className="min-h-screen font-sans antialiased overflow-x-clip" style={{ background: OBSIDIAN, color: "#E8F0FB" }}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 24px rgba(201,168,76,0.25); }
          50% { box-shadow: 0 0 48px rgba(201,168,76,0.5); }
        }
        .shimmer-text {
          background: linear-gradient(110deg, ${GOLD} 20%, #FFF3D6 40%, ${GOLD} 60%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer-text { animation: none; }
        }
      `}</style>

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2.5px] z-[60] origin-left"
        style={{ scaleX: progressX, background: `linear-gradient(90deg, ${GOLD_DEEP}, ${GOLD_LIGHT})` }}
      />

      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md" style={{ background: `${OBSIDIAN}CC` }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, animation: "pulse-glow 4s ease-in-out infinite" }}>
              <span className="font-serif font-bold text-sm" style={{ color: OBSIDIAN }}>P</span>
            </div>
            <span className="font-serif text-xl font-bold tracking-wide text-white">PropIQ</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/demo" className="transition-colors" style={{ color: GOLD }}>Try Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:flex text-white/50 hover:text-white hover:bg-white/5">Log in</Button>
            </Link>
            <a href="#waitlist">
              <Button size="sm" className="font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: OBSIDIAN }}>
                Join Waitlist
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ── 3D flight-through story (500vh scroll = camera flight) ── */}
      <div ref={storyRef} className="relative" style={{ height: "500vh" }} onPointerMove={onPointerMove}>
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* WebGL city */}
          <div className="absolute inset-0">
            <CityScene state={sceneState} />
          </div>
          {/* readability vignette */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 55%, rgba(5,11,22,0.55) 100%)" }} />

          {/* Chapter 0 — arrival */}
          <Chapter progress={storyP} range={[0, 0.02, 0.16, 0.24]} align="center">
            <div className="max-w-4xl px-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-8 backdrop-blur-sm" style={{ borderColor: `${GOLD}40`, background: "rgba(5,11,22,0.5)", color: GOLD_LIGHT }}>
                <Radar className="h-3.5 w-3.5" />
                The Bloomberg Terminal for UAE Real Estate
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-6 leading-[1.04] text-white" style={{ textShadow: "0 4px 40px rgba(0,0,0,0.6)" }}>
                The city knows<br />what it's{" "}
                <span className="shimmer-text">really worth.</span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
                PropIQ reads 180,000+ real DLD transactions so investors and homeowners can see the true value, yield, and exit speed of any UAE property.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo">
                  <Button size="lg" className="w-full sm:w-auto text-base h-13 px-8 gap-2 font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: OBSIDIAN, animation: "pulse-glow 4s ease-in-out infinite" }}>
                    Try the Live Demo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#waitlist">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-13 px-8 bg-black/30 border-white/15 text-white hover:bg-white/10 backdrop-blur-sm">
                    Join {waitlistCount}+ on Waitlist
                  </Button>
                </a>
              </div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="mt-14 flex flex-col items-center gap-2 text-white/30 text-xs"
              >
                <MousePointer2 className="h-4 w-4" />
                Scroll to fly through the city
              </motion.div>
            </div>
          </Chapter>

          {/* Chapter 1 — price fairness (Marina tower) */}
          <Chapter progress={storyP} range={[0.24, 0.3, 0.42, 0.48]} align="left">
            <div className="max-w-md rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-7" style={{ boxShadow: `0 0 60px rgba(201,168,76,0.12)` }}>
              <div className="text-xs font-mono tracking-widest mb-3" style={{ color: CYAN }}>01 / PRICE FAIRNESS</div>
              <div className="text-sm text-white/40 mb-1">Dubai Marina · 2BR Apartment</div>
              <h3 className="text-3xl font-serif font-bold text-white mb-2">AED 1,850,000</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-5">
                Listed <span style={{ color: GOLD_LIGHT }}>8% below</span> the average of 2,847 real DLD transactions in this tower cluster. Not an asking price — the actual market.
              </p>
              <div className="flex gap-3">
                <StatChip k="Fairness" v="78/100" />
                <StatChip k="vs DLD avg" v="-8%" accent="#22C55E" />
                <StatChip k="Comparables" v="2,847" accent={CYAN} />
              </div>
            </div>
          </Chapter>

          {/* Chapter 2 — true yield (Downtown tower) */}
          <Chapter progress={storyP} range={[0.48, 0.54, 0.66, 0.72]} align="right">
            <div className="max-w-md rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-7" style={{ boxShadow: `0 0 60px rgba(79,227,233,0.10)` }}>
              <div className="text-xs font-mono tracking-widest mb-3" style={{ color: CYAN }}>02 / TRUE NET YIELD</div>
              <div className="text-sm text-white/40 mb-1">JVC · Studio</div>
              <h3 className="text-3xl font-serif font-bold text-white mb-2">8.2% <span className="text-lg text-white/40 font-sans">net yield</span></h3>
              <p className="text-white/60 text-sm leading-relaxed mb-5">
                After service charges, maintenance reserves, and realistic vacancy — not the inflated gross number portals advertise.
              </p>
              <div className="flex gap-3">
                <StatChip k="Gross" v="9.6%" accent="rgba(255,255,255,0.5)" />
                <StatChip k="Net" v="8.2%" accent="#22C55E" />
                <StatChip k="Days to sell" v="61" />
              </div>
            </div>
          </Chapter>

          {/* Chapter 3 — liquidity / exit (JVC tower) */}
          <Chapter progress={storyP} range={[0.72, 0.78, 0.86, 0.9]} align="left">
            <div className="max-w-md rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-7" style={{ boxShadow: `0 0 60px rgba(201,168,76,0.12)` }}>
              <div className="text-xs font-mono tracking-widest mb-3" style={{ color: CYAN }}>03 / LIQUIDITY & EXIT</div>
              <div className="text-sm text-white/40 mb-1">Before you enter, know your exit</div>
              <h3 className="text-3xl font-serif font-bold text-white mb-2">42 days <span className="text-lg text-white/40 font-sans">avg. to sell</span></h3>
              <p className="text-white/60 text-sm leading-relaxed mb-5">
                Transaction velocity, active listing ratios, and absorption rates — so you never get trapped in an illiquid asset.
              </p>
              <div className="flex gap-3">
                <StatChip k="Liquidity" v="65/100" />
                <StatChip k="5Y forecast" v="+37%" accent="#22C55E" />
                <StatChip k="Modules" v="6" accent={CYAN} />
              </div>
            </div>
          </Chapter>

          {/* Chapter 4 — the pull-back */}
          <Chapter progress={storyP} range={[0.9, 0.95, 0.99, 1]} align="center">
            <div className="max-w-3xl px-6">
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6" style={{ textShadow: "0 4px 40px rgba(0,0,0,0.6)" }}>
                Every tower.<br />Every transaction. <span className="shimmer-text">One score.</span>
              </h2>
              <div className="flex flex-wrap justify-center gap-8 mb-10 font-mono text-sm text-white/50">
                <span><span className="text-2xl font-bold block" style={{ color: GOLD }}>180K+</span>DLD transactions</span>
                <span><span className="text-2xl font-bold block" style={{ color: GOLD }}>6</span>intelligence modules</span>
                <span><span className="text-2xl font-bold block" style={{ color: GOLD }}>5-yr</span>price forecasting</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo">
                  <Button size="lg" className="text-base h-13 px-8 gap-2 font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: OBSIDIAN }}>
                    Analyse a Property <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Chapter>

          {/* chapter progress dots */}
          <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3">
            {[0.02, 0.36, 0.6, 0.81, 0.97].map((center, i) => {
              return <ChapterDot key={i} progress={storyP} center={center} />;
            })}
          </div>
        </div>
      </div>

      {/* ── Live market ticker ── */}
      <Ticker />

      {/* ── Features ── */}
      <section id="features" className="py-24 border-b border-white/5 relative" style={{ background: `${PANEL}55` }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4">6 Modules of Intelligence</h2>
            <p className="text-white/40 max-w-xl mx-auto">Every number backed by real DLD transactions and macroeconomic data — not portal estimates.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.6 }}>
                <TiltCard className="h-full">
                  <div className="rounded-xl border border-white/6 h-full p-6 hover:border-white/15 transition-colors flex flex-col" style={{ background: `${OBSIDIAN}E6` }}>
                    <div className="h-11 w-11 rounded-lg flex items-center justify-center mb-4" style={{ background: `${f.color}15` }}>
                      <f.icon className="h-5 w-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed flex-1">{f.desc}</p>
                    <div className="mt-5 pt-4 border-t border-white/5 flex items-baseline gap-2">
                      <span className="text-2xl font-mono font-bold" style={{ color: f.color }}>{f.stat}</span>
                      <span className="text-xs text-white/30">{f.statLabel}</span>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="comparison" className="py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">Why Serious Investors Choose PropIQ</h2>
            <p className="text-white/40">Portals are for browsing. PropIQ is for analysing.</p>
          </motion.div>

          <div className="max-w-4xl mx-auto rounded-xl border border-white/8 overflow-hidden" style={{ background: PANEL }}>
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
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="grid grid-cols-4 border-b border-white/5 p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="text-sm text-white/70">{feature}</div>
                <div className="flex justify-center"><CheckCircle2 className="h-4 w-4" style={{ color: GOLD }} /></div>
                <div className="flex justify-center">{i < 2 ? <CheckCircle2 className="h-4 w-4 text-white/25" /> : <XCircle className="h-4 w-4 text-white/10" />}</div>
                <div className="flex justify-center">{i < 2 ? <CheckCircle2 className="h-4 w-4 text-white/25" /> : <XCircle className="h-4 w-4 text-white/10" />}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 border-y border-white/5 relative overflow-hidden" style={{ background: `${PANEL}44` }}>
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ background: GOLD }} />
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">Transparent Pricing</h2>
            <p className="text-white/40">Choose the intelligence tier that fits your needs.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {[
              {
                name: "Starter", desc: "For casual browsers", price: "Free", period: "",
                features: ["5 analyses per month", "3 core modules", "Basic yield calculation"],
                highlight: false,
              },
              {
                name: "Analyst", desc: "For active investors", price: "AED 30", period: "/mo",
                features: ["100 analyses per month", "5 intelligence modules", "5-year forecasting", "PDF reports"],
                highlight: true,
              },
              {
                name: "Pro", desc: "For industry professionals", price: "AED 150", period: "/mo",
                features: ["Unlimited analyses", "All 6 modules", "Liquidity scoring", "White-label reports", "API access"],
                highlight: false,
              },
            ].map((tier, i) => (
              <motion.div key={tier.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }} className="h-full">
                <TiltCard className="h-full">
                  <div
                    className="rounded-xl flex flex-col h-full p-6 relative overflow-hidden"
                    style={tier.highlight
                      ? { background: PANEL, border: `1px solid ${GOLD}50`, boxShadow: `0 0 40px ${GOLD}18` }
                      : { background: OBSIDIAN, border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {tier.highlight && (
                      <div className="absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: OBSIDIAN }}>POPULAR</div>
                    )}
                    <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                    <p className="text-sm text-white/40 mt-1">{tier.desc}</p>
                    <div className="mt-5 mb-6">
                      <span className="text-4xl font-bold font-mono text-white">{tier.price}</span>
                      <span className="text-white/40">{tier.period}</span>
                    </div>
                    <div className="space-y-2.5 text-sm flex-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {tier.features.map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: tier.highlight ? GOLD : "rgba(255,255,255,0.25)" }} />
                          {f}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <a href="#waitlist">
                        {tier.highlight ? (
                          <Button className="w-full font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: OBSIDIAN }}>Join Waitlist</Button>
                        ) : (
                          <Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5 hover:text-white">Join Waitlist</Button>
                        )}
                      </a>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: 180000, suffix: "+", label: "UAE transactions analysed" },
              { value: 6, suffix: "", label: "Intelligence modules" },
              { value: waitlistCount, suffix: "+", label: "Investors on waitlist" },
              { value: 99, suffix: "%", label: "Real DLD data coverage" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <div className="text-4xl md:text-5xl font-serif font-bold" style={{ color: GOLD }}>
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-white/40 mt-2">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 border-y border-white/5" style={{ background: `${PANEL}44` }}>
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white text-center mb-10">What Beta Testers Say</h2>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { quote: "I used to spend hours cross-referencing DLD data manually. PropIQ does it in seconds and the yield calculation is actually accurate — not the inflated portal numbers.", name: "Omar K.", role: "Property Investor, Dubai" },
              { quote: "The liquidity score alone is worth it. I avoided a community where it was taking 90+ days to sell. Saved me from a bad exit.", name: "Sarah M.", role: "Buy-to-let Investor, Abu Dhabi" },
              { quote: "As an agent, showing clients a PropIQ report builds instant credibility. They see real DLD data, not my opinion.", name: "James T.", role: "Real Estate Agent, Dubai Marina" },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <TiltCard className="h-full">
                  <div className="rounded-xl border border-white/6 h-full p-6" style={{ background: PANEL }}>
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-current" style={{ color: GOLD }} />)}
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-white/30">{t.role}</p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist ── */}
      <section id="waitlist" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(to right, ${GOLD} 1px, transparent 1px), linear-gradient(to bottom, ${GOLD} 1px, transparent 1px)`, backgroundSize: "3rem 3rem", maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)" }} />
        <div className="container relative mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-4" style={{ borderColor: `${GOLD}30`, background: `${GOLD}08`, color: GOLD }}>
                <Users className="h-3 w-3" /> {waitlistCount}+ people already signed up
              </div>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">Get Early Access</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                PropIQ is in closed beta. Join the waitlist and be among the first to access institutional-grade UAE property intelligence — before the public launch.
              </p>
            </motion.div>

            <div className="rounded-2xl border p-8 backdrop-blur-sm" style={{ background: `${PANEL}F2`, borderColor: `${GOLD}20`, boxShadow: `0 0 60px ${GOLD}0F` }}>
              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${GOLD}15` }}>
                    <CheckCircle2 className="h-8 w-8" style={{ color: GOLD }} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-white mb-2">You're on the list!</h3>
                  <p className="text-white/50 text-sm mb-6">We'll email you as soon as early access opens. You're #{waitlistCount} in line.</p>
                  <a href="https://twitter.com/intent/tweet?text=Just+joined+the+%40PropIQ+waitlist+—+the+Bloomberg+Terminal+for+UAE+real+estate+%F0%9F%8F%99%EF%B8%8F&url=https://propiq.ai" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
                      Share on X / Twitter
                    </Button>
                  </a>
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
      <footer className="border-t border-white/5 py-12" style={{ background: "#040910" }}>
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})` }}>
              <span className="font-serif font-bold text-xs" style={{ color: OBSIDIAN }}>P</span>
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

// side progress dot for the story section
function ChapterDot({ progress, center }: { progress: any; center: number }) {
  const opacity = useTransform(progress, [center - 0.12, center, center + 0.12], [0.25, 1, 0.25]);
  const scale = useTransform(progress, [center - 0.12, center, center + 0.12], [1, 1.6, 1]);
  return (
    <motion.span
      style={{ opacity, scale, background: GOLD_LIGHT }}
      className="w-1.5 h-1.5 rounded-full"
    />
  );
}

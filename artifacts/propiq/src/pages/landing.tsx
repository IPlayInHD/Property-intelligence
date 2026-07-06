import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  motion, useScroll, useTransform, useSpring, useInView,
  useMotionValue, AnimatePresence,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity, ArrowRight, BarChart3, CheckCircle2, ChevronRight,
  Droplets, Map, Percent, ShieldAlert, XCircle, Building2,
  Users, Star, Zap, Lock, Globe, TrendingUp, Sparkles, MousePointer2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

// ─── Palette ─────────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C87A";
const GOLD_DEEP = "#A07830";
const NAVY = "#0A1628";
const NAVY_CARD = "#112240";
const NAVY_DEEP = "#060D1A";

// ─── Demo data ───────────────────────────────────────────────────────────────
const FORECAST_DATA = [
  { year: "2024", value: 1_850_000 },
  { year: "2025", value: 1_940_000 },
  { year: "2026", value: 2_080_000 },
  { year: "2027", value: 2_210_000 },
  { year: "2028", value: 2_390_000 },
  { year: "2029", value: 2_540_000 },
];

const LISTINGS = [
  { community: "Dubai Marina", type: "2BR Apartment", price: "AED 1,850,000", yield: "6.4%", score: 78, trend: "+12%" },
  { community: "Downtown Dubai", type: "1BR Apartment", price: "AED 2,100,000", yield: "5.1%", score: 71, trend: "+8%" },
  { community: "JVC", type: "Studio", price: "AED 550,000", yield: "8.2%", score: 85, trend: "+18%" },
];

const SCORES = [
  { name: "Price Fairness", value: 78, fill: GOLD, description: "Listed 8% below DLD avg" },
  { name: "Rental Yield", value: 91, fill: "#22C55E", description: "6.4% net yield" },
  { name: "Liquidity", value: 65, fill: "#60A5FA", description: "Avg 42 days to sell" },
  { name: "Quality of Life", value: 84, fill: "#A78BFA", description: "Metro & mall nearby" },
];

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

// ─── Dubai skyline (parallax SVG layers) ─────────────────────────────────────
function Skyline({ y, opacity, color, buildings }: { y: any; opacity: number; color: string; buildings: string }) {
  return (
    <motion.svg
      style={{ y }}
      viewBox="0 0 1440 320"
      preserveAspectRatio="xMidYMax slice"
      className="absolute bottom-0 left-0 w-full h-[45vh] pointer-events-none"
    >
      <path d={buildings} fill={color} opacity={opacity} />
    </motion.svg>
  );
}

// Stylised skyline paths — back, mid, front layers (Burj-Khalifa-ish spike in mid layer)
const SKY_BACK = "M0 320 L0 240 L60 240 L60 200 L90 200 L90 250 L140 250 L140 190 L180 190 L180 240 L240 240 L240 170 L270 170 L270 230 L330 230 L330 200 L370 200 L370 250 L430 250 L430 210 L470 210 L470 240 L540 240 L540 180 L580 180 L580 230 L650 230 L650 200 L700 200 L700 250 L770 250 L770 190 L820 190 L820 240 L890 240 L890 210 L940 210 L940 250 L1010 250 L1010 180 L1060 180 L1060 230 L1130 230 L1130 200 L1180 200 L1180 240 L1250 240 L1250 190 L1300 190 L1300 230 L1360 230 L1360 210 L1440 210 L1440 320 Z";
const SKY_MID = "M0 320 L0 260 L50 260 L50 210 L80 210 L80 260 L130 260 L130 180 L160 180 L160 250 L220 250 L220 200 L260 200 L260 260 L320 260 L320 160 L350 160 L350 240 L420 240 L420 190 L460 190 L460 260 L520 260 L520 220 L560 220 L560 260 L610 260 L618 60 L626 40 L634 60 L642 260 L700 260 L700 200 L740 200 L740 250 L800 250 L800 170 L840 170 L840 240 L910 240 L910 190 L950 190 L950 260 L1020 260 L1020 210 L1070 210 L1070 250 L1140 250 L1140 170 L1180 170 L1180 240 L1250 240 L1250 200 L1300 200 L1300 260 L1370 260 L1370 220 L1440 220 L1440 320 Z";
const SKY_FRONT = "M0 320 L0 290 L70 290 L70 250 L110 250 L110 290 L180 290 L180 230 L220 230 L220 280 L300 280 L300 250 L350 250 L350 290 L430 290 L430 240 L480 240 L480 280 L560 280 L560 260 L620 260 L620 290 L700 290 L700 240 L750 240 L750 280 L830 280 L830 250 L890 250 L890 290 L970 290 L970 230 L1020 230 L1020 280 L1100 280 L1100 260 L1160 260 L1160 290 L1240 290 L1240 240 L1300 240 L1300 280 L1440 280 L1440 320 Z";

// ─── Floating gold particles ─────────────────────────────────────────────────
function Particles() {
  const dots = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      left: (i * 37.7) % 100,
      size: 2 + ((i * 13) % 4),
      duration: 14 + ((i * 7) % 16),
      delay: -((i * 5) % 20),
      opacity: 0.15 + ((i * 11) % 30) / 100,
    })),
  ).current;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            bottom: "-10px",
            width: d.size,
            height: d.size,
            background: GOLD,
            opacity: d.opacity,
            animation: `float-up ${d.duration}s linear ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── 3D tilt card (mouse-tracking perspective) ──────────────────────────────
function TiltCard({ children, className = "", glare = true }: { children: React.ReactNode; className?: string; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 14);
    rx.set((0.5 - py) * 14);
    gx.set(px * 100);
    gy.set(py * 100);
  }, [rx, ry, gx, gy]);

  const onLeave = useCallback(() => { rx.set(0); ry.set(0); }, [rx, ry]);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  useEffect(() => {
    const ux = gx.on("change", (v) => setGlarePos(p => ({ ...p, x: v })));
    const uy = gy.on("change", (v) => setGlarePos(p => ({ ...p, y: v })));
    return () => { ux(); uy(); };
  }, [gx, gy]);

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
        {glare && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(232,200,122,0.10), transparent 55%)` }}
          />
        )}
      </motion.div>
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
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
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Ticker marquee ──────────────────────────────────────────────────────────
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-black/20 py-2.5" aria-hidden>
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

// ─── Score ring ──────────────────────────────────────────────────────────────
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

// ─── Section reveal wrapper ──────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Waitlist form (unchanged logic, restyled) ──────────────────────────────
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
          <Button type="submit" size="lg" className="w-full text-base font-semibold h-12" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY }}>
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
          <Button type="submit" size="lg" disabled={loading} className="w-full text-base font-semibold h-12" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY }}>
            {loading ? "Joining..." : "Join the Waitlist"} {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

// ─── Feature data ────────────────────────────────────────────────────────────
const FEATURES = [
  { title: "Price Fairness Index", desc: "Compare against real DLD transactions, not inflated asking prices. Know instantly if you're overpaying.", icon: ShieldAlert, color: "#60A5FA", stat: "8%", statLabel: "avg overpricing detected" },
  { title: "True Rental Yield", desc: "Actual net yields after service charges, maintenance reserves, and realistic vacancy periods.", icon: Percent, color: "#22C55E", stat: "6.4%", statLabel: "real net yield vs 8% claimed" },
  { title: "Future Valuation", desc: "5-year forecasting models built on macroeconomic indicators and community supply pipelines.", icon: BarChart3, color: GOLD, stat: "+37%", statLabel: "5Y projection accuracy" },
  { title: "Liquidity Score", desc: "Know how fast you can exit before you enter. Transaction velocity and active listing ratios.", icon: Droplets, color: "#F59E0B", stat: "42", statLabel: "avg days-to-sell tracked" },
  { title: "Quality of Life", desc: "Objective scoring of amenities, metro access, schools, and infrastructure proximity.", icon: Map, color: "#A78BFA", stat: "84", statLabel: "QoL score, Dubai Marina" },
  { title: "Trend Analytics", desc: "Community-level price and volume trends so you can time your entry — and your exit.", icon: Activity, color: "#F472B6", stat: "180K+", statLabel: "transactions analysed" },
];

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Landing() {
  const [waitlistCount, setWaitlistCount] = useState<number>(47);
  const [submitted, setSubmitted] = useState(false);
  const [activeProperty, setActiveProperty] = useState(0);

  // Page scroll progress bar
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });

  // Hero parallax
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const skyBackY = useTransform(heroP, [0, 1], [0, 40]);
  const skyMidY = useTransform(heroP, [0, 1], [0, 90]);
  const skyFrontY = useTransform(heroP, [0, 1], [0, 150]);
  const heroTextY = useTransform(heroP, [0, 1], [0, -110]);
  const heroFade = useTransform(heroP, [0, 0.7], [1, 0]);
  const glowScale = useTransform(heroP, [0, 1], [1, 1.6]);

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
    <div className="min-h-screen font-sans antialiased overflow-x-clip" style={{ background: NAVY, color: "#E8F0FB" }}>
      {/* Keyframes for particles / ticker / shimmer */}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-110vh); }
        }
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
      <header className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md" style={{ background: `${NAVY}CC` }}>
        <div className="container mx-auto px-4 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, animation: "pulse-glow 4s ease-in-out infinite" }}>
              <span className="font-serif font-bold text-sm" style={{ color: NAVY }}>P</span>
            </div>
            <span className="font-serif text-xl font-bold tracking-wide text-white">PropIQ</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
            <a href="#demo" className="hover:text-white transition-colors">Live Demo</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/demo" className="transition-colors" style={{ color: GOLD }}>Try Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:flex text-white/50 hover:text-white hover:bg-white/5">Log in</Button>
            </Link>
            <a href="#waitlist">
              <Button size="sm" className="font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY }}>
                Join Waitlist
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero with parallax Dubai skyline ── */}
      <section ref={heroRef} className="relative min-h-[108vh] flex flex-col justify-center overflow-hidden" style={{ background: `linear-gradient(180deg, ${NAVY_DEEP} 0%, ${NAVY} 55%, #0C1B33 100%)` }}>
        {/* Stars */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: "radial-gradient(1px 1px at 12% 22%, #fff8, transparent), radial-gradient(1px 1px at 34% 8%, #fff6, transparent), radial-gradient(1.5px 1.5px at 56% 18%, #fff9, transparent), radial-gradient(1px 1px at 71% 30%, #fff5, transparent), radial-gradient(1px 1px at 88% 12%, #fff7, transparent), radial-gradient(1.5px 1.5px at 23% 38%, #fff4, transparent), radial-gradient(1px 1px at 44% 28%, #fff6, transparent), radial-gradient(1px 1px at 92% 40%, #fff5, transparent)",
        }} />
        {/* Golden moon glow */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            scale: glowScale,
            top: "8%", right: "14%", width: 220, height: 220,
            background: `radial-gradient(circle, ${GOLD}30 0%, ${GOLD}12 40%, transparent 70%)`,
            filter: "blur(2px)",
          }}
        />
        <Particles />

        {/* Parallax skyline layers */}
        <Skyline y={skyBackY} opacity={0.25} color="#132A4D" buildings={SKY_BACK} />
        <Skyline y={skyMidY} opacity={0.55} color="#0E2140" buildings={SKY_MID} />
        <Skyline y={skyFrontY} opacity={0.95} color={NAVY_DEEP} buildings={SKY_FRONT} />
        {/* Window lights on front layer */}
        <motion.div style={{ y: skyFrontY }} className="absolute bottom-0 left-0 w-full h-[45vh] pointer-events-none">
          {Array.from({ length: 40 }, (_, i) => (
            <span key={i} className="absolute rounded-[1px]" style={{
              left: `${(i * 41) % 97 + 1}%`,
              bottom: `${4 + ((i * 17) % 18)}%`,
              width: 2.5, height: 3.5,
              background: (i % 3 === 0) ? GOLD_LIGHT : "#FFE9B8",
              opacity: 0.25 + ((i * 7) % 50) / 100,
            }} />
          ))}
        </motion.div>

        <motion.div style={{ y: heroTextY, opacity: heroFade }} className="container relative z-10 mx-auto px-4 text-center pt-28 pb-[38vh]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-8 backdrop-blur-sm" style={{ borderColor: `${GOLD}40`, background: `${GOLD}10`, color: GOLD_LIGHT }}>
              <Sparkles className="h-3.5 w-3.5" />
              The Bloomberg Terminal for UAE Real Estate
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-6 leading-[1.05] text-white">
              Know What a<br />
              Property Is{" "}
              <span className="shimmer-text">Really Worth</span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
              Institutional-grade financial intelligence for serious UAE property investors. Stop guessing with portal listings — start analysing with data-backed models.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo">
                <Button size="lg" className="w-full sm:w-auto text-base h-13 px-8 gap-2 font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY, animation: "pulse-glow 4s ease-in-out infinite" }}>
                  Try the Live Demo <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#waitlist">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-13 px-8 bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-sm">
                  Join {waitlistCount}+ on Waitlist
                </Button>
              </a>
            </div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="mt-16 flex flex-col items-center gap-2 text-white/25 text-xs"
            >
              <MousePointer2 className="h-4 w-4" />
              Scroll to explore
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Live market ticker ── */}
      <Ticker />

      {/* ── Stats strip ── */}
      <section className="py-14" style={{ background: NAVY_DEEP }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: 180000, suffix: "+", label: "UAE transactions analysed" },
              { value: 6, suffix: "", label: "Intelligence modules" },
              { value: waitlistCount, suffix: "+", label: "Investors on waitlist" },
              { value: 99, suffix: "%", label: "Real DLD data coverage" },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="text-4xl md:text-5xl font-serif font-bold" style={{ color: GOLD }}>
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-white/40 mt-2">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Interactive Demo ── */}
      <section id="demo" className="py-24 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.07] blur-3xl pointer-events-none" style={{ background: GOLD }} />
        <div className="container mx-auto px-4">
          <Reveal className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-4" style={{ borderColor: `${GOLD}30`, background: `${GOLD}08`, color: GOLD }}>
              <Activity className="h-3 w-3" /> Interactive Demo — no signup required
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">See PropIQ in Action</h2>
            <p className="text-white/40 max-w-xl mx-auto">Select a property below and watch the full intelligence analysis unfold.</p>
          </Reveal>

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
            <TiltCard glare className="mb-4">
              <div className="rounded-xl border border-white/8 p-6" style={{ background: NAVY_CARD }}>
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
            </TiltCard>

            <div className="grid md:grid-cols-5 gap-4">
              <TiltCard className="md:col-span-2">
                <div className="rounded-xl border border-white/8 p-6 h-full" style={{ background: NAVY_CARD }}>
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
              </TiltCard>

              <TiltCard className="md:col-span-3">
                <div className="rounded-xl border border-white/8 p-6 h-full" style={{ background: NAVY_CARD }}>
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
              </TiltCard>
            </div>

            <Reveal className="mt-4">
              <div className="rounded-xl border p-4 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: `${GOLD}25`, background: `${GOLD}08` }}>
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 shrink-0" style={{ color: GOLD }} />
                  <p className="text-sm text-white/60"><span className="text-white font-medium">Want the full experience?</span> Try the guided demo — full analysis flow, no signup.</p>
                </div>
                <Link href="/demo" className="shrink-0">
                  <Button size="sm" className="font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY }}>
                    Launch Guided Demo
                  </Button>
                </Link>
              </div>
            </Reveal>
          </motion.div>
        </div>
      </section>

      {/* ── Features (3D tilt grid) ── */}
      <section id="features" className="py-24 border-y border-white/5 relative" style={{ background: `${NAVY_CARD}66` }}>
        <div className="container mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4">6 Modules of Intelligence</h2>
            <p className="text-white/40 max-w-xl mx-auto">Every number backed by real DLD transactions and macroeconomic data — not portal estimates.</p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <TiltCard className="h-full">
                  <div className="rounded-xl border border-white/6 h-full p-6 hover:border-white/15 transition-colors flex flex-col" style={{ background: `${NAVY}E6` }}>
                    <div className="h-11 w-11 rounded-lg flex items-center justify-center mb-4" style={{ background: `${f.color}15`, transform: "translateZ(30px)" }}>
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="comparison" className="py-24">
        <div className="container mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">Why Serious Investors Choose PropIQ</h2>
            <p className="text-white/40">Portals are for browsing. PropIQ is for analysing.</p>
          </Reveal>

          <Reveal>
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
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 border-y border-white/5 relative overflow-hidden" style={{ background: `${NAVY_CARD}44` }}>
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ background: GOLD }} />
        <div className="container mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">Transparent Pricing</h2>
            <p className="text-white/40">Choose the intelligence tier that fits your needs.</p>
          </Reveal>

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
              <Reveal key={tier.name} delay={i * 0.1} className="h-full">
                <TiltCard className="h-full">
                  <div
                    className="rounded-xl flex flex-col h-full p-6 relative overflow-hidden"
                    style={tier.highlight
                      ? { background: NAVY_CARD, border: `1px solid ${GOLD}50`, boxShadow: `0 0 40px ${GOLD}18` }
                      : { background: NAVY, border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {tier.highlight && (
                      <div className="absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY }}>POPULAR</div>
                    )}
                    <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                    <p className="text-sm text-white/40 mt-1">{tier.desc}</p>
                    <div className="mt-5 mb-6">
                      <span className="text-4xl font-bold font-mono text-white">{tier.price}</span>
                      <span className="text-white/40">{tier.period}</span>
                    </div>
                    <div className="space-y-2.5 text-sm flex-1" style={{ color: tier.highlight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.5)" }}>
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
                          <Button className="w-full font-semibold" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY }}>Join Waitlist</Button>
                        ) : (
                          <Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5 hover:text-white">Join Waitlist</Button>
                        )}
                      </a>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Reveal><h2 className="text-2xl md:text-3xl font-serif font-bold text-white text-center mb-10">What Beta Testers Say</h2></Reveal>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { quote: "I used to spend hours cross-referencing DLD data manually. PropIQ does it in seconds and the yield calculation is actually accurate — not the inflated portal numbers.", name: "Omar K.", role: "Property Investor, Dubai" },
              { quote: "The liquidity score alone is worth it. I avoided a community where it was taking 90+ days to sell. Saved me from a bad exit.", name: "Sarah M.", role: "Buy-to-let Investor, Abu Dhabi" },
              { quote: "As an agent, showing clients a PropIQ report builds instant credibility. They see real DLD data, not my opinion.", name: "James T.", role: "Real Estate Agent, Dubai Marina" },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <TiltCard className="h-full">
                  <div className="rounded-xl border border-white/6 h-full p-6" style={{ background: NAVY_CARD }}>
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist ── */}
      <section id="waitlist" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(to right, ${GOLD} 1px, transparent 1px), linear-gradient(to bottom, ${GOLD} 1px, transparent 1px)`, backgroundSize: "3rem 3rem", maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)" }} />
        <div className="container relative mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <Reveal className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-4" style={{ borderColor: `${GOLD}30`, background: `${GOLD}08`, color: GOLD }}>
                <Users className="h-3 w-3" /> {waitlistCount}+ people already signed up
              </div>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3">Get Early Access</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                PropIQ is in closed beta. Join the waitlist and be among the first to access institutional-grade UAE property intelligence — before the public launch.
              </p>
            </Reveal>

            <Reveal>
              <div className="rounded-2xl border p-8 backdrop-blur-sm" style={{ background: `${NAVY_CARD}F2`, borderColor: `${GOLD}20`, boxShadow: `0 0 60px ${GOLD}0F` }}>
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
            </Reveal>

            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-white/25">
              <div className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> No spam, ever</div>
              <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Unsubscribe anytime</div>
              <div className="flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" /> Data never sold</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12" style={{ background: NAVY_DEEP }}>
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})` }}>
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

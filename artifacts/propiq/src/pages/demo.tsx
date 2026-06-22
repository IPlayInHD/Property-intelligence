import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import {
  Search, ChevronRight, Star, TrendingUp, Home, MapPin,
  DollarSign, Zap, Droplets, Activity, CheckCircle2, Twitter, ArrowRight,
} from "lucide-react";

// ─── Theme ──────────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const NAVY = "#0A1628";
const NAVY_CARD = "#112240";
const NAVY_DARK = "#0D1B35";
const BORDER = "#1E3A5F";
const TEXT_MUTED = "#8899AA";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Property {
  id: string;
  community: string;
  type: string;
  price: string;
  priceNum: number;
  score: number;
  subScores: { name: string; value: number; description: string; color: string }[];
  metrics: { label: string; value: string }[];
  forecast: { year: string; value: number }[];
  transactions: { date: string; size: string; price: string; ppsf: string }[];
  volume: { month: string; txn: number }[];
  overviewLine: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const PROPERTIES: Property[] = [
  {
    id: "marina",
    community: "Dubai Marina",
    type: "2BR Apartment",
    price: "AED 1,850,000",
    priceNum: 1_850_000,
    score: 78,
    overviewLine: "Listed 8% below DLD average — solid rental income potential",
    subScores: [
      { name: "Price Fairness", value: 78, description: "Listed 8% below DLD avg", color: GOLD },
      { name: "Rental Yield", value: 91, description: "6.4% net yield", color: "#22C55E" },
      { name: "Liquidity", value: 65, description: "Avg 42 days to sell", color: "#60A5FA" },
      { name: "Quality of Life", value: 84, description: "Metro & mall within 800m", color: "#A78BFA" },
    ],
    metrics: [
      { label: "Gross Yield", value: "7.9%" },
      { label: "Net Yield", value: "6.4%" },
      { label: "Service Charge", value: "AED 18,500/yr" },
      { label: "Break-even Rent", value: "AED 9,800/mo" },
    ],
    forecast: [
      { year: "2024", value: 1_850_000 },
      { year: "2025", value: 1_940_000 },
      { year: "2026", value: 2_080_000 },
      { year: "2027", value: 2_210_000 },
      { year: "2028", value: 2_390_000 },
      { year: "2029", value: 2_540_000 },
    ],
    transactions: [
      { date: "15 May 2024", size: "1,145 sqft", price: "AED 1,920,000", ppsf: "AED 1,677" },
      { date: "2 Apr 2024", size: "1,098 sqft", price: "AED 1,780,000", ppsf: "AED 1,621" },
      { date: "18 Mar 2024", size: "1,210 sqft", price: "AED 2,050,000", ppsf: "AED 1,694" },
    ],
    volume: [
      { month: "Jan", txn: 34 },
      { month: "Feb", txn: 41 },
      { month: "Mar", txn: 38 },
      { month: "Apr", txn: 52 },
      { month: "May", txn: 47 },
      { month: "Jun", txn: 61 },
    ],
  },
  {
    id: "downtown",
    community: "Downtown Dubai",
    type: "1BR Apartment",
    price: "AED 2,100,000",
    priceNum: 2_100_000,
    score: 71,
    overviewLine: "Prestige location but priced 5% above DLD avg — watch liquidity",
    subScores: [
      { name: "Price Fairness", value: 62, description: "5% above DLD avg", color: GOLD },
      { name: "Rental Yield", value: 74, description: "5.1% net yield", color: "#22C55E" },
      { name: "Liquidity", value: 58, description: "Avg 67 days to sell", color: "#60A5FA" },
      { name: "Quality of Life", value: 92, description: "Burj Khalifa district", color: "#A78BFA" },
    ],
    metrics: [
      { label: "Gross Yield", value: "6.3%" },
      { label: "Net Yield", value: "5.1%" },
      { label: "Service Charge", value: "AED 24,200/yr" },
      { label: "Break-even Rent", value: "AED 11,500/mo" },
    ],
    forecast: [
      { year: "2024", value: 2_100_000 },
      { year: "2025", value: 2_190_000 },
      { year: "2026", value: 2_310_000 },
      { year: "2027", value: 2_430_000 },
      { year: "2028", value: 2_590_000 },
      { year: "2029", value: 2_720_000 },
    ],
    transactions: [
      { date: "20 May 2024", size: "780 sqft", price: "AED 2,180,000", ppsf: "AED 2,795" },
      { date: "8 Apr 2024", size: "745 sqft", price: "AED 2,040,000", ppsf: "AED 2,738" },
      { date: "22 Mar 2024", size: "810 sqft", price: "AED 2,250,000", ppsf: "AED 2,778" },
    ],
    volume: [
      { month: "Jan", txn: 21 },
      { month: "Feb", txn: 18 },
      { month: "Mar", txn: 27 },
      { month: "Apr", txn: 24 },
      { month: "May", txn: 31 },
      { month: "Jun", txn: 29 },
    ],
  },
  {
    id: "jvc",
    community: "Jumeirah Village Circle",
    type: "Studio",
    price: "AED 550,000",
    priceNum: 550_000,
    score: 85,
    overviewLine: "Undervalued by 12% vs DLD — highest net yield in the demo",
    subScores: [
      { name: "Price Fairness", value: 88, description: "12% below DLD avg", color: GOLD },
      { name: "Rental Yield", value: 96, description: "8.2% net yield", color: "#22C55E" },
      { name: "Liquidity", value: 79, description: "Avg 28 days to sell", color: "#60A5FA" },
      { name: "Quality of Life", value: 71, description: "Community parks & retail", color: "#A78BFA" },
    ],
    metrics: [
      { label: "Gross Yield", value: "9.6%" },
      { label: "Net Yield", value: "8.2%" },
      { label: "Service Charge", value: "AED 6,800/yr" },
      { label: "Break-even Rent", value: "AED 3,800/mo" },
    ],
    forecast: [
      { year: "2024", value: 550_000 },
      { year: "2025", value: 598_000 },
      { year: "2026", value: 651_000 },
      { year: "2027", value: 704_000 },
      { year: "2028", value: 768_000 },
      { year: "2029", value: 830_000 },
    ],
    transactions: [
      { date: "17 May 2024", size: "420 sqft", price: "AED 580,000", ppsf: "AED 1,381" },
      { date: "5 Apr 2024", size: "398 sqft", price: "AED 540,000", ppsf: "AED 1,357" },
      { date: "14 Mar 2024", size: "445 sqft", price: "AED 610,000", ppsf: "AED 1,371" },
    ],
    volume: [
      { month: "Jan", txn: 58 },
      { month: "Feb", txn: 71 },
      { month: "Mar", txn: 65 },
      { month: "Apr", txn: 84 },
      { month: "May", txn: 91 },
      { month: "Jun", txn: 103 },
    ],
  },
];

// ─── Circular Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score, animate }: { score: number; animate: boolean }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animate ? score / 100 : 0) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke={BORDER} strokeWidth={10} />
        <circle
          cx={70}
          cy={70}
          r={r}
          fill="none"
          stroke={GOLD}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: animate ? "stroke-dashoffset 1.2s ease-out" : "none" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span style={{ color: GOLD, fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{score}</span>
        <span style={{ color: TEXT_MUTED, fontSize: 12 }}>/ 100</span>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ScoreBar({ value, color, animate }: { value: number; color: string; animate: boolean }) {
  return (
    <div style={{ background: BORDER, borderRadius: 4, height: 6, width: "100%", overflow: "hidden" }}>
      <div
        style={{
          width: animate ? `${value}%` : "0%",
          background: color,
          height: "100%",
          borderRadius: 4,
          transition: animate ? "width 1s ease-out" : "none",
        }}
      />
    </div>
  );
}

// ─── Step 1: Property Search ──────────────────────────────────────────────────
function StepSearch({ onSelect }: { onSelect: (p: Property) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
    >
      <h2 style={{ color: "#E2E8F0", fontSize: 28, fontWeight: 700, marginBottom: 8, fontFamily: "'DM Serif Display', serif" }}>
        Search any Dubai property
      </h2>
      <p style={{ color: TEXT_MUTED, marginBottom: 28 }}>
        Get institutional-grade analysis in seconds — price fairness, rental yield, 5-year forecast and more.
      </p>

      {/* Fake search bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        background: NAVY_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "12px 18px",
        marginBottom: 32,
        gap: 12,
      }}>
        <Search size={18} color={TEXT_MUTED} />
        <span style={{ color: TEXT_MUTED, fontSize: 15 }}>e.g. Dubai Marina, 2BR apartment</span>
        <span style={{
          marginLeft: "auto",
          background: GOLD,
          color: NAVY,
          borderRadius: 6,
          padding: "4px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "default",
        }}>Search</span>
      </div>

      <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 16 }}>Or choose a pre-loaded property:</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {PROPERTIES.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: NAVY_CARD,
              border: `1.5px solid ${hovered === p.id ? GOLD : BORDER}`,
              borderRadius: 12,
              padding: "20px 22px",
              cursor: "pointer",
              transition: "border-color 0.2s, transform 0.15s",
              transform: hovered === p.id ? "translateY(-2px)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Home size={16} color={GOLD} />
              <span style={{ color: GOLD, fontWeight: 600, fontSize: 14 }}>{p.community}</span>
            </div>
            <p style={{ color: "#C8D6E5", fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{p.type}</p>
            <p style={{ color: "#E2E8F0", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{p.price}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: TEXT_MUTED, fontSize: 12 }}>PropIQ Score</span>
              <span style={{ color: GOLD, fontWeight: 700, fontSize: 14 }}>{p.score}/100</span>
            </div>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <span style={{
                color: hovered === p.id ? NAVY : GOLD,
                background: hovered === p.id ? GOLD : "transparent",
                border: `1px solid ${GOLD}`,
                borderRadius: 6,
                padding: "5px 14px",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s",
              }}>
                Select →
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Step 2: Analysis Dashboard ───────────────────────────────────────────────
function StepAnalysis({ property, onContinue }: { property: Property; onContinue: () => void }) {
  const [loading, setLoading] = useState(true);
  const [scoreAnimate, setScoreAnimate] = useState(false);

  useEffect(() => {
    setLoading(true);
    setScoreAnimate(false);
    const t1 = setTimeout(() => setLoading(false), 1500);
    const t2 = setTimeout(() => setScoreAnimate(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [property.id]);

  const formatVal = (v: number) =>
    v >= 1_000_000 ? `AED ${(v / 1_000_000).toFixed(2)}M` : `AED ${(v / 1_000).toFixed(0)}K`;

  return (
    <motion.div
      key={`step2-${property.id}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 28,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MapPin size={14} color={TEXT_MUTED} />
            <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{property.community} · {property.type}</span>
          </div>
          <span style={{ color: GOLD, fontSize: 30, fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>
            {property.price}
          </span>
        </div>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${GOLD}`, borderTopColor: "transparent" }}
              />
              <span style={{ color: TEXT_MUTED, fontSize: 14 }}>Running analysis…</span>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <CheckCircle2 size={18} color="#22C55E" />
              <span style={{ color: "#22C55E", fontSize: 14, fontWeight: 500 }}>Analysis complete</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 24 }}
            className="demo-grid"
          >
            {/* ── Left column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Score ring */}
              <div style={{
                background: NAVY_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}>
                <span style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>PropIQ Score</span>
                <ScoreRing score={property.score} animate={scoreAnimate} />
                <p style={{ color: TEXT_MUTED, fontSize: 13, textAlign: "center", marginTop: 4 }}>{property.overviewLine}</p>
              </div>

              {/* Sub-scores */}
              <div style={{
                background: NAVY_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                {property.subScores.map((s) => (
                  <div key={s.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#C8D6E5", fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                      <span style={{ color: s.color, fontSize: 13, fontWeight: 700 }}>{s.value}</span>
                    </div>
                    <ScoreBar value={s.value} color={s.color} animate={scoreAnimate} />
                    <p style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 4 }}>{s.description}</p>
                  </div>
                ))}
              </div>

              {/* Key metrics */}
              <div style={{
                background: NAVY_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "20px",
              }}>
                <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Key Metrics</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {property.metrics.map((m) => (
                    <div key={m.label} style={{
                      background: NAVY_DARK,
                      borderRadius: 8,
                      padding: "12px",
                      border: `1px solid ${BORDER}`,
                    }}>
                      <p style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>{m.label}</p>
                      <p style={{ color: GOLD, fontSize: 15, fontWeight: 700 }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* 5-Year Forecast */}
              <div style={{
                background: NAVY_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <TrendingUp size={15} color={GOLD} />
                  <span style={{ color: "#C8D6E5", fontSize: 14, fontWeight: 600 }}>5-Year Price Forecast</span>
                  <span style={{ marginLeft: "auto", color: "#22C55E", fontSize: 12, fontWeight: 600 }}>
                    +{Math.round((property.forecast[5].value / property.forecast[0].value - 1) * 100)}% projected
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={property.forecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="year" tick={{ fill: TEXT_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => formatVal(v)} tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip
                      contentStyle={{ background: NAVY_DARK, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                      labelStyle={{ color: TEXT_MUTED }}
                      itemStyle={{ color: GOLD }}
                      formatter={(v: number) => [formatVal(v), "Est. Value"]}
                    />
                    <Area type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2} fill="url(#goldGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* DLD Transaction Comparables */}
              <div style={{
                background: NAVY_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Activity size={15} color={GOLD} />
                  <span style={{ color: "#C8D6E5", fontSize: 14, fontWeight: 600 }}>DLD Transaction Comparables</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Date", "Size", "Price", "Price/sqft"].map((h) => (
                        <th key={h} style={{ color: TEXT_MUTED, fontWeight: 500, textAlign: "left", paddingBottom: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {property.transactions.map((t, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td style={{ color: TEXT_MUTED, padding: "8px 0", fontSize: 12 }}>{t.date}</td>
                        <td style={{ color: "#C8D6E5", padding: "8px 0" }}>{t.size}</td>
                        <td style={{ color: "#E2E8F0", fontWeight: 600, padding: "8px 0" }}>{t.price}</td>
                        <td style={{ color: GOLD, padding: "8px 0" }}>{t.ppsf}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Monthly Volume */}
              <div style={{
                background: NAVY_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Droplets size={15} color={GOLD} />
                  <span style={{ color: "#C8D6E5", fontSize: 14, fontWeight: 600 }}>Monthly Transaction Volume</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={property.volume} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: TEXT_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: NAVY_DARK, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                      labelStyle={{ color: TEXT_MUTED }}
                      itemStyle={{ color: GOLD }}
                      formatter={(v: number) => [v, "Transactions"]}
                    />
                    <Bar dataKey="txn" radius={[4, 4, 0, 0]}>
                      {property.volume.map((_, idx) => (
                        <Cell key={idx} fill={idx === property.volume.length - 1 ? GOLD : "#1E3A5F"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue prompt */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            padding: "18px 24px",
            background: NAVY_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
          }}
        >
          <p style={{ color: TEXT_MUTED, fontSize: 15 }}>
            <span style={{ color: "#E2E8F0", fontWeight: 600 }}>What do you think so far?</span>
            {" "}Help us build the right product by sharing your feedback.
          </p>
          <button
            onClick={onContinue}
            style={{
              background: GOLD,
              color: NAVY,
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            Continue to Feedback <ChevronRight size={16} />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Step 3: Feedback Survey ──────────────────────────────────────────────────
function StepFeedback({ property, onSubmit }: { property: Property; onSubmit: () => void }) {
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feature, setFeature] = useState("");
  const [challenge, setChallenge] = useState("");
  const [wouldPay, setWouldPay] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const features = ["Price Fairness", "Rental Yield", "Forecasting", "Liquidity Score", "Quality of Life"];
  const payOptions = ["Yes, definitely", "Maybe, depends on price", "Not right now"];
  const roles = ["Property Investor", "Real Estate Agent", "Expat", "Developer", "Just browsing"];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/demo-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyViewed: property.community,
          starRating: stars || null,
          mostValuableFeature: feature || null,
          biggestChallenge: challenge || null,
          wouldPay: wouldPay || null,
          role: role || null,
        }),
      });
    } catch {
      // silent — don't block user on API error
    }
    onSubmit();
  };

  const PillButton = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        background: selected ? GOLD : "transparent",
        color: selected ? NAVY : TEXT_MUTED,
        border: `1.5px solid ${selected ? GOLD : BORDER}`,
        borderRadius: 20,
        padding: "8px 18px",
        fontSize: 13,
        fontWeight: selected ? 700 : 400,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
    >
      <h2 style={{ color: "#E2E8F0", fontSize: 28, fontWeight: 700, marginBottom: 6, fontFamily: "'DM Serif Display', serif" }}>
        Help us build PropIQ for you
      </h2>
      <p style={{ color: TEXT_MUTED, marginBottom: 36 }}>
        This takes 2 minutes and directly shapes what we build next.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Q1: Star rating */}
        <div>
          <p style={{ color: "#C8D6E5", fontWeight: 600, marginBottom: 14 }}>
            1. How useful was this analysis for your property research?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={32}
                fill={(hoveredStar || stars) >= n ? GOLD : "none"}
                stroke={(hoveredStar || stars) >= n ? GOLD : BORDER}
                style={{ cursor: "pointer", transition: "all 0.1s" }}
                onMouseEnter={() => setHoveredStar(n)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setStars(n)}
              />
            ))}
          </div>
        </div>

        {/* Q2: Most valuable feature */}
        <div>
          <p style={{ color: "#C8D6E5", fontWeight: 600, marginBottom: 14 }}>
            2. Which feature was most valuable to you?
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {features.map((f) => (
              <PillButton key={f} label={f} selected={feature === f} onClick={() => setFeature(f === feature ? "" : f)} />
            ))}
          </div>
        </div>

        {/* Q3: Biggest challenge */}
        <div>
          <p style={{ color: "#C8D6E5", fontWeight: 600, marginBottom: 14 }}>
            3. What's your biggest challenge when researching UAE properties today?
          </p>
          <textarea
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            placeholder="e.g. I can't find reliable rental yield data, or I don't know if a price is fair..."
            rows={4}
            style={{
              width: "100%",
              background: NAVY_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "14px 16px",
              color: "#E2E8F0",
              fontSize: 14,
              resize: "vertical",
              outline: "none",
              fontFamily: "DM Sans, sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Q4: Would pay */}
        <div>
          <p style={{ color: "#C8D6E5", fontWeight: 600, marginBottom: 14 }}>
            4. Would you pay for a tool like this?
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {payOptions.map((o) => (
              <PillButton key={o} label={o} selected={wouldPay === o} onClick={() => setWouldPay(o === wouldPay ? "" : o)} />
            ))}
          </div>
        </div>

        {/* Q5: Role */}
        <div>
          <p style={{ color: "#C8D6E5", fontWeight: 600, marginBottom: 14 }}>
            5. What's your role?
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {roles.map((r) => (
              <PillButton key={r} label={r} selected={role === r} onClick={() => setRole(r === role ? "" : r)} />
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: GOLD,
            color: NAVY,
            border: "none",
            borderRadius: 10,
            padding: "16px 32px",
            fontWeight: 700,
            fontSize: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            alignSelf: "flex-start",
            transition: "opacity 0.2s",
          }}
        >
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Thank You Screen ─────────────────────────────────────────────────────────
function ThankYou() {
  const shareText = "Just tried PropIQ — it gives institutional-grade UAE property analysis (yield, DLD comps, 5-year forecast). Worth checking out 🏙️";
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent("https://propiq.ae")}`;

  return (
    <motion.div
      key="thankyou"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ textAlign: "center", padding: "48px 24px" }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: `${GOLD}22`, border: `2px solid ${GOLD}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 24px",
      }}>
        <CheckCircle2 size={32} color={GOLD} />
      </div>
      <h2 style={{
        color: "#E2E8F0", fontSize: 32, fontWeight: 700,
        fontFamily: "'DM Serif Display', serif", marginBottom: 14,
      }}>
        Thank you for your feedback!
      </h2>
      <p style={{ color: TEXT_MUTED, fontSize: 16, maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.7 }}>
        You're helping shape PropIQ. We'll reach out when early access opens.
      </p>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Link href="/#waitlist">
          <button style={{
            background: GOLD,
            color: NAVY,
            border: "none",
            borderRadius: 10,
            padding: "14px 32px",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            Join the Waitlist <ArrowRight size={16} />
          </button>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: TEXT_MUTED, fontSize: 14 }}>
          <span>Share PropIQ with someone who invests in UAE property:</span>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#E2E8F0",
              background: "#1A2E4A",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "6px 14px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Twitter size={14} /> Share on X
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const steps = ["Search", "Analysis", "Feedback"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 44 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const isActive = step === idx;
        const isDone = step > idx;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: isDone ? GOLD : isActive ? GOLD : "transparent",
                border: `2px solid ${isDone || isActive ? GOLD : BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
              }}>
                {isDone
                  ? <CheckCircle2 size={16} color={NAVY} />
                  : <span style={{ color: isActive ? NAVY : TEXT_MUTED, fontSize: 13, fontWeight: 700 }}>{idx}</span>
                }
              </div>
              <span style={{ color: isActive ? GOLD : isDone ? GOLD : TEXT_MUTED, fontSize: 12, fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 80, height: 2,
                background: isDone ? GOLD : BORDER,
                margin: "0 4px",
                marginBottom: 22,
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Demo Page ───────────────────────────────────────────────────────────
export default function Demo() {
  const [step, setStep] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelectProperty = (p: Property) => {
    setSelectedProperty(p);
    setStep(2);
  };

  const handleContinue = () => setStep(3);
  const handleSubmit = () => setSubmitted(true);

  return (
    <div style={{ minHeight: "100vh", background: NAVY, fontFamily: "DM Sans, sans-serif" }}>
      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: `${NAVY}CC`,
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 24px", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: GOLD, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: NAVY, fontWeight: 700, fontSize: 18, fontFamily: "'DM Serif Display', serif" }}>P</span>
            </div>
            <span style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 18, fontFamily: "'DM Serif Display', serif" }}>PropIQ</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={14} color={GOLD} />
            <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Interactive Demo — no login required</span>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, #0D1B35 0%, ${NAVY} 100%)`,
        borderBottom: `1px solid ${BORDER}`,
        padding: "40px 24px 36px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: `${GOLD}18`, border: `1px solid ${GOLD}44`,
          borderRadius: 20, padding: "5px 14px", marginBottom: 16,
        }}>
          <Zap size={13} color={GOLD} />
          <span style={{ color: GOLD, fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>DEMO — ALL DATA IS ILLUSTRATIVE</span>
        </div>
        <h1 style={{
          color: "#E2E8F0", fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 700,
          fontFamily: "'DM Serif Display', serif", marginBottom: 10,
        }}>
          The Bloomberg Terminal for UAE Property Investors
        </h1>
        <p style={{ color: TEXT_MUTED, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
          Institutional-grade analysis — price fairness, true net yield, 5-year forecasting, liquidity and quality of life scores.
        </p>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 80px" }}>
        {submitted ? (
          <ThankYou />
        ) : (
          <>
            <ProgressBar step={step} />
            <AnimatePresence mode="wait">
              {step === 1 && <StepSearch key="s1" onSelect={handleSelectProperty} />}
              {step === 2 && selectedProperty && (
                <StepAnalysis key={`s2-${selectedProperty.id}`} property={selectedProperty} onContinue={handleContinue} />
              )}
              {step === 3 && selectedProperty && (
                <StepFeedback key="s3" property={selectedProperty} onSubmit={handleSubmit} />
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Responsive grid fix */}
      <style>{`
        @media (max-width: 768px) {
          .demo-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

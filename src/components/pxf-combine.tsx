import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Zap, Dumbbell, Target, Repeat, Activity, Snowflake, Lock, Globe2, MapPin, ChevronRight } from "lucide-react";

type StatKey = "speed" | "power" | "shot" | "agility" | "explosiveness" | "skating";

type StatDef = {
  key: StatKey;
  label: string;
  emoji: string;
  icon: typeof Zap;
  source: string;
  subs: string[];
};

const STATS: StatDef[] = [
  { key: "speed", label: "Speed", emoji: "⚡", icon: Zap, source: "PXF Resistance Trainer", subs: ["First-Step", "Top Speed", "Backward Speed"] },
  { key: "power", label: "Power", emoji: "💪", icon: Dumbbell, source: "PXF Resistance Trainer", subs: ["Max Force", "Peak Watts", "Strength Index"] },
  { key: "shot", label: "Shot", emoji: "🏒", icon: Target, source: "PXF Shot Plate + Radar", subs: ["Slap Shot", "Wrist Shot", "Release Time"] },
  { key: "agility", label: "Agility", emoji: "🔄", icon: Repeat, source: "Speed Gates", subs: ["Lateral", "Change of Direction", "Reaction"] },
  { key: "explosiveness", label: "Explosiveness", emoji: "🦵", icon: Activity, source: "PXF Force Plate", subs: ["Vertical Jump", "Broad Jump", "RSI"] },
  { key: "skating", label: "Skating", emoji: "⛸", icon: Snowflake, source: "PXF Resistance Trainer", subs: ["Stride Power", "Edge Work", "Endurance"] },
];

// No data yet — all locked. Wire to real percentile data later.
type Scores = Partial<Record<StatKey, number>>;
const SCORES: Scores = {};
const OVERALL: number | null = null;

export function PxfCombine() {
  return (
    <section className="mt-7">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold tracking-[0.25em] text-foreground/90">PXF COMBINE</h2>
        <span className="text-[10px] font-semibold tracking-widest text-volt">PLAYER CARD</span>
      </div>

      <OverallCard rating={OVERALL} />
      <HexRadar scores={SCORES} />

      <div className="mt-4 space-y-3">
        {STATS.map((s) => (
          <StatCard key={s.key} stat={s} value={SCORES[s.key] ?? null} />
        ))}
      </div>
    </section>
  );
}

/* ------------------- Overall rating ring ------------------- */

function OverallCard({ rating }: { rating: number | null }) {
  const pct = rating ? Math.min(99, rating) / 99 : 0;
  const animated = useAnimatedNumber(pct);
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="mt-3 rounded-3xl border border-border/60 bg-gradient-to-b from-surface to-surface-2 p-5">
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--teal, 174 72% 56%))" />
                <stop offset="100%" stopColor="#84cc16" />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={rating ? "url(#ringGrad)" : "hsl(var(--border))"}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - animated)}
              style={{ transition: "stroke-dashoffset 900ms ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">PXF RATING</p>
            <p className={"font-display text-6xl font-black leading-none " + (rating ? "text-foreground" : "text-muted-foreground/50")}>
              {rating ?? "—"}
            </p>
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">/ 99</p>
          </div>
        </div>

        <LeaderboardTrigger>
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-surface px-3 py-1.5">
              <Globe2 size={12} className="text-teal" />
              <span className="text-[11px] font-semibold text-foreground">#— in the World</span>
              <ChevronRight size={12} className="text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-surface px-3 py-1.5">
              <MapPin size={12} className="text-volt" />
              <span className="text-[11px] font-semibold text-foreground">#— in Province</span>
            </div>
          </div>
        </LeaderboardTrigger>
      </div>
    </div>
  );
}

/* ------------------- Hex radar ------------------- */

function HexRadar({ scores }: { scores: Scores }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 92;
  const labels = STATS.map((s) => s.label);
  const values = STATS.map((s) => (scores[s.key] ?? 0) / 100);
  const anim = useAnimatedNumber(1);

  const point = (i: number, t: number) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * t, cy + Math.sin(angle) * radius * t] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1].map((t) => {
    const pts = Array.from({ length: 6 }, (_, i) => point(i, t).join(",")).join(" ");
    return <polygon key={t} points={pts} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />;
  });

  const axes = Array.from({ length: 6 }, (_, i) => {
    const [x, y] = point(i, 1);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth={1} />;
  });

  const dataPts = values.map((v, i) => point(i, Math.max(v, 0.02) * anim).join(",")).join(" ");
  const hasData = values.some((v) => v > 0);

  return (
    <div className="mt-3 rounded-3xl border border-border/60 bg-surface p-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">ATTRIBUTE PROFILE</p>
        {!hasData && <span className="text-[10px] font-semibold text-muted-foreground/70">No data yet</span>}
      </div>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--teal, 174 72% 56%))" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#84cc16" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {rings}
          {axes}
          <polygon
            points={dataPts}
            fill={hasData ? "url(#radarFill)" : "hsl(var(--muted-foreground) / 0.08)"}
            stroke={hasData ? "#5eead4" : "hsl(var(--border))"}
            strokeWidth={1.5}
            style={{ transition: "all 900ms ease-out" }}
          />
          {labels.map((l, i) => {
            const [x, y] = point(i, 1.22);
            return (
              <text
                key={l}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}
              >
                {l.toUpperCase()}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ------------------- Stat cards ------------------- */

function StatCard({ stat, value }: { stat: StatDef; value: number | null }) {
  const locked = value == null;
  const pct = value ?? 0;
  const anim = useAnimatedNumber(pct / 100);

  // Speedometer arc
  const w = 220;
  const h = 92;
  const cx = w / 2;
  const cy = h - 6;
  const r = 78;
  const arc = (t: number) => {
    const start = Math.PI;
    const end = start + Math.PI * t;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = t > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className={"rounded-3xl border p-4 " + (locked ? "border-border/40 bg-surface/60" : "border-border/60 bg-surface")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={"grid h-9 w-9 place-items-center rounded-xl " + (locked ? "bg-surface-2 text-muted-foreground" : "bg-teal/15 text-teal")}>
            <stat.icon size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{stat.emoji} {stat.label}</p>
            <p className="text-[10px] tracking-wider text-muted-foreground">{stat.source}</p>
          </div>
        </div>
        {locked && <Lock size={14} className="text-muted-foreground" />}
      </div>

      <div className="relative mx-auto mt-2" style={{ width: w, height: h }}>
        <svg width={w} height={h}>
          <defs>
            <linearGradient id={`arc-${stat.key}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--teal, 174 72% 56%))" />
              <stop offset="100%" stopColor="#84cc16" />
            </linearGradient>
          </defs>
          <path d={arc(1)} stroke="hsl(var(--border))" strokeWidth={10} fill="none" strokeLinecap="round" />
          {!locked && (
            <path
              d={arc(Math.max(anim, 0.01))}
              stroke={`url(#arc-${stat.key})`}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              style={{ transition: "d 900ms ease-out" }}
            />
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <p className={"font-display text-3xl font-black leading-none " + (locked ? "text-muted-foreground/40" : "text-foreground")}>
            {locked ? "—" : pct}
          </p>
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">
            {locked ? "PERCENTILE" : `TOP ${Math.max(1, 100 - pct)}%`}
          </p>
        </div>
      </div>

      {!locked ? (
        <LeaderboardTrigger>
          <div className="mt-1 flex items-center justify-center gap-2 rounded-full border border-border/60 bg-surface-2 px-3 py-1.5">
            <Globe2 size={11} className="text-teal" />
            <span className="text-[10px] font-semibold text-foreground">#— worldwide · #— in Ontario</span>
            <ChevronRight size={11} className="text-muted-foreground" />
          </div>
        </LeaderboardTrigger>
      ) : (
        <div className="mt-1 flex items-center justify-center gap-2 rounded-full border border-dashed border-border/60 bg-surface-2 px-3 py-1.5">
          <Lock size={11} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Connect device to unlock</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {stat.subs.map((s) => (
          <span key={s} className={"rounded-full px-2 py-0.5 text-[10px] font-medium " + (locked ? "bg-surface-2 text-muted-foreground/60" : "bg-teal/10 text-teal")}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------- Leaderboard drawer ------------------- */

function LeaderboardTrigger({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="block w-full text-left">{children}</button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-border/60 bg-surface p-0">
        <LeaderboardPanel />
      </SheetContent>
    </Sheet>
  );
}

const AGES = ["U10", "U12", "U14", "U16", "U18", "Senior"] as const;
const REGIONS = ["Worldwide", "Country", "Province", "City"] as const;
const POSITIONS = ["All", "Forward", "Defence", "Goalie"] as const;
const LB_STATS = ["Overall", ...STATS.map((s) => s.label)] as const;

function LeaderboardPanel() {
  const [age, setAge] = useState<(typeof AGES)[number]>("U14");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("Worldwide");
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("All");
  const [statSel, setStatSel] = useState<(typeof LB_STATS)[number]>("Overall");

  const rows = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        rank: i + 1,
        name: ["A. Bedard", "M. Celebrini", "C. Lindstrom", "L. Misa", "J. Reichel", "T. Stutzle", "K. Geekie", "S. Reinhart", "D. Doan", "N. Hischier", "B. Tkachuk", "Q. Hughes"][i] ?? "Athlete",
        location: ["Regina, SK", "North Vancouver, BC", "Mora, SWE", "Mississauga, ON", "Berlin, GER", "Cologne, GER", "Strathmore, AB", "West Vancouver, BC", "Halifax, NS", "Bern, SUI", "Calgary, AB", "Burnaby, BC"][i] ?? "—",
        age: 14 + (i % 4),
        rating: 99 - i * 2,
        you: i === 7,
      })),
    []
  );

  return (
    <div className="p-5">
      <SheetHeader>
        <SheetTitle className="text-left font-display text-lg font-bold">Leaderboard</SheetTitle>
      </SheetHeader>

      <div className="mt-4 space-y-3">
        <FilterRow label="Age" options={AGES as unknown as string[]} value={age} onChange={(v) => setAge(v as (typeof AGES)[number])} />
        <FilterRow label="Region" options={REGIONS as unknown as string[]} value={region} onChange={(v) => setRegion(v as (typeof REGIONS)[number])} />
        <FilterRow label="Position" options={POSITIONS as unknown as string[]} value={position} onChange={(v) => setPosition(v as (typeof POSITIONS)[number])} />
        <FilterRow label="Stat" options={LB_STATS as unknown as string[]} value={statSel} onChange={(v) => setStatSel(v as (typeof LB_STATS)[number])} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-surface-2">
        {rows.map((r) => (
          <div
            key={r.rank}
            className={
              "flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 " +
              (r.you ? "bg-teal/15" : "")
            }
          >
            <span className={"w-6 text-center font-display text-sm font-black " + (r.you ? "text-teal" : "text-foreground")}>{r.rank}</span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-[11px] font-bold text-primary-foreground">
              {r.name.split(" ").map((p) => p[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{r.name} {r.you && <span className="text-[10px] font-bold tracking-widest text-teal">· YOU</span>}</p>
              <p className="truncate text-[11px] text-muted-foreground">{r.location} · U{r.age}</p>
            </div>
            <span className="font-display text-base font-black text-foreground">{r.rating}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Showing top {rows.length} · {statSel} · {age} · {region}{position !== "All" ? ` · ${position}` : ""}
      </p>
    </div>
  );
}

function FilterRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold tracking-[0.25em] text-muted-foreground">{label.toUpperCase()}</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {options.map((o) => {
          const active = o === value;
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold " +
                (active ? "bg-gradient-brand text-primary-foreground" : "border border-border/60 bg-surface text-foreground")
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------- helpers ------------------- */

function useAnimatedNumber(target: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return v;
}
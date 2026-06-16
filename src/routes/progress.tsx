import { createFileRoute } from "@tanstack/react-router";
import { Flame, Trophy, TrendingUp, Activity } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — PXF Hockey" },
      { name: "description", content: "Track your development across skating, puck control, shooting and game IQ." },
      { property: "og:title", content: "Progress — PXF Hockey" },
      { property: "og:description", content: "Track your hockey development metrics over time." },
    ],
  }),
  component: Progress,
});

const skills = [
  { name: "Skating", value: 78 },
  { name: "Edges", value: 72 },
  { name: "Puck", value: 65 },
  { name: "Shooting", value: 54 },
  { name: "Game IQ", value: 60 },
  { name: "Reaction", value: 70 },
];

function Progress() {
  return (
    <div className="px-5 pt-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PERFORMANCE</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Progress</h1>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCard icon={Flame} label="Day Streak" value="12" tint="volt" />
        <StatCard icon={Activity} label="Sessions" value="46" tint="teal" />
        <StatCard icon={Trophy} label="Drills Done" value="312" tint="teal" />
        <StatCard icon={TrendingUp} label="PXF Score" value="784" tint="volt" />
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">SKILL MAP</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Development Index</h2>
          </div>
          <span className="rounded-full bg-teal/15 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal">
            +12% MO
          </span>
        </div>
        <div className="mt-4 grid place-items-center">
          <RadarChart skills={skills} />
        </div>
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">SKILL BREAKDOWN</h2>
      <div className="mt-3 space-y-3">
        {skills.map((s) => (
          <div key={s.name} className="rounded-2xl border border-border/60 bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{s.name}</span>
              <span className="text-xs font-bold text-teal">{s.value}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Flame; label: string; value: string; tint: "teal" | "volt" }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-4">
      <Icon size={18} className={tint === "teal" ? "text-teal" : "text-volt"} />
      <p className="mt-3 font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
    </div>
  );
}

function RadarChart({ skills }: { skills: { name: string; value: number }[] }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 88;
  const n = skills.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, v: number) => {
    const r = (radius * v) / 100;
    return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  };
  const path =
    skills
      .map((s, i) => {
        const [x, y] = point(i, s.value);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px]">
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E5D6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#39FF14" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={skills.map((_, i) => point(i, f * 100).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
        />
      ))}
      {skills.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" />;
      })}
      <path d={path} fill="url(#radarFill)" stroke="#00E5D6" strokeWidth="1.5" />
      {skills.map((s, i) => {
        const [lx, ly] = point(i, 118);
        return (
          <text
            key={s.name}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.6)"
            style={{ letterSpacing: "0.12em" }}
          >
            {s.name.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Trophy, Layers, Clock, Activity, Award } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — PXF Hockey" },
      { name: "description", content: "Track sessions, hours, streaks, skill ratings, and badges." },
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
  { name: "Passing", value: 60 },
  { name: "Shooting", value: 54 },
  { name: "Reaction", value: 70 },
];

const weekly = [3, 5, 2, 6, 4, 7, 3];

const badges = [
  { name: "10 Day Streak", tint: "volt" as const },
  { name: "Edge Master", tint: "teal" as const },
  { name: "First Pathway", tint: "teal" as const },
  { name: "Cue Hunter", tint: "volt" as const },
  { name: "Snap Sniper", tint: "teal" as const },
  { name: "Squad Builder", tint: "volt" as const },
];

function Progress() {
  return (
    <div className="px-5 pt-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PERFORMANCE</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Progress</h1>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCard icon={Activity} label="Sessions" value="46" tint="teal" />
        <StatCard icon={Clock} label="Training Hrs" value="38" tint="volt" />
        <StatCard icon={Layers} label="Pathways" value="2" tint="teal" />
        <StatCard icon={Flame} label="Day Streak" value="12" tint="volt" />
      </div>

      <div className="mt-6 rounded-3xl border border-border/60 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">THIS WEEK</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Training Load</h2>
          </div>
          <span className="rounded-full bg-teal/15 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal">+12% MO</span>
        </div>
        <div className="mt-4 flex h-32 items-end justify-between gap-2">
          {weekly.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end">
                <div className="w-full rounded-md bg-gradient-brand" style={{ height: `${(v / 8) * 100}%` }} />
              </div>
              <span className="text-[9px] tracking-widest text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">SKILL RATINGS</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {skills.map((s) => (
          <div key={s.name} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3">
            <Ring value={s.value} />
            <div>
              <p className="text-[10px] tracking-wider text-muted-foreground">{s.name.toUpperCase()}</p>
              <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">BADGES EARNED</h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {badges.map((b) => (
          <div key={b.name} className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-surface p-3 text-center">
            <div className={"grid h-12 w-12 place-items-center rounded-full " + (b.tint === "teal" ? "bg-teal/15 text-teal" : "bg-volt/15 text-volt")}>
              <Award size={20} />
            </div>
            <span className="text-[10px] font-semibold leading-tight text-foreground">{b.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 mb-6 flex items-center justify-between rounded-2xl border border-border/60 bg-surface px-4 py-4">
        <div className="flex items-center gap-3">
          <Trophy size={22} className="text-volt" />
          <div>
            <p className="text-sm font-bold text-foreground">PXF Score</p>
            <p className="text-[11px] text-muted-foreground">Combined index across all skills.</p>
          </div>
        </div>
        <span className="font-display text-3xl font-bold text-gradient-brand">784</span>
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

function Ring({ value }: { value: number }) {
  const size = 52;
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E5D6" />
          <stop offset="1" stopColor="#39FF14" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringG)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}
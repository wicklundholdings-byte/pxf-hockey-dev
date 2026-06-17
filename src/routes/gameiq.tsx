import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Eye, Zap, Activity, Crosshair, ChevronRight, Cpu, Play } from "lucide-react";

export const Route = createFileRoute("/gameiq")({
  head: () => ({
    meta: [
      { title: "GameIQ — PXF Hockey" },
      { name: "description", content: "Decision making, reaction speed, scanning and visual cue training." },
      { property: "og:title", content: "GameIQ — PXF Hockey" },
      { property: "og:description", content: "Train decision speed, scanning, and visual cue response." },
    ],
  }),
  component: GameIQ,
});

const pillars = [
  { name: "Decision Making", icon: Brain, tint: "teal" as const },
  { name: "Reaction Speed", icon: Zap, tint: "volt" as const },
  { name: "Scanning", icon: Eye, tint: "teal" as const },
  { name: "Awareness", icon: Activity, tint: "volt" as const },
  { name: "Visual Cue", icon: Crosshair, tint: "teal" as const },
];

const podDrills = [
  { id: "reaction-cue-shoot", name: "Cue Release Reps", level: "L2", desc: "Light cue → release inside 0.6s." },
  { id: "scan-support", name: "Scan & Support 1v1", level: "L3", desc: "Pre-scan + show passing lane." },
  { id: "figure-8-puck", name: "Eyes-Up Figure 8", level: "L3", desc: "Hands on autopilot, eyes free." },
];

const metrics = [
  { label: "Decision Speed", value: "0.62s", delta: "-0.08", tint: "teal" as const },
  { label: "Scan Rate", value: "3.2/s", delta: "+0.4", tint: "volt" as const },
  { label: "Cue Accuracy", value: "84%", delta: "+6%", tint: "teal" as const },
];

function GameIQ() {
  return (
    <div className="px-5 pt-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PXF · INTELLIGENCE LAYER</p>
        <h1 className="mt-1 text-3xl font-bold text-gradient-brand">GameIQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Train how you see, decide and react before the puck arrives.</p>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-3xl border border-teal/30 bg-surface p-5 shadow-glow-teal">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 25% 30%, #00E5D6 0, transparent 55%), radial-gradient(circle at 80% 70%, #39FF14 0, transparent 55%)" }} />
        <div className="relative">
          <Cpu size={26} className="text-teal" />
          <h2 className="mt-3 font-display text-2xl font-bold text-foreground">PODS · The Reaction System</h2>
          <p className="mt-1 text-sm text-muted-foreground">Visual cues, decision pressure, measurable response data. Built for ice + dryland.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-border/60 bg-background/50 p-2.5 backdrop-blur">
                <p className="text-[9px] tracking-wider text-muted-foreground">{m.label.toUpperCase()}</p>
                <p className="mt-1 font-display text-base font-bold text-foreground">{m.value}</p>
                <p className={"text-[10px] font-semibold " + (m.tint === "teal" ? "text-teal" : "text-volt")}>{m.delta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">FOCUS PILLARS</h2>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {pillars.map(({ name, icon: Icon, tint }) => (
          <div key={name} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-surface p-2 text-center">
            <Icon size={18} className={tint === "teal" ? "text-teal" : "text-volt"} />
            <span className="text-[9px] font-semibold leading-tight text-foreground">{name}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">POD-BASED DRILLS</h2>
      <div className="mt-3 space-y-2">
        {podDrills.map((d) => (
          <Link key={d.id} to="/drill-detail/$drillId" params={{ drillId: d.id }} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow-teal">
              <Play size={16} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wider text-volt">{d.level}</p>
              <p className="truncate text-sm font-bold text-foreground">{d.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{d.desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        ))}
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">REACTION PATHWAY</h2>
      <div className="mt-3 rounded-3xl border border-border/60 bg-surface p-4">
        {["Cue Base", "Cue Release", "Cue Decisions", "Game Transfer"].map((f, i, arr) => (
          <div key={f} className="relative pl-10">
            {i < arr.length - 1 && <span className="absolute left-4 top-8 h-full w-px bg-border" />}
            <div className="flex items-center gap-3 py-2.5">
              <span className={"absolute left-0 grid h-8 w-8 place-items-center rounded-full text-xs font-bold " + (i === 0 ? "bg-gradient-brand text-primary-foreground shadow-glow-teal" : "border border-border bg-surface-2 text-muted-foreground")}>
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-foreground">Flow {i + 1} — {f}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 mb-6 overflow-hidden rounded-3xl border border-volt/30 bg-surface p-5 shadow-glow-volt">
        <p className="text-[10px] font-bold tracking-[0.3em] text-volt">COMING SOON</p>
        <h2 className="mt-2 font-display text-xl font-bold text-foreground">GameIQ Hardware</h2>
        <p className="mt-1 text-sm text-muted-foreground">Wireless PODs sync with the app — measured reaction, scan rate and decision data, on-ice and off.</p>
        <button className="mt-4 flex w-full items-center justify-center rounded-xl border border-volt/50 bg-volt/10 py-2.5 text-xs font-bold tracking-wider text-volt">
          JOIN THE WAITLIST
        </button>
      </div>
    </div>
  );
}
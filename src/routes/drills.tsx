import { createFileRoute } from "@tanstack/react-router";
import { Search, Play, Clock, BarChart3, Filter } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/drills")({
  head: () => ({
    meta: [
      { title: "Drill Library — PXF Hockey" },
      { name: "description", content: "Hundreds of drills organized by skill and purpose, with video demonstrations and coaching notes." },
      { property: "og:title", content: "Drill Library — PXF Hockey" },
      { property: "og:description", content: "Hundreds of drills organized by skill and purpose." },
    ],
  }),
  component: Drills,
});

const filters = ["All", "Skating", "Edges", "Puck", "Shooting", "Game IQ"];

const drills = [
  { title: "Tight Turn Stops & Starts", cat: "Skating", level: "Beginner", time: 8 },
  { title: "Figure 8 Puck Control", cat: "Puck", level: "Advanced", time: 12 },
  { title: "Inside Edge Crossovers", cat: "Edges", level: "Intermediate", time: 10 },
  { title: "Quick Release Snap Shot", cat: "Shooting", level: "Intermediate", time: 15 },
  { title: "Scan & Support Decisions", cat: "Game IQ", level: "Advanced", time: 20 },
  { title: "Mohawk Transitions", cat: "Edges", level: "Advanced", time: 12 },
];

function Drills() {
  const [active, setActive] = useState("All");
  const visible = active === "All" ? drills : drills.filter((d) => d.cat === active);

  return (
    <div className="px-5 pt-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DRILL LIBRARY</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Drills</h1>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            placeholder="Search drills, skills, tags…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button aria-label="Filters" className="grid h-11 w-11 place-items-center rounded-xl border border-border/60 bg-surface text-foreground/80">
          <Filter size={16} />
        </button>
      </div>

      <div className="mt-4 -mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors " +
                (active === f
                  ? "border-teal bg-teal/15 text-teal"
                  : "border-border/60 bg-surface text-muted-foreground hover:text-foreground")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {visible.map((d) => (
          <DrillRow key={d.title} {...d} />
        ))}
      </div>
    </div>
  );
}

function DrillRow({ title, cat, level, time }: { title: string; cat: string; level: string; time: number }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 text-left transition-colors hover:border-teal/40">
      <div className="relative grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-2 to-background">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, #00E5D6 0, transparent 60%)" }} />
        <div className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
          <Play size={14} fill="currentColor" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wider text-volt">{cat.toUpperCase()}</p>
        <h3 className="mt-0.5 truncate text-sm font-bold text-foreground">{title}</h3>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><BarChart3 size={11} /> {level}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {time} min</span>
        </div>
      </div>
    </button>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, BookOpen, Layers, Clock, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/library")({
  component: CoachLibrary,
});

const drills = [
  { name: "Edge Work Builder", level: "U12", duration: "12 min", category: "Skating" },
  { name: "Quick Release Shot", level: "U14", duration: "8 min", category: "Shooting" },
  { name: "Tight Turns Flow", level: "U12", duration: "10 min", category: "Skating" },
  { name: "1v1 Battle Box", level: "U16", duration: "15 min", category: "Battle" },
  { name: "Cross-Ice Passing", level: "U10", duration: "10 min", category: "Passing" },
  { name: "Game IQ Read & React", level: "U14", duration: "12 min", category: "IQ" },
];

const sessions = [
  { name: "Pre-Camp Warm-Up", drills: 6, duration: "45 min", used: 3 },
  { name: "Skills Day 1", drills: 8, duration: "60 min", used: 5 },
  { name: "Game Situation Day", drills: 7, duration: "75 min", used: 2 },
];

function CoachLibrary() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Library</h2>
          <p className="text-[11px] text-muted-foreground">Build drills and sessions — reuse across events.</p>
        </div>
        <button className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black">
          <Plus size={12} /> Create
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
        <Search size={14} className="text-muted-foreground" />
        <input placeholder="Search drills or sessions" className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Layers size={11} /> Saved Sessions</h3>
          <button className="text-[11px] font-semibold text-teal">+ New Session</button>
        </div>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.name} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{s.name}</p>
                <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">Used {s.used}×</span>
              </div>
              <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
                <span>{s.drills} drills</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {s.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><BookOpen size={11} /> Drills</h3>
        <div className="grid grid-cols-2 gap-2">
          {drills.map((d) => (
            <Link key={d.name} to="/drill-builder" className="rounded-2xl border border-border bg-card p-3">
              <p className="text-xs font-semibold">{d.name}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{d.category} · {d.level}</p>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-teal"><Clock size={9} /> {d.duration}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
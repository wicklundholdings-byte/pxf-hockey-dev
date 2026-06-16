import { createFileRoute } from "@tanstack/react-router";
import { Plus, Clock, Disc3, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions — PXF Hockey" },
      { name: "description", content: "Build custom practices in minutes with proven progressions." },
      { property: "og:title", content: "Sessions — PXF Hockey" },
      { property: "og:description", content: "Custom practices built from proven progressions." },
    ],
  }),
  component: Sessions,
});

const upcoming = [
  { day: "TODAY", date: "Jun 16", title: "Development Session", drills: 6, mins: 60 },
  { day: "WED", date: "Jun 18", title: "Edges & Transitions", drills: 5, mins: 45 },
  { day: "FRI", date: "Jun 20", title: "Shooting Power Block", drills: 4, mins: 40 },
];

function Sessions() {
  return (
    <div className="px-5 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">SESSION BUILDER</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Sessions</h1>
        </div>
        <button className="grid h-11 w-11 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
          <Plus size={20} />
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-teal/30 bg-surface shadow-glow-teal">
        <div className="bg-gradient-brand px-4 py-2 text-[10px] font-bold tracking-[0.3em] text-primary-foreground">
          ACTIVE SESSION
        </div>
        <div className="p-4">
          <h2 className="text-lg font-bold text-foreground">Development Session</h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Disc3 size={12} /> 6 Drills</span>
            <span className="flex items-center gap-1"><Clock size={12} /> 60 min</span>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { name: "Dynamic Warmup", done: true },
              { name: "Edge Control Pattern", done: true },
              { name: "Figure 8 Puck Control", done: true },
              { name: "Quick Release Shots", done: false, current: true },
              { name: "Reaction & Decision", done: false },
              { name: "Cooldown Flow", done: false },
            ].map((d) => (
              <div
                key={d.name}
                className={
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 " +
                  (d.current ? "border-teal/40 bg-teal/10" : "border-border/50 bg-surface-2")
                }
              >
                <div
                  className={
                    "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold " +
                    (d.done
                      ? "bg-gradient-brand text-primary-foreground"
                      : d.current
                      ? "border border-teal text-teal"
                      : "border border-border text-muted-foreground")
                  }
                >
                  {d.done ? <Check size={12} /> : ""}
                </div>
                <span className={"text-sm " + (d.done ? "text-muted-foreground line-through" : "text-foreground font-semibold")}>
                  {d.name}
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-bold tracking-wide text-primary-foreground">
            CONTINUE SESSION <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <h2 className="mt-8 text-xs font-bold tracking-[0.25em] text-foreground/90">UPCOMING</h2>
      <div className="mt-3 space-y-3">
        {upcoming.map((s) => (
          <button key={s.title} className="flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-surface p-4 text-left">
            <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-surface-2 py-2">
              <span className="text-[10px] font-bold tracking-widest text-volt">{s.day}</span>
              <span className="font-display text-base font-bold text-foreground">{s.date.split(" ")[1]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-foreground">{s.title}</h3>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{s.drills} drills</span>
                <span>•</span>
                <span>{s.mins} min</span>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
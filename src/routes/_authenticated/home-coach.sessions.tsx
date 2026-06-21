import { createFileRoute } from "@tanstack/react-router";
import { Clock, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home-coach/sessions")({
  component: () => {
    const sessions = [
      { name: "Saturday Skate", drills: 5, duration: "45 min" },
      { name: "Backyard Shooting", drills: 3, duration: "20 min" },
      { name: "Power Skating Block", drills: 6, duration: "60 min" },
    ];
    return (
      <div className="space-y-3">
        <button className="flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-3 text-xs font-semibold text-teal">
          <Plus size={14} /> Build a session
        </button>
        {sessions.map((s) => (
          <div key={s.name} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-sm font-semibold">{s.name}</p>
            <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
              <span>{s.drills} drills</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {s.duration}</span>
            </div>
          </div>
        ))}
      </div>
    );
  },
});
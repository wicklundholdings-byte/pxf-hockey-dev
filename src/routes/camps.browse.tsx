import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MapPin, CalendarDays, Star, Map as MapIcon, List } from "lucide-react";

export const Route = createFileRoute("/camps/browse")({
  head: () => ({ meta: [{ title: "Find Camps — PXF Hockey" }] }),
  component: BrowseCamps,
});

const camps = [
  { id: "c1", name: "Summer Elite Camp", coach: "Coach Reilly", rating: 4.9, location: "Mississauga, ON", dates: "Aug 12–16", price: 420, spots: 4, image: "from-teal/40 to-volt/30" },
  { id: "c2", name: "Skating Power Clinic", coach: "Coach Park", rating: 4.8, location: "Toronto, ON", dates: "Jul 22", price: 95, spots: 12, image: "from-volt/40 to-teal/20" },
  { id: "c3", name: "Goalie Intensive", coach: "Coach Smith", rating: 4.7, location: "Burlington, ON", dates: "Aug 5–7", price: 240, spots: 2, image: "from-teal/30 to-background" },
  { id: "c4", name: "Game IQ Weekend", coach: "Coach Reilly", rating: 5.0, location: "Mississauga, ON", dates: "Sep 14–15", price: 180, spots: 8, image: "from-volt/30 to-background" },
];

function BrowseCamps() {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Find Camps</h1>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search size={14} className="text-muted-foreground" />
        <input placeholder="Search near me…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {["Location", "Age group", "Skill level", "Date range", "Price range"].map((f) => (
          <button key={f} className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{f}</button>
        ))}
      </div>

      <div className="mt-3 inline-flex rounded-lg border border-border bg-card p-1 text-[11px]">
        <button onClick={() => setView("list")} className={`flex items-center gap-1 rounded-md px-3 py-1 font-bold ${view === "list" ? "bg-teal text-background" : "text-muted-foreground"}`}>
          <List size={12} /> List
        </button>
        <button onClick={() => setView("map")} className={`flex items-center gap-1 rounded-md px-3 py-1 font-bold ${view === "map" ? "bg-teal text-background" : "text-muted-foreground"}`}>
          <MapIcon size={12} /> Map
        </button>
      </div>

      {view === "list" ? (
        <div className="mt-4 space-y-3">
          {camps.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className={`h-28 bg-gradient-to-br ${c.image}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      {c.coach} · <Star size={10} className="fill-volt text-volt" /> {c.rating}
                    </p>
                  </div>
                  <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">{c.spots} spots left</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={11} />{c.location}</span>
                  <span className="flex items-center gap-1"><CalendarDays size={11} />{c.dates}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-display text-lg font-bold">${c.price}</p>
                  <button className="rounded-lg bg-teal px-4 py-2 text-xs font-bold text-background">BOOK NOW</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 relative h-[420px] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-background">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#21262D 1px,transparent 1px),linear-gradient(90deg,#21262D 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
          {camps.map((c, i) => (
            <div key={c.id} className="absolute" style={{ left: `${15 + i * 18}%`, top: `${25 + (i % 2) * 30}%` }}>
              <div className="rounded-full bg-teal p-1 shadow-lg shadow-teal/40"><MapPin size={14} className="text-background" /></div>
              <div className="mt-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] whitespace-nowrap">{c.name} · ${c.price}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
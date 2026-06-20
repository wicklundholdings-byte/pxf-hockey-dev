import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/attendees")({
  component: AttendeesScreen,
});

type Badge = "new" | "returning" | "veteran";
const ATHLETES: { id: string; name: string; gender: "M" | "F"; birthday: string; age: number; parent: string; camps: number; badge: Badge }[] = [
  { id: "a1", name: "Jordan Walsh", gender: "M", birthday: "2014-03-12", age: 11, parent: "Sarah Walsh", camps: 6, badge: "veteran" },
  { id: "a2", name: "Riley Walsh", gender: "F", birthday: "2016-09-04", age: 9, parent: "Sarah Walsh", camps: 2, badge: "returning" },
  { id: "a3", name: "Mason Chen", gender: "M", birthday: "2013-11-22", age: 12, parent: "Linda Chen", camps: 1, badge: "new" },
  { id: "a4", name: "Ava Thompson", gender: "F", birthday: "2015-06-30", age: 10, parent: "Mike Thompson", camps: 4, badge: "returning" },
  { id: "a5", name: "Lucas Park", gender: "M", birthday: "2012-01-18", age: 13, parent: "Jin Park", camps: 8, badge: "veteran" },
  { id: "a6", name: "Ella Brooks", gender: "F", birthday: "2017-04-09", age: 8, parent: "Dana Brooks", camps: 1, badge: "new" },
];

function badgeStyle(b: Badge) {
  if (b === "new") return "bg-teal/15 text-teal";
  if (b === "returning") return "bg-amber-400/15 text-amber-400";
  return "bg-emerald-400/15 text-emerald-400";
}

function AttendeesScreen() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Badge>("all");
  const filtered = ATHLETES.filter((a) => {
    if (filter !== "all" && a.badge !== filter) return false;
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Attendees</h2>
        <p className="text-[11px] text-muted-foreground">All athletes who have attended your camps.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search athletes…"
            className="w-full rounded-full border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none" />
        </div>
        <button className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground">
          <Filter size={11} /> Filter
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "new", "returning", "veteran"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={"rounded-full border px-3 py-1 text-[10px] font-semibold capitalize " +
              (filter === f ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={String(ATHLETES.length)} />
        <Stat label="New" value={String(ATHLETES.filter((a) => a.badge === "new").length)} />
        <Stat label="Returning" value={String(ATHLETES.filter((a) => a.badge !== "new").length)} />
      </div>

      <ul className="space-y-2">
        {filtered.map((a) => (
          <li key={a.id}>
            <Link to="/coach/attendees/$athleteId" params={{ athleteId: a.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
                {a.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{a.name}</p>
                  <span className={"rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase " + badgeStyle(a.badge)}>{a.badge}</span>
                </div>
                <p className="truncate text-[10px] text-muted-foreground">
                  {a.gender} · {a.age} yrs · DOB {a.birthday} · Parent: {a.parent}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{a.camps}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">camps</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <p className="font-display text-lg font-bold text-teal">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
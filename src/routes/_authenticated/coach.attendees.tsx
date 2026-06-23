import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/attendees")({
  component: AttendeesScreen,
});

type Badge = "new" | "returning" | "veteran";
type Source = { kind: "camp" | "team"; id: string; name: string };
const SOURCES: Source[] = [
  { kind: "camp", id: "c1", name: "Summer Elite Camp" },
  { kind: "camp", id: "c2", name: "Spring Skills Camp" },
  { kind: "camp", id: "c3", name: "Goalie Intensive" },
  { kind: "team", id: "t1", name: "U13 Thunder" },
  { kind: "team", id: "t2", name: "U11 Lightning" },
];
const ATHLETES: { id: string; name: string; gender: "M" | "F"; birthday: string; age: number; parent: string; camps: number; badge: Badge; sources: Source[] }[] = [
  { id: "a1", name: "Jordan Walsh", gender: "M", birthday: "2014-03-12", age: 11, parent: "Sarah Walsh", camps: 6, badge: "veteran", sources: [SOURCES[0], SOURCES[3]] },
  { id: "a2", name: "Riley Walsh", gender: "F", birthday: "2016-09-04", age: 9, parent: "Sarah Walsh", camps: 2, badge: "returning", sources: [SOURCES[1], SOURCES[4]] },
  { id: "a3", name: "Mason Chen", gender: "M", birthday: "2013-11-22", age: 12, parent: "Linda Chen", camps: 1, badge: "new", sources: [SOURCES[0]] },
  { id: "a4", name: "Ava Thompson", gender: "F", birthday: "2015-06-30", age: 10, parent: "Mike Thompson", camps: 4, badge: "returning", sources: [SOURCES[3]] },
  { id: "a5", name: "Lucas Park", gender: "M", birthday: "2012-01-18", age: 13, parent: "Jin Park", camps: 8, badge: "veteran", sources: [SOURCES[2], SOURCES[3]] },
  { id: "a6", name: "Ella Brooks", gender: "F", birthday: "2017-04-09", age: 8, parent: "Dana Brooks", camps: 1, badge: "new", sources: [SOURCES[1]] },
];

function badgeStyle(b: Badge) {
  if (b === "new") return "bg-teal/15 text-teal";
  if (b === "returning") return "bg-amber-400/15 text-amber-400";
  return "bg-emerald-400/15 text-emerald-400";
}

function AttendeesScreen() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "camps" | "teams" | "new" | "returning">("all");
  const [sourceId, setSourceId] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const filtered = ATHLETES.filter((a) => {
    if (filter === "camps" && !a.sources.some((s) => s.kind === "camp")) return false;
    if (filter === "teams" && !a.sources.some((s) => s.kind === "team")) return false;
    if (filter === "new" && a.badge !== "new") return false;
    if (filter === "returning" && a.badge === "new") return false;
    if (sourceId && !a.sources.some((s) => s.id === sourceId)) return false;
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const selectedSource = SOURCES.find((s) => s.id === sourceId);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Athletes</h2>
        <p className="text-[11px] text-muted-foreground">Every athlete across your camps, teams, and sessions.</p>
      </div>

      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search athletes…"
            className="w-full rounded-full border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none" />
        </div>
        <button onClick={() => setDropdownOpen((o) => !o)}
          className={"flex items-center gap-1 rounded-full border px-3 py-2 text-[10px] font-semibold " +
            (selectedSource ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")}>
          {selectedSource ? selectedSource.name : "All sources"} <ChevronDown size={11} />
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <button onClick={() => { setSourceId(""); setDropdownOpen(false); }}
              className="block w-full px-3 py-2 text-left text-[11px] font-semibold text-foreground hover:bg-teal/10">
              All sources
            </button>
            <div className="px-3 pt-2 text-[9px] uppercase tracking-wider text-muted-foreground">Camps</div>
            {SOURCES.filter((s) => s.kind === "camp").map((s) => (
              <button key={s.id} onClick={() => { setSourceId(s.id); setDropdownOpen(false); }}
                className="block w-full px-3 py-1.5 text-left text-[11px] text-foreground hover:bg-teal/10">
                {s.name}
              </button>
            ))}
            <div className="px-3 pt-2 text-[9px] uppercase tracking-wider text-muted-foreground">Teams</div>
            {SOURCES.filter((s) => s.kind === "team").map((s) => (
              <button key={s.id} onClick={() => { setSourceId(s.id); setDropdownOpen(false); }}
                className="block w-full px-3 py-1.5 text-left text-[11px] text-foreground hover:bg-teal/10">
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "camps", "teams", "new", "returning"] as const).map((f) => (
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
                <p className="mt-0.5 truncate text-[10px] text-teal">
                  {a.sources.map((s) => s.name).join(" · ")}
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
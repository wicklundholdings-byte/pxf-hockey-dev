import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search as SearchIcon, MapPin, Users, Dumbbell, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — PXF Hockey" }] }),
  component: SearchScreen,
});

type Kind = "all" | "drills" | "camps" | "coaches";

const DRILLS = [
  { id: "d1", title: "Tight-Turn Edge Work", level: "Intermediate", age: "10-14" },
  { id: "d2", title: "1-on-1 Gap Control", level: "Advanced", age: "12+" },
  { id: "d3", title: "Quick-Release Shooting", level: "All", age: "8+" },
];
const CAMPS = [
  { slug: "elite-skills-fall-2025", name: "Elite Skills Camp", location: "Toronto, ON", date: "Oct 14–18", level: "Intermediate" },
  { slug: "power-skating-nov-2025", name: "Power Skating Intensive", location: "Mississauga, ON", date: "Nov 4–6", level: "All" },
];
const COACHES = [
  { slug: "marcus-reilly", name: "Marcus Reilly", location: "Toronto, ON", rating: 4.9 },
  { slug: "kate-nguyen", name: "Kate Nguyen", location: "Vancouver, BC", rating: 4.8 },
];

function SearchScreen() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [level, setLevel] = useState("any");
  const [location, setLocation] = useState("any");

  const filtered = useMemo(() => {
    const m = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
    return {
      drills: DRILLS.filter((d) => m(d.title) && (level === "any" || d.level === level)),
      camps: CAMPS.filter((c) => m(c.name) && (location === "any" || c.location.includes(location))),
      coaches: COACHES.filter((c) => m(c.name) && (location === "any" || c.location.includes(location))),
    };
  }, [q, level, location]);

  const showDrills = kind === "all" || kind === "drills";
  const showCamps = kind === "all" || kind === "camps";
  const showCoaches = kind === "all" || kind === "coaches";

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-32">
      <Link to="/" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12}/> Back
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drills, camps, coaches…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "drills", "camps", "coaches"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={"rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize " +
              (kind === k ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")}>
            {k}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select label="Skill level" value={level} onChange={setLevel} options={["any","All","Beginner","Intermediate","Advanced"]} />
        <Select label="Location" value={location} onChange={setLocation} options={["any","Toronto","Mississauga","Vancouver"]} />
      </div>

      <div className="mt-6 space-y-5">
        {showDrills && filtered.drills.length > 0 && (
          <Group title="Drills" count={filtered.drills.length} icon={Dumbbell}>
            {filtered.drills.map((d) => (
              <Link key={d.id} to="/drill-detail/$drillId" params={{ drillId: d.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-teal/15"><Dumbbell size={14} className="text-teal"/></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">{d.level} · Ages {d.age}</p>
                </div>
              </Link>
            ))}
          </Group>
        )}
        {showCamps && filtered.camps.length > 0 && (
          <Group title="Camps" count={filtered.camps.length} icon={Users}>
            {filtered.camps.map((c) => (
              <Link key={c.slug} to="/book/$slug" params={{ slug: c.slug }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-400/15"><Users size={14} className="text-amber-400"/></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin size={9}/> {c.location} · {c.date}</p>
                </div>
              </Link>
            ))}
          </Group>
        )}
        {showCoaches && filtered.coaches.length > 0 && (
          <Group title="Coaches" count={filtered.coaches.length} icon={BadgeCheck}>
            {filtered.coaches.map((c) => (
              <Link key={c.slug} to="/coaches/$slug" params={{ slug: c.slug }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-green-400/15"><BadgeCheck size={14} className="text-green-400"/></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.location} · ★ {c.rating}</p>
                </div>
              </Link>
            ))}
          </Group>
        )}
        {q && filtered.drills.length === 0 && filtered.camps.length === 0 && filtered.coaches.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No results for "{q}"
          </p>
        )}
      </div>
    </div>
  );
}

function Group({ title, count, icon: Icon, children }:
  { title: string; count: number; icon: typeof Users; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon size={11}/> {title} <span className="text-muted-foreground/70">({count})</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }:
  { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-teal focus:outline-none">
        {options.map((o) => <option key={o} value={o}>{o === "any" ? "Any" : o}</option>)}
      </select>
    </div>
  );
}
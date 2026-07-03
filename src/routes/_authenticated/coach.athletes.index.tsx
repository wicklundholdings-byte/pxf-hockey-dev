import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/athletes/")({
  component: AthletesIndex,
});

type Athlete = {
  id: string;
  name: string;
  jersey: number;
  team: string;
  position: string;
  g: number;
  a: number;
};

export const MOCK_ATHLETES: Athlete[] = [
  { id: "liam-carter", name: "Liam Carter", jersey: 14, team: "Elite Demo Team", position: "Left Wing", g: 8, a: 12 },
  { id: "jake-andersson", name: "Jake Andersson", jersey: 9, team: "Elite Demo Team", position: "Center", g: 10, a: 8 },
  { id: "noah-jensen", name: "Noah Jensen", jersey: 17, team: "Elite Demo Team", position: "Right Wing", g: 7, a: 8 },
  { id: "owen-brooks", name: "Owen Brooks", jersey: 21, team: "Elite Demo Team", position: "Defence", g: 4, a: 9 },
  { id: "tyler-petrov", name: "Tyler Petrov", jersey: 8, team: "Elite Demo Team", position: "Defence", g: 3, a: 8 },
  { id: "marco-callahan", name: "Marco Callahan", jersey: 22, team: "Elite Demo Team", position: "Center", g: 5, a: 5 },
  { id: "ethan-park", name: "Ethan Park", jersey: 7, team: "Elite Demo Team", position: "Left Wing", g: 3, a: 5 },
  { id: "marco-vella", name: "Marco Vella", jersey: 11, team: "Elite Demo Team", position: "Right Wing", g: 2, a: 5 },
  { id: "ryan-miller", name: "Ryan Miller", jersey: 31, team: "Elite Demo Team", position: "Goalie", g: 0, a: 0 },
  { id: "cody-reilly", name: "Cody Reilly", jersey: 6, team: "Atom Rep", position: "Defence", g: 2, a: 4 },
  { id: "sam-huang", name: "Sam Huang", jersey: 12, team: "Atom Rep", position: "Center", g: 6, a: 3 },
  { id: "max-devries", name: "Max DeVries", jersey: 19, team: "Bantam A", position: "Left Wing", g: 5, a: 6 },
];

const TEAMS = ["All", "Elite Demo Team", "Atom Rep", "Bantam A"];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function AthletesIndex() {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("All");

  const filtered = useMemo(() => {
    return MOCK_ATHLETES.filter((a) => (team === "All" || a.team === team))
      .filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q, team]);

  return (
    <div className="space-y-4 pb-10">
      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">ROSTER</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Athletes</h1>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search athletes"
          className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
        />
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {TEAMS.map((t) => {
          const active = team === t;
          return (
            <button
              key={t}
              onClick={() => setTeam(t)}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold " +
                (active ? "bg-teal text-background" : "border border-border bg-surface text-muted-foreground")
              }
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        {filtered.map((a) => (
          <Link
            key={a.id}
            to="/coach/athletes/$athleteId"
            params={{ athleteId: a.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
          >
            <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-background">
              {initials(a.name)}
              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-surface bg-background text-[9px] font-bold text-teal">
                {a.jersey}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{a.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{a.team} · {a.position}</p>
              <p className="mt-0.5 text-[11px] font-bold text-teal">{a.g}G · {a.a}A · {a.g + a.a}PTS</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <Users className="mx-auto mb-2 text-muted-foreground" size={22} />
            <p className="text-xs text-muted-foreground">No athletes match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
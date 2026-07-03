import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/parent/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — PXF Hockey" }] }),
  component: ParentLeaderboard,
});

type Row = { jersey: number; name: string; team: string; g: number; a: number };
type Goalie = { name: string; gp: number; gaa: number; svp: number };

const ROWS: Row[] = [
  { jersey: 14, name: "Liam Carter", team: "Elite Demo", g: 8, a: 12 },
  { jersey: 9, name: "Jake Andersson", team: "Elite Demo", g: 10, a: 8 },
  { jersey: 17, name: "Noah Jensen", team: "Elite Demo", g: 7, a: 8 },
  { jersey: 21, name: "Owen Brooks", team: "Elite Demo", g: 4, a: 9 },
  { jersey: 8, name: "Tyler Petrov", team: "Elite Demo", g: 3, a: 8 },
  { jersey: 22, name: "Marco Callahan", team: "Elite Demo", g: 5, a: 5 },
  { jersey: 7, name: "Ethan Park", team: "Elite Demo", g: 3, a: 5 },
  { jersey: 11, name: "Marco Vella", team: "Elite Demo", g: 2, a: 5 },
];

const GOALIES: Goalie[] = [{ name: "Ryan Miller", gp: 14, gaa: 2.1, svp: 0.924 }];

const TEAMS = ["All Teams", "Elite Demo Team", "Atom Rep"];
type Metric = "PTS" | "G" | "A";

// Highlight for demo purposes
const MY_ATHLETE = "Liam Carter";

function ParentLeaderboard() {
  const [team, setTeam] = useState("All Teams");
  const [metric, setMetric] = useState<Metric>("PTS");

  const sorted = useMemo(() => {
    const list = ROWS.filter((r) => team === "All Teams" || r.team.startsWith(team.split(" ")[0]));
    return [...list].sort((a, b) => {
      if (metric === "G") return b.g - a.g;
      if (metric === "A") return b.a - a.a;
      return (b.g + b.a) - (a.g + a.a);
    });
  }, [team, metric]);

  return (
    <div className="space-y-4 pb-24">
      <div>
        <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">TEAM</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Leaderboard</h1>
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
        {TEAMS.map((t) => (
          <button
            key={t}
            onClick={() => setTeam(t)}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold " +
              (team === t ? "bg-teal text-background" : "border border-border bg-surface text-muted-foreground")
            }
          >{t}</button>
        ))}
      </div>

      <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
        {(["PTS", "G", "A"] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={
              "flex-1 rounded-full py-1.5 text-[11px] font-bold " +
              (metric === m ? "bg-teal text-background" : "text-muted-foreground")
            }
          >{m === "PTS" ? "Points" : m === "G" ? "Goals" : "Assists"}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-[28px_40px_1fr_80px_36px] gap-2 border-b border-border bg-surface-2 px-3 py-2 text-[10px] font-bold tracking-wider text-muted-foreground">
          <span>#</span><span>JSY</span><span>NAME</span><span>TEAM</span><span className="text-right">{metric}</span>
        </div>
        {sorted.map((r, i) => {
          const val = metric === "G" ? r.g : metric === "A" ? r.a : r.g + r.a;
          const mine = r.name === MY_ATHLETE;
          return (
            <div
              key={r.name}
              className={
                "grid grid-cols-[28px_40px_1fr_80px_36px] gap-2 border-b border-border/60 px-3 py-2 text-[12px] last:border-b-0 " +
                (mine ? "bg-teal/15" : "")
              }
            >
              <span className={"font-bold " + (mine ? "text-teal" : "text-muted-foreground")}>{i + 1}</span>
              <span className="font-bold text-teal">#{r.jersey}</span>
              <span className={"truncate " + (mine ? "font-bold text-teal" : "font-semibold")}>{r.name}</span>
              <span className="truncate text-[11px] text-muted-foreground">{r.team}</span>
              <span className="text-right font-bold">{val}</span>
            </div>
          );
        })}
      </div>

      <section>
        <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-muted-foreground">GOALIE STATS</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-[28px_1fr_44px_48px_56px] gap-2 border-b border-border bg-surface-2 px-3 py-2 text-[10px] font-bold tracking-wider text-muted-foreground">
            <span>#</span><span>NAME</span><span className="text-right">GP</span><span className="text-right">GAA</span><span className="text-right">SV%</span>
          </div>
          {GOALIES.map((g, i) => (
            <div key={g.name} className="grid grid-cols-[28px_1fr_44px_48px_56px] gap-2 px-3 py-2 text-[12px]">
              <span className="font-bold text-muted-foreground">{i + 1}</span>
              <span className="font-semibold">{g.name}</span>
              <span className="text-right">{g.gp}</span>
              <span className="text-right">{g.gaa.toFixed(1)}</span>
              <span className="text-right font-bold">{g.svp.toFixed(3).replace(/^0/, "")}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
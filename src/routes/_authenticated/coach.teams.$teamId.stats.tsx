import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { loadTeamSeasonStats, gaa, svpct, type SkaterAgg, type GoalieAgg, type TeamRecord, type GameFilter } from "@/lib/team-stats";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/stats")({
  component: TeamStats,
});

type SortKey = keyof Pick<SkaterAgg, "gp"|"g"|"a"|"pts"|"pm"|"pim"|"sog">;

function TeamStats() {
  const { teamId } = Route.useParams();
  const [filter, setFilter] = useState<GameFilter>("all");
  const [record, setRecord] = useState<TeamRecord | null>(null);
  const [skaters, setSkaters] = useState<SkaterAgg[]>([]);
  const [goalies, setGoalies] = useState<GoalieAgg[]>([]);
  const [sort, setSort] = useState<SortKey>("pts");

  useEffect(() => {
    (async () => {
      const s = await loadTeamSeasonStats(teamId, filter);
      setRecord(s.record); setSkaters(s.skaters); setGoalies(s.goalies);
    })();
  }, [teamId, filter]);

  const sortedSkaters = useMemo(() => {
    return [...skaters].sort((a, b) => (b[sort] as number) - (a[sort] as number));
  }, [skaters, sort]);

  return (
    <div>
      <h3 className="text-sm font-bold">Team Stats</h3>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1 text-[10px] font-bold">
        {(["all","home","away"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={"rounded-full py-1.5 " + (filter === f ? "bg-teal text-background" : "text-muted-foreground")}>
            {f === "all" ? "All Games" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {record && (
        <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground">SEASON RECORD</p>
          <p className="mt-1 font-display text-2xl font-bold">{record.w}-{record.l}-{record.otl + record.sol}</p>
          <p className="text-[11px] text-muted-foreground">
            {record.points} PTS · {record.gp} GP · GF {record.gf} · GA {record.ga} · DIFF {record.diff >= 0 ? "+" : ""}{record.diff}
          </p>
          {(record.otw + record.otl + record.sow + record.sol) > 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground">OTW {record.otw} · OTL {record.otl} · SOW {record.sow} · SOL {record.sol}</p>
          )}
        </div>
      )}

      <h4 className="mt-4 text-xs font-bold">Skaters</h4>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[480px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Player</th>
              {(["gp","g","a","pts","pm","pim","sog"] as SortKey[]).map((k) => (
                <th key={k} className="p-2 cursor-pointer" onClick={() => setSort(k)}>
                  <span className={sort === k ? "text-teal" : ""}>{k === "pm" ? "+/-" : k.toUpperCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSkaters.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No stats yet.</td></tr>
            )}
            {sortedSkaters.map((s) => (
              <tr key={s.team_player_id} className="border-t border-border">
                <td className="p-2 font-semibold">{s.display_name}</td>
                <td className="p-2 text-center">{s.gp}</td>
                <td className="p-2 text-center">{s.g}</td>
                <td className="p-2 text-center">{s.a}</td>
                <td className="p-2 text-center font-bold text-teal">{s.pts}</td>
                <td className="p-2 text-center">{s.pm > 0 ? "+" : ""}{s.pm}</td>
                <td className="p-2 text-center">{s.pim}</td>
                <td className="p-2 text-center">{s.sog}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mt-4 text-xs font-bold">Goalies</h4>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[440px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2 text-left">Goalie</th><th>GP</th><th>W</th><th>L</th><th>GAA</th><th>SV%</th><th>SO</th></tr>
          </thead>
          <tbody>
            {goalies.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No goalie stats yet.</td></tr>
            )}
            {goalies.map((g) => (
              <tr key={g.team_player_id} className="border-t border-border">
                <td className="p-2 font-semibold">{g.display_name}</td>
                <td className="p-2 text-center">{g.gp}</td>
                <td className="p-2 text-center">{g.w}</td>
                <td className="p-2 text-center">{g.l}</td>
                <td className="p-2 text-center">{gaa(g.ga, g.gp)}</td>
                <td className="p-2 text-center">{svpct(g.saves, g.shots)}</td>
                <td className="p-2 text-center">{g.so}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
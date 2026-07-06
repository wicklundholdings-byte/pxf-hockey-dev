import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { loadTeamSeasonStats, maskName, gaa, svpct, type SkaterAgg, type GoalieAgg, type TeamRecord, type GameFilter } from "@/lib/team-stats";
import { mockRecord, mockSkaters, mockGoalies } from "@/lib/mock-team-stats";

export const Route = createFileRoute("/parent/teams/$teamId/stats")({
  component: ParentStats,
});

type SortKey = keyof Pick<SkaterAgg, "gp"|"g"|"a"|"pts"|"pm"|"pim"|"sog">;
type GameLine = { event_id: string; event_date: string; opponent_name: string | null; goals: number; assists: number; pts: number; pim: number; pm: number; sog: number };

function ParentStats() {
  const { teamId } = Route.useParams();
  const { user } = useAuth();
  const [filter, setFilter] = useState<GameFilter>("all");
  const [record, setRecord] = useState<TeamRecord | null>(null);
  const [skaters, setSkaters] = useState<SkaterAgg[]>([]);
  const [goalies, setGoalies] = useState<GoalieAgg[]>([]);
  const [sort, setSort] = useState<SortKey>("pts");
  const [myAthleteIds, setMyAthleteIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<GameLine[]>([]);

  useEffect(() => {
    (async () => {
      const s = await loadTeamSeasonStats(teamId, filter);
      if (s.skaters && s.skaters.length > 0) {
        setRecord(s.record); setSkaters(s.skaters); setGoalies(s.goalies);
      } else {
        setRecord(mockRecord); setSkaters(mockSkaters); setGoalies(mockGoalies);
      }
    })();
  }, [teamId, filter]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("attendees").select("id").eq("owner_id", user.id);
      setMyAthleteIds(((data ?? []) as { id: string }[]).map((a) => a.id));
    })();
  }, [user?.id]);

  const sortedSkaters = useMemo(() => [...skaters].sort((a, b) => (b[sort] as number) - (a[sort] as number)), [skaters, sort]);

  async function openRow(s: SkaterAgg) {
    if (expanded === s.team_player_id) { setExpanded(null); setBreakdown([]); return; }
    setExpanded(s.team_player_id);
    const mine = !!s.athlete_id && myAthleteIds.includes(s.athlete_id);
    if (!mine) { setBreakdown([]); return; }
    const { data: rows } = await supabase
      .from("game_player_stats")
      .select("event_id,goals,assists,points,penalty_minutes,plus_minus,shots_on_goal")
      .eq("team_player_id", s.team_player_id);
    const ids = (rows ?? []).map((r: any) => r.event_id);
    const { data: evs } = await supabase.from("team_events").select("id,event_date,opponent_name").in("id", ids);
    const evMap = new Map((evs ?? []).map((e: any) => [e.id, e]));
    const lines: GameLine[] = ((rows ?? []) as any[])
      .map((r) => ({
        event_id: r.event_id,
        event_date: evMap.get(r.event_id)?.event_date ?? "",
        opponent_name: evMap.get(r.event_id)?.opponent_name ?? null,
        goals: r.goals, assists: r.assists, pts: r.points ?? (r.goals + r.assists),
        pim: r.penalty_minutes, pm: r.plus_minus, sog: r.shots_on_goal,
      }))
      .sort((a, b) => (b.event_date > a.event_date ? 1 : -1));
    setBreakdown(lines);
  }

  return (
    <div className="px-5 pb-6">
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
          <p className="mt-1 font-display text-2xl font-bold">{record.w}-{record.l}-{record.otw + record.otl + record.sow + record.sol}</p>
          <p className="text-[11px] text-muted-foreground">
            {record.points} PTS · {record.gp} GP · GF {record.gf} · GA {record.ga} · DIFF {record.diff >= 0 ? "+" : ""}{record.diff}
          </p>
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
            {sortedSkaters.map((s) => {
              const mine = !!s.athlete_id && myAthleteIds.includes(s.athlete_id);
              const isOpen = expanded === s.team_player_id;
              return (
                <>
                  <tr key={s.team_player_id} onClick={() => openRow(s)}
                      className={"cursor-pointer border-t border-border " + (mine ? "bg-teal/10" : "")}>
                    <td className="p-2 font-semibold">{mine ? s.display_name : maskName(s.display_name)}</td>
                    <td className="p-2 text-center">{s.gp}</td>
                    <td className="p-2 text-center">{s.g}</td>
                    <td className="p-2 text-center">{s.a}</td>
                    <td className="p-2 text-center font-bold text-teal">{s.pts}</td>
                    <td className="p-2 text-center">{s.pm > 0 ? "+" : ""}{s.pm}</td>
                    <td className="p-2 text-center">{s.pim}</td>
                    <td className="p-2 text-center">{s.sog}</td>
                  </tr>
                  {isOpen && (
                    <tr><td colSpan={8} className="border-t border-border bg-background p-3">
                      {mine ? (
                        breakdown.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">No games yet.</p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">GAME LOG</p>
                            {breakdown.map((l) => (
                              <div key={l.event_id} className="flex items-center justify-between rounded-lg bg-surface p-2 text-[11px]">
                                <span>{l.event_date} · vs {l.opponent_name || "TBD"}</span>
                                <span className="font-bold">{l.goals}G {l.assists}A {l.pts}PTS</span>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Season totals shown. Game-by-game breakdowns are private to that family.</p>
                      )}
                    </td></tr>
                  )}
                </>
              );
            })}
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
            {goalies.map((g) => {
              const mine = !!g.athlete_id && myAthleteIds.includes(g.athlete_id);
              return (
                <tr key={g.team_player_id} className={"border-t border-border " + (mine ? "bg-teal/10" : "")}>
                  <td className="p-2 font-semibold">{mine ? g.display_name : maskName(g.display_name)}</td>
                  <td className="p-2 text-center">{g.gp}</td>
                  <td className="p-2 text-center">{g.w}</td>
                  <td className="p-2 text-center">{g.l}</td>
                  <td className="p-2 text-center">{gaa(g.ga, g.gp)}</td>
                  <td className="p-2 text-center">{svpct(g.saves, g.shots)}</td>
                  <td className="p-2 text-center">{g.so}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
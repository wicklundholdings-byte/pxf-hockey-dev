import { supabase } from "@/integrations/supabase/client";

export type SkaterAgg = {
  team_player_id: string;
  display_name: string;
  athlete_id: string | null;
  gp: number;
  g: number;
  a: number;
  pts: number;
  pim: number;
  pm: number;
  sog: number;
};
export type GoalieAgg = {
  team_player_id: string;
  display_name: string;
  athlete_id: string | null;
  gp: number;
  w: number;
  l: number;
  ga: number;
  saves: number;
  shots: number;
  so: number;
};
export type TeamRecord = {
  w: number; l: number; otw: number; otl: number; sow: number; sol: number;
  points: number; gp: number; gf: number; ga: number; diff: number;
};

export type GameFilter = "all" | "home" | "away";

export async function loadTeamSeasonStats(teamId: string, filter: GameFilter = "all") {
  // Pull all games for the team with results
  let evQ = supabase
    .from("team_events")
    .select("id,event_date,home_away,opponent_name")
    .eq("team_id", teamId)
    .eq("event_type", "game");
  if (filter === "home") evQ = evQ.eq("home_away", "home");
  if (filter === "away") evQ = evQ.eq("home_away", "away");
  const { data: events } = await evQ;
  const eventIds = (events ?? []).map((e: any) => e.id);

  if (!eventIds.length) {
    return {
      record: { w: 0, l: 0, otw: 0, otl: 0, sow: 0, sol: 0, points: 0, gp: 0, gf: 0, ga: 0, diff: 0 } as TeamRecord,
      skaters: [] as SkaterAgg[],
      goalies: [] as GoalieAgg[],
      events: [],
    };
  }

  const [{ data: results }, { data: players }, { data: pStats }, { data: gStats }] = await Promise.all([
    supabase.from("game_results").select("event_id,team_score,opponent_score,result").in("event_id", eventIds),
    supabase.from("team_players").select("id,display_name,athlete_id,position").eq("team_id", teamId),
    supabase.from("game_player_stats").select("event_id,team_player_id,goals,assists,points,penalty_minutes,plus_minus,shots_on_goal").in("event_id", eventIds),
    supabase.from("game_goalie_stats").select("event_id,team_player_id,saves,goals_against,shutout").in("event_id", eventIds),
  ]);

  const record: TeamRecord = { w: 0, l: 0, otw: 0, otl: 0, sow: 0, sol: 0, points: 0, gp: 0, gf: 0, ga: 0, diff: 0 };
  for (const r of (results ?? []) as any[]) {
    record.gp++;
    record.gf += r.team_score ?? 0;
    record.ga += r.opponent_score ?? 0;
    if (r.result === "win") { record.w++; record.points += 2; }
    else if (r.result === "ot_win") { record.otw++; record.points += 2; }
    else if (r.result === "so_win") { record.sow++; record.points += 2; }
    else if (r.result === "ot_loss") { record.otl++; record.points += 1; }
    else if (r.result === "so_loss") { record.sol++; record.points += 1; }
    else if (r.result === "loss") { record.l++; }
  }
  record.diff = record.gf - record.ga;

  const playerMap = new Map<string, any>();
  for (const p of (players ?? []) as any[]) playerMap.set(p.id, p);

  const skMap = new Map<string, SkaterAgg>();
  const goMap = new Map<string, GoalieAgg>();

  for (const s of (pStats ?? []) as any[]) {
    const meta = playerMap.get(s.team_player_id);
    if (!meta || meta.position === "goalie") continue;
    let row = skMap.get(s.team_player_id);
    if (!row) {
      row = { team_player_id: s.team_player_id, display_name: meta.display_name, athlete_id: meta.athlete_id, gp: 0, g: 0, a: 0, pts: 0, pim: 0, pm: 0, sog: 0 };
      skMap.set(s.team_player_id, row);
    }
    row.gp++; row.g += s.goals ?? 0; row.a += s.assists ?? 0;
    row.pts += s.points ?? (s.goals + s.assists);
    row.pim += s.penalty_minutes ?? 0; row.pm += s.plus_minus ?? 0; row.sog += s.shots_on_goal ?? 0;
  }

  for (const g of (gStats ?? []) as any[]) {
    const meta = playerMap.get(g.team_player_id);
    if (!meta) continue;
    let row = goMap.get(g.team_player_id);
    if (!row) {
      row = { team_player_id: g.team_player_id, display_name: meta.display_name, athlete_id: meta.athlete_id, gp: 0, w: 0, l: 0, ga: 0, saves: 0, shots: 0, so: 0 };
      goMap.set(g.team_player_id, row);
    }
    row.gp++; row.ga += g.goals_against ?? 0; row.saves += g.saves ?? 0;
    row.shots += (g.saves ?? 0) + (g.goals_against ?? 0);
    if (g.shutout) row.so++;
    // Goalie W/L attribution: tie to team result if exactly one goalie in the game
    const r = (results ?? []).find((rr: any) => rr.event_id === g.event_id);
    if (r) {
      const sameGameGoalies = (gStats ?? []).filter((gg: any) => gg.event_id === g.event_id);
      if (sameGameGoalies.length === 1) {
        if (["win","ot_win","so_win"].includes(r.result)) row.w++;
        else if (["loss","ot_loss","so_loss"].includes(r.result)) row.l++;
      }
    }
  }

  const skaters = Array.from(skMap.values()).sort((a, b) => b.pts - a.pts || b.g - a.g);
  const goalies = Array.from(goMap.values()).sort((a, b) => b.w - a.w);
  return { record, skaters, goalies, events: (events ?? []) as any[] };
}

export function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  return (parts[0] ?? "") + (parts[1]?.[0] ? ` ${parts[1][0]}.` : "");
}

export function gaa(goalsAgainst: number, gp: number) {
  if (!gp) return "0.00";
  return (goalsAgainst / gp).toFixed(2);
}
export function svpct(saves: number, shots: number) {
  if (!shots) return ".000";
  return (saves / shots).toFixed(3).replace(/^0/, "");
}
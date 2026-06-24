import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveFullGameStats } from "@/lib/teams.functions";
import { ArrowLeft, Upload, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId/stats")({
  component: StatsEntry,
});

type Player = { id: string; display_name: string; jersey_number: string | null; position: string | null; athlete_id: string | null };
type Skater = { goals: string; assists: string; pim: string; pm: string; sog: string; toi: string };
type Goalie = { saves: string; ga: string; shutout: boolean };

const emptySkater = (): Skater => ({ goals: "", assists: "", pim: "", pm: "", sog: "", toi: "" });
const emptyGoalie = (): Goalie => ({ saves: "", ga: "", shutout: false });

function StatsEntry() {
  const { teamId, eventId } = Route.useParams();
  const save = useServerFn(saveFullGameStats);
  const [event, setEvent] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamScore, setTeamScore] = useState("");
  const [oppScore, setOppScore] = useState("");
  const [result, setResult] = useState<"" | "win" | "loss" | "ot_win" | "ot_loss" | "so_win" | "so_loss">("");
  const [skaters, setSkaters] = useState<Record<string, Skater>>({});
  const [goalies, setGoalies] = useState<Record<string, Goalie>>({});
  const [mode, setMode] = useState<"manual" | "upload">("manual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: p }, { data: ps }, { data: gs }] = await Promise.all([
        supabase.from("team_events").select("id,opponent_name,event_date,home_away").eq("id", eventId).maybeSingle(),
        supabase.from("team_players").select("id,display_name,jersey_number,position,athlete_id").eq("team_id", teamId).order("display_name"),
        supabase.from("game_player_stats").select("*").eq("event_id", eventId),
        supabase.from("game_goalie_stats").select("*").eq("event_id", eventId),
      ]);
      const { data: rr } = await supabase.from("game_results").select("*").eq("event_id", eventId).maybeSingle();
      setEvent(e);
      const pl = (p ?? []) as Player[];
      setPlayers(pl);
      const skMap: Record<string, Skater> = {};
      const goMap: Record<string, Goalie> = {};
      for (const pp of pl) {
        if (pp.position === "goalie") goMap[pp.id] = emptyGoalie();
        else skMap[pp.id] = emptySkater();
      }
      for (const s of (ps ?? []) as any[]) {
        skMap[s.team_player_id] = {
          goals: String(s.goals ?? ""), assists: String(s.assists ?? ""),
          pim: String(s.penalty_minutes ?? ""), pm: String(s.plus_minus ?? ""),
          sog: String(s.shots_on_goal ?? ""), toi: s.toi ?? "",
        };
      }
      for (const g of (gs ?? []) as any[]) {
        goMap[g.team_player_id] = { saves: String(g.saves ?? ""), ga: String(g.goals_against ?? ""), shutout: !!g.shutout };
      }
      setSkaters(skMap); setGoalies(goMap);
      if (rr) {
        setTeamScore(String(rr.team_score ?? "")); setOppScore(String(rr.opponent_score ?? ""));
        setResult((rr.result as any) ?? "");
      }
    })();
  }, [eventId, teamId]);

  function autoResult(ts: string, os: string) {
    const a = +ts, b = +os;
    if (!ts || !os || isNaN(a) || isNaN(b)) return;
    if (a > b) setResult((r) => (r === "ot_win" || r === "so_win" ? r : "win"));
    else if (a < b) setResult((r) => (r === "ot_loss" || r === "so_loss" ? r : "loss"));
  }

  async function commit() {
    setSaving(true);
    try {
      const skArr = Object.entries(skaters)
        .filter(([pid]) => players.find((p) => p.id === pid))
        .map(([pid, s]) => {
          const pl = players.find((p) => p.id === pid)!;
          return {
            teamPlayerId: pid, athleteId: pl.athlete_id,
            goals: +s.goals || 0, assists: +s.assists || 0,
            penaltyMinutes: +s.pim || 0, plusMinus: +s.pm || 0,
            shotsOnGoal: +s.sog || 0, toi: s.toi || null,
          };
        });
      const goArr = Object.entries(goalies).map(([pid, g]) => {
        const pl = players.find((p) => p.id === pid)!;
        return {
          teamPlayerId: pid, athleteId: pl.athlete_id,
          saves: +g.saves || 0, goalsAgainst: +g.ga || 0, shutout: g.shutout,
        };
      });
      await save({
        data: {
          teamId, eventId,
          teamScore: +teamScore || 0, opponentScore: +oppScore || 0,
          result: (result || null) as any,
          skaters: skArr, goalies: goArr,
        },
      });
      alert("Stats saved");
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  const skaterRoster = players.filter((p) => p.position !== "goalie");
  const goalieRoster = players.filter((p) => p.position === "goalie");

  return (
    <div>
      <Link to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>
      <h3 className="mt-2 font-display text-lg font-bold">Game Stats</h3>
      <p className="text-[11px] text-muted-foreground">vs {event?.opponent_name || "TBD"} · {event?.event_date}</p>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-surface p-1">
        {(["manual", "upload"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={"rounded-full py-1.5 text-[11px] font-bold " + (mode === m ? "bg-teal text-background" : "text-muted-foreground")}>
            {m === "manual" ? "Manual Entry" : "Score Sheet Upload"}
          </button>
        ))}
      </div>

      {mode === "upload" && (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
          <Upload size={20} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-xs font-semibold">Upload score sheet (photo or PDF)</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Coming soon — AI will read goals, assists, and PIM, then ask you to confirm each row.
          </p>
          {/* TODO: build phase — use GPT-4o vision to parse score sheet image and pre-populate skater + goalie rows */}
          <button disabled className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-muted-foreground opacity-60">
            <Upload size={12} /> Upload score sheet
          </button>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">FINAL SCORE</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground">Us</p>
            <input inputMode="numeric" value={teamScore}
              onChange={(e) => { setTeamScore(e.target.value); autoResult(e.target.value, oppScore); }}
              className="mt-1 w-full rounded-lg bg-background py-2 text-center text-2xl font-bold" />
          </div>
          <span className="text-muted-foreground">—</span>
          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground">{event?.opponent_name || "Opp"}</p>
            <input inputMode="numeric" value={oppScore}
              onChange={(e) => { setOppScore(e.target.value); autoResult(teamScore, e.target.value); }}
              className="mt-1 w-full rounded-lg bg-background py-2 text-center text-2xl font-bold" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-background p-1 text-[10px] font-bold">
          {(["win","ot_win","so_win","loss","ot_loss","so_loss"] as const).map((r) => (
            <button key={r} onClick={() => setResult(r)}
              className={"rounded-full py-1.5 " + (result === r ? "bg-teal text-background" : "text-muted-foreground")}>
              {r.toUpperCase().replace("_"," ")}
            </button>
          ))}
        </div>
      </div>

      <h4 className="mt-4 text-xs font-bold">Skaters</h4>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-1 text-left">Player</th><th>G</th><th>A</th><th>PTS</th><th>PIM</th><th>+/-</th><th>SOG</th><th>TOI</th></tr>
          </thead>
          <tbody>
            {skaterRoster.map((p) => {
              const s = skaters[p.id] ?? emptySkater();
              const pts = (+s.goals || 0) + (+s.assists || 0);
              const upd = (k: keyof Skater, v: string) => setSkaters({ ...skaters, [p.id]: { ...s, [k]: v } });
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-1 font-semibold">{p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}</td>
                  {(["goals","assists"] as const).map((k) => (
                    <td key={k}><input inputMode="numeric" value={s[k]} onChange={(e) => upd(k, e.target.value)} className="w-11 rounded bg-background px-1 py-1 text-center" /></td>
                  ))}
                  <td className="text-center text-teal font-bold">{pts || ""}</td>
                  {(["pim","pm","sog"] as const).map((k) => (
                    <td key={k}><input inputMode="numeric" value={s[k]} onChange={(e) => upd(k, e.target.value)} className="w-11 rounded bg-background px-1 py-1 text-center" /></td>
                  ))}
                  <td><input value={s.toi} onChange={(e) => upd("toi", e.target.value)} placeholder="12:34" className="w-14 rounded bg-background px-1 py-1 text-center" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {goalieRoster.length > 0 && (
        <>
          <h4 className="mt-4 text-xs font-bold">Goalies</h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-[11px]">
              <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-1 text-left">Goalie</th><th>Saves</th><th>GA</th><th>SV%</th><th>SO</th></tr>
              </thead>
              <tbody>
                {goalieRoster.map((p) => {
                  const g = goalies[p.id] ?? emptyGoalie();
                  const shots = (+g.saves || 0) + (+g.ga || 0);
                  const pct = shots ? ((+g.saves / shots) * 100).toFixed(1) + "%" : "—";
                  const upd = <K extends keyof Goalie>(k: K, v: Goalie[K]) => setGoalies({ ...goalies, [p.id]: { ...g, [k]: v } });
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-1 font-semibold">{p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}</td>
                      <td><input inputMode="numeric" value={g.saves} onChange={(e) => upd("saves", e.target.value)} className="w-14 rounded bg-background px-1 py-1 text-center" /></td>
                      <td><input inputMode="numeric" value={g.ga} onChange={(e) => upd("ga", e.target.value)} className="w-12 rounded bg-background px-1 py-1 text-center" /></td>
                      <td className="text-center text-teal font-bold">{pct}</td>
                      <td className="text-center"><input type="checkbox" checked={g.shutout} onChange={(e) => upd("shutout", e.target.checked)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <button onClick={commit} disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        <Save size={14} /> {saving ? "Saving…" : "Save Game Stats"}
      </button>
    </div>
  );
}
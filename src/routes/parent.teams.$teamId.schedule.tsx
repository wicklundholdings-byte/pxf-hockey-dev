import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitRsvp } from "@/lib/teams.functions";
import { Check, X, HelpCircle, Swords, Dumbbell, Star, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { maskName } from "@/lib/team-stats";

export const Route = createFileRoute("/parent/teams/$teamId/schedule")({
  component: ParentTeamSchedule,
});

type EventRow = {
  id: string;
  event_type: "game" | "practice" | "team_event";
  title: string | null;
  opponent_name: string | null;
  home_away: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
};
type Player = { id: string; display_name: string };
type Duty = { id: string; event_id: string; duty_type: string; notes: string | null };
type GameRes = { team_score: number; opponent_score: number; result: string | null; leader: { name: string; g: number; a: number; pts: number } | null; shutout: { name: string; svpct: string } | null };

const TYPE_META: Record<string, { label: string; icon: typeof Swords; bg: string; color: string }> = {
  game: { label: "GAME", icon: Swords, bg: "bg-red-500/15", color: "text-red-400" },
  practice: { label: "PRACTICE", icon: Dumbbell, bg: "bg-emerald-500/15", color: "text-emerald-400" },
  team_event: { label: "EVENT", icon: Star, bg: "bg-surface-2", color: "text-muted-foreground" },
};

function fmtDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10); const ap = hr >= 12 ? "PM" : "AM"; const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}
function mapsUrl(venue: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

function ParentTeamSchedule() {
  const { teamId } = Route.useParams();
  const rsvp = useServerFn(submitRsvp);
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [responses, setResponses] = useState<Record<string, Record<string, string>>>({}); // eventId -> playerId -> resp
  const [duties, setDuties] = useState<Duty[]>([]);
  const [results, setResults] = useState<Record<string, GameRes>>({});

  useEffect(() => {
    (async () => {
      const { data: evs } = await supabase
        .from("team_events")
        .select("id,event_type,title,opponent_name,home_away,venue,event_date,start_time")
        .eq("team_id", teamId)
        .order("event_date");
      const evList = (evs ?? []) as EventRow[];
      setEvents(evList);

      const gameIds = evList.filter((e) => e.event_type === "game").map((e) => e.id);
      if (gameIds.length) {
        const [{ data: gr }, { data: ps }, { data: gs }, { data: tp }] = await Promise.all([
          supabase.from("game_results").select("event_id,team_score,opponent_score,result").in("event_id", gameIds),
          supabase.from("game_player_stats").select("event_id,team_player_id,goals,assists,points").in("event_id", gameIds),
          supabase.from("game_goalie_stats").select("event_id,team_player_id,shutout,saves,goals_against").in("event_id", gameIds),
          supabase.from("team_players").select("id,display_name").eq("team_id", teamId),
        ]);
        const nameMap = new Map(((tp ?? []) as any[]).map((p) => [p.id, p.display_name as string]));
        const rmap: Record<string, GameRes> = {};
        for (const r of (gr ?? []) as any[]) {
          rmap[r.event_id] = { team_score: r.team_score, opponent_score: r.opponent_score, result: r.result, leader: null, shutout: null };
        }
        const perGame: Record<string, any[]> = {};
        for (const s of (ps ?? []) as any[]) (perGame[s.event_id] ??= []).push(s);
        for (const [eid, rows] of Object.entries(perGame)) {
          if (!rmap[eid]) continue;
          const top = rows.sort((a: any, b: any) => (b.points ?? b.goals + b.assists) - (a.points ?? a.goals + a.assists))[0];
          if (top && (top.points ?? top.goals + top.assists) > 0) {
            rmap[eid].leader = { name: maskName(nameMap.get(top.team_player_id) ?? ""), g: top.goals, a: top.assists, pts: top.points ?? top.goals + top.assists };
          }
        }
        for (const g of (gs ?? []) as any[]) {
          if (!g.shutout || !rmap[g.event_id]) continue;
          const shots = (g.saves ?? 0) + (g.goals_against ?? 0);
          const pct = shots ? "." + Math.round((g.saves / shots) * 1000).toString().padStart(3, "0") : "—";
          rmap[g.event_id].shutout = { name: maskName(nameMap.get(g.team_player_id) ?? ""), svpct: pct };
        }
        setResults(rmap);
      }

      const ids = await (supabase as any).rpc("current_user_contact_ids");
      const contactIds = (ids.data ?? []) as string[];
      if (contactIds.length) {
        const { data: ps } = await supabase
          .from("team_players")
          .select("id,display_name")
          .eq("team_id", teamId)
          .in("parent_contact_id", contactIds);
        const myPlayers = (ps ?? []) as Player[];
        setPlayers(myPlayers);

        if (evList.length && myPlayers.length) {
          const { data: rs } = await supabase
            .from("team_event_rsvps")
            .select("event_id,team_player_id,response")
            .in("event_id", evList.map((e) => e.id))
            .in("team_player_id", myPlayers.map((p) => p.id));
          const map: Record<string, Record<string, string>> = {};
          ((rs ?? []) as { event_id: string; team_player_id: string; response: string }[]).forEach((r) => {
            (map[r.event_id] ??= {})[r.team_player_id] = r.response;
          });
          setResponses(map);
        }

        if (user?.id && evList.length) {
          const { data: dt } = await supabase
            .from("team_duties")
            .select("id,event_id,duty_type,notes")
            .eq("assigned_to_parent_id", user.id)
            .in("event_id", evList.map((e) => e.id));
          setDuties((dt ?? []) as Duty[]);
        }
      }
    })();
  }, [teamId, user?.id]);

  async function respond(eventId: string, playerId: string, r: "yes" | "no" | "maybe") {
    setResponses((prev) => ({ ...prev, [eventId]: { ...(prev[eventId] ?? {}), [playerId]: r } }));
    try { await rsvp({ data: { eventId, teamPlayerId: playerId, response: r } }); }
    catch (e: any) { alert(e?.message); }
  }

  return (
    <div className="px-5 pb-6">
      <h3 className="text-sm font-bold">Upcoming</h3>
      <div className="mt-3 space-y-3">
        {events.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            No upcoming events.
          </p>
        )}
        {events.map((e) => {
          const meta = TYPE_META[e.event_type] ?? TYPE_META.team_event;
          const Icon = meta.icon;
          const res = results[e.id];
          const label = e.event_type === "game"
            ? `${e.home_away === "away" ? "@" : "vs"} ${e.opponent_name || "TBD"}`
            : e.title || meta.label;
          const eventDuties = duties.filter((d) => d.event_id === e.id);
          return (
            <div key={e.id}>
              {eventDuties.map((d) => (
                <div key={d.id} className="mb-1 flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-2.5">
                  <ClipboardList size={14} className="text-amber-400" />
                  <p className="flex-1 text-[11px] font-semibold text-amber-300">
                    You're on duty: <span className="capitalize">{d.duty_type}</span>
                    {d.notes ? ` — ${d.notes}` : ""}
                  </p>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">REMINDER</span>
                </div>
              ))}
              <Link
                {...(e.event_type === "game"
                  ? { to: "/parent/teams/$teamId/game/$eventId" as const, params: { teamId, eventId: e.id } }
                  : { to: "/parent/team/event/$eventId" as const, params: { eventId: e.id } })}
                className="block rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <div className={"grid h-10 w-10 place-items-center rounded-xl " + meta.bg}>
                    <Icon size={16} className={meta.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider " + meta.bg + " " + meta.color}>{meta.label}</span>
                      {res?.result && (
                        <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider " +
                          (res.result === "win" ? "bg-emerald-500/15 text-emerald-400"
                            : res.result === "loss" ? "bg-red-500/15 text-red-400"
                            : res.result.startsWith("ot") ? "bg-teal/15 text-teal"
                            : "bg-surface-2 text-muted-foreground")}>
                          {res.result.toUpperCase().replace("_"," ")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold">{label}</p>
                    {res && (
                      <p className="text-[11px] font-bold">Final: {res.team_score} — {res.opponent_score}</p>
                    )}
                    {res?.leader && (
                      <p className="truncate text-[10px] text-amber-400">⭐ {res.leader.name} — {res.leader.g}G {res.leader.a}A {res.leader.pts}PTS</p>
                    )}
                    {res?.shutout && (
                      <p className="truncate text-[10px] text-teal">🥅 Shutout — {res.shutout.name} {res.shutout.svpct}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(e.event_date)}{e.start_time ? " · " + fmtTime(e.start_time) : ""}{e.venue ? " · " + e.venue : ""}
                    </p>
                  </div>
                </div>
                {e.venue && (
                  <button
                    onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); window.open(mapsUrl(e.venue!), "_blank"); }}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background py-1.5 text-[11px] font-semibold text-muted-foreground"
                  >
                    Open in Google Maps
                  </button>
                )}
              </Link>
              {players.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {players.map((p) => {
                    const r = responses[e.id]?.[p.id];
                    return (
                      <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
                        <p className="flex-1 text-[11px] font-semibold">{p.display_name}</p>
                        {([["yes", Check], ["maybe", HelpCircle], ["no", X]] as const).map(([k, Ic]) => (
                          <button key={k} onClick={() => respond(e.id, p.id, k)}
                            className={"grid h-7 w-7 place-items-center rounded-md " + (r === k ? "bg-teal text-background" : "bg-surface text-muted-foreground")}>
                            <Ic size={12} />
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
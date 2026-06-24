import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Flame, Medal, Trophy } from "lucide-react";
import { TeamEventRow } from "@/components/teams/team-event-row";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parent/team/$teamId")({
  component: ParentTeam,
});

type Event = { id: string; event_type: string; title: string | null; opponent_name: string | null; venue: string | null; event_date: string; start_time: string | null };
type Team = { id: string; name: string; season: string | null };
type LeaderRow = {
  athlete_id: string;
  full_name: string;
  athlete_position: "player" | "goalie";
  sessions_in_window: number;
  sessions_all_time: number;
  current_streak_weeks: number;
  longest_streak_weeks: number;
};

function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const lastInitial = parts[1]?.[0] ? ` ${parts[1][0]}.` : "";
  return first + lastInitial;
}

function ParentTeam() {
  const { teamId } = Route.useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [myAthleteIds, setMyAthleteIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [t, e] = await Promise.all([
        supabase.from("teams").select("id,name,season").eq("id", teamId).maybeSingle(),
        supabase.from("team_events").select("id,event_type,title,opponent_name,venue,event_date,start_time").eq("team_id", teamId).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date"),
      ]);
      setTeam((t.data as Team) ?? null);
      setEvents((e.data ?? []) as Event[]);
    })();
  }, [teamId]);

  useEffect(() => {
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data } = await (supabase as any).rpc("get_team_dryland_leaderboard", {
        _team_id: teamId,
        _since: monthStart.toISOString(),
      });
      const sorted = ((data ?? []) as LeaderRow[]).sort(
        (a, b) => b.sessions_in_window - a.sessions_in_window || b.sessions_all_time - a.sessions_all_time,
      );
      setLeaders(sorted);
    })();
  }, [teamId]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("attendees").select("id").eq("owner_id", user.id);
      setMyAthleteIds(((data ?? []) as { id: string }[]).map((a) => a.id));
    })();
  }, [user?.id]);

  const top = leaders[0];

  return (
    <div className="px-5 pt-4 pb-28">
      <Link to="/parent" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Home</Link>
      <h1 className="mt-2 font-display text-2xl font-bold">{team?.name || "Team"}</h1>
      <p className="text-xs text-muted-foreground">{team?.season}</p>
      <h3 className="mt-5 text-xs font-bold">Upcoming</h3>
      <div className="mt-2 space-y-2">
        {events.length === 0 && <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">No upcoming events.</p>}
        {events.map((e) => (
          <Link key={e.id} to="/parent/team/event/$eventId" params={{ eventId: e.id }}>
            <TeamEventRow event={e} />
          </Link>
        ))}
      </div>

      <h3 className="mt-6 text-xs font-bold">Dryland Leaderboard</h3>
      {top && top.sessions_in_window > 0 && (
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-teal/40 bg-teal/10 p-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/20">
            <Trophy size={18} className="text-teal" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.25em] text-teal">THIS WEEK'S LEADER</p>
            <p className="truncate text-sm font-bold">{myAthleteIds.includes(top.athlete_id) ? top.full_name : maskName(top.full_name)}</p>
          </div>
          <p className="font-display text-lg font-bold text-teal">{top.sessions_in_window}</p>
        </div>
      )}
      <div className="mt-2 space-y-2">
        {leaders.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            No dryland activity yet.
          </p>
        )}
        {leaders.map((l, i) => {
          const mine = myAthleteIds.includes(l.athlete_id);
          const medal = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : null;
          return (
            <div
              key={l.athlete_id}
              className={
                "flex items-center gap-3 rounded-2xl border p-3 " +
                (mine ? "border-teal/60 bg-teal/10" : "border-border bg-surface")
              }
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-xs font-bold">
                {medal ? <Medal size={16} className={medal} /> : <span className="text-muted-foreground">{i + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{mine ? l.full_name : maskName(l.full_name)}</p>
                <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                  {l.athlete_position} · {l.sessions_in_window} this month
                </p>
              </div>
              {l.current_streak_weeks > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                  <Flame size={11} /> {l.current_streak_weeks}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
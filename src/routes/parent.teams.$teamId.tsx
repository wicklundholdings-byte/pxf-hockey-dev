import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Flame, Medal, Trophy, ChevronRight, Calendar, Users, BarChart3, Camera, Swords, Dumbbell, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { loadTeamSeasonStats, type TeamRecord, type SkaterAgg } from "@/lib/team-stats";
import { mockRecord, mockSkaters } from "@/lib/mock-team-stats";

export const Route = createFileRoute("/parent/teams/$teamId")({
  component: TeamLayout,
});

type Team = { id: string; name: string; season: string | null; primary_color: string | null; logo_url: string | null };

type LeaderRow = {
  athlete_id: string;
  full_name: string;
  athlete_position: "player" | "goalie";
  sessions_in_window: number;
  sessions_all_time: number;
  current_streak_weeks: number;
  longest_streak_weeks: number;
};

type UpcomingEvent = {
  id: string;
  event_type: "game" | "practice" | "team_event";
  title: string | null;
  opponent_name: string | null;
  home_away: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
};

const EVENT_META: Record<string, { label: string; icon: typeof Swords; bg: string; color: string }> = {
  game: { label: "GAME", icon: Swords, bg: "bg-red-500/15", color: "text-red-400" },
  practice: { label: "PRACTICE", icon: Dumbbell, bg: "bg-emerald-500/15", color: "text-emerald-400" },
  team_event: { label: "EVENT", icon: Star, bg: "bg-surface-2", color: "text-muted-foreground" },
};

function fmtEventDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtEventTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10); const ap = hr >= 12 ? "PM" : "AM"; const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}

function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  return (parts[0] ?? "") + (parts[1]?.[0] ? ` ${parts[1][0]}.` : "");
}

function TeamLayout() {
  const { teamId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [myAthleteIds, setMyAthleteIds] = useState<string[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [record, setRecord] = useState<TeamRecord | null>(null);
  const [skaters, setSkaters] = useState<SkaterAgg[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("teams")
        .select("id,name,season,primary_color,logo_url")
        .eq("id", teamId)
        .maybeSingle();
      setTeam((data as Team) ?? null);
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

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("team_events")
        .select("id,event_type,title,opponent_name,home_away,venue,event_date,start_time")
        .eq("team_id", teamId)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(3);
      setUpcoming(((data ?? []) as UpcomingEvent[]));
    })();
  }, [teamId]);

  useEffect(() => {
    (async () => {
      const s = await loadTeamSeasonStats(teamId, "all");
      const hasStats = s.skaters && s.skaters.length > 0;
      if (hasStats) {
        setRecord(s.record);
        setSkaters(s.skaters);
      } else {
        setRecord(mockRecord);
        setSkaters(mockSkaters);
      }
    })();
  }, [teamId]);

  const goalsTop3 = useMemo(() => [...skaters].sort((a, b) => b.g - a.g || b.pts - a.pts).slice(0, 3), [skaters]);
  const assistsTop3 = useMemo(() => [...skaters].sort((a, b) => b.a - a.a || b.pts - a.pts).slice(0, 3), [skaters]);
  const pointsTop3 = useMemo(() => [...skaters].sort((a, b) => b.pts - a.pts || b.g - a.g).slice(0, 3), [skaters]);

  const top3 = leaders.slice(0, 3);
  const myRowIdx = leaders.findIndex((l) => myAthleteIds.includes(l.athlete_id));
  const myRow = myRowIdx >= 0 ? leaders[myRowIdx] : null;
  const myOutsideTop3 = myRow && myRowIdx >= 3;

  const base = `/parent/teams/${teamId}`;
  const isOverview = pathname === base || pathname === base + "/";

  return (
    <div>
      <div className="px-5 pt-4">
        {isOverview ? (
          <Link to="/parent/teams" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> Teams
          </Link>
        ) : (
          <Link to="/parent/teams/$teamId" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> {team?.name || "Team"}
          </Link>
        )}
        <div className="mt-2 flex items-center gap-3">
          {team?.logo_url ? (
            <img src={team.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
          ) : (
            <div
              className="grid h-11 w-11 place-items-center rounded-xl text-xs font-bold text-background"
              style={{ background: team?.primary_color || "var(--color-teal)" }}
            >
              {team?.name?.slice(0, 2).toUpperCase() || "—"}
            </div>
          )}
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">{team?.name || "Team"}</h2>
            <p className="text-[11px] text-muted-foreground">{team?.season || ""}</p>
          </div>
        </div>

        {isOverview && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { to: "/parent/teams/$teamId/schedule" as const, label: "Schedule", Icon: Calendar },
            { to: "/parent/teams/$teamId/roster" as const, label: "Roster", Icon: Users },
            { to: "/parent/teams/$teamId/stats" as const, label: "Stats", Icon: BarChart3 },
            { to: "/parent/teams/$teamId/media" as const, label: "Media", Icon: Camera },
          ].map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              params={{ teamId }}
              className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal active:opacity-90"
            >
              <Icon size={18} className="text-background" />
              <span className="text-sm font-bold text-background">{label}</span>
            </Link>
          ))}
        </div>
        )}

        {isOverview && (
          <section className="mt-4">
            <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">SEASON RECORD</p>
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-4">
              <RecordStat label="Wins" value={record?.w ?? 0} accent="text-emerald-400" />
              <RecordStat label="Losses" value={record?.l ?? 0} accent="text-red-400" />
              <RecordStat label="OT" value={(record?.otl ?? 0) + (record?.sol ?? 0) + (record?.otw ?? 0) + (record?.sow ?? 0)} accent="text-teal" />
            </div>
          </section>
        )}

        {isOverview && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-teal" />
              <p className="text-[10px] font-bold tracking-[0.25em] text-teal">UPCOMING</p>
            </div>
            <Link to="/parent/teams/$teamId/schedule" params={{ teamId }} className="flex items-center gap-0.5 text-[10px] font-bold text-teal">
              View all <ChevronRight size={11} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">No upcoming events</p>
          ) : (
            <div className="mt-3 space-y-2">
              {upcoming.map((e) => {
                const meta = EVENT_META[e.event_type] ?? EVENT_META.team_event;
                const Icon = meta.icon;
                const title = e.event_type === "game"
                  ? `${e.home_away === "away" ? "@ " : "vs "}${e.opponent_name ?? "TBD"}`
                  : e.title || meta.label;
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-2.5">
                    <div className={"grid h-9 w-9 place-items-center rounded-lg " + meta.bg}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {fmtEventDate(e.event_date)}{e.start_time ? ` · ${fmtEventTime(e.start_time)}` : ""}{e.venue ? ` · ${e.venue}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {isOverview && (
          <section className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">TEAM STATS</p>
              <Link to="/parent/teams/$teamId/stats" params={{ teamId }} className="text-[11px] font-bold text-teal">View Full Stats ›</Link>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <LeaderboardColumn title="GOALS" rows={goalsTop3} statKey="g" />
              <LeaderboardColumn title="ASSISTS" rows={assistsTop3} statKey="a" />
              <LeaderboardColumn title="POINTS" rows={pointsTop3} statKey="pts" />
            </div>
          </section>
        )}

        {isOverview && leaders.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-teal" />
                <p className="text-[10px] font-bold tracking-[0.25em] text-teal">DRYLAND LEADERBOARD</p>
              </div>
              <p className="text-[10px] text-muted-foreground">This month</p>
            </div>
            <div className="mt-3 space-y-2">
              {top3.map((l, i) => {
                const mine = myAthleteIds.includes(l.athlete_id);
                const medalColor = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-orange-400";
                return (
                  <div
                    key={l.athlete_id}
                    className={
                      "flex items-center gap-3 rounded-xl border p-2.5 " +
                      (mine ? "border-teal/60 bg-teal/10" : "border-border bg-surface-2")
                    }
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-background">
                      <Medal size={16} className={medalColor} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{mine ? l.full_name : maskName(l.full_name)}</p>
                      <p className="text-[10px] text-muted-foreground">{l.sessions_in_window} sessions</p>
                    </div>
                    {l.current_streak_weeks > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                        <Flame size={11} /> {l.current_streak_weeks}
                      </span>
                    )}
                  </div>
                );
              })}
              {myOutsideTop3 && myRow && (
                <>
                  <p className="px-1 pt-1 text-[10px] font-bold tracking-[0.25em] text-muted-foreground">YOUR ATHLETE</p>
                  <div className="flex items-center gap-3 rounded-xl border border-teal/60 bg-teal/10 p-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-background text-[11px] font-bold text-muted-foreground">
                      {myRowIdx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{myRow.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{myRow.sessions_in_window} sessions</p>
                    </div>
                    {myRow.current_streak_weeks > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                        <Flame size={11} /> {myRow.current_streak_weeks}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <Link
              to="/parent/teams/$teamId/leaderboard"
              params={{ teamId }}
              className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-border bg-surface-2 py-2 text-[11px] font-bold text-teal"
            >
              View Full Leaderboard <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>
      <div id="team-tab-content" className="mt-3 scroll-mt-4">
        <Outlet />
      </div>
    </div>
  );
}

function RecordStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center">
      <p className={"font-display text-3xl font-bold " + accent}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
    </div>
  );
}

function LeaderboardColumn({ title, rows, statKey }: { title: string; rows: SkaterAgg[]; statKey: "g" | "a" | "pts" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-2">
      <p className="mb-1.5 text-center text-[9px] font-bold tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {rows.map((r, i) => {
          const isFirst = i === 0;
          const rank = i + 1;
          const lastName = r.display_name.trim().split(/\s+/).pop() ?? r.display_name;
          return (
            <div
              key={r.team_player_id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] ${isFirst ? "bg-teal/10" : ""}`}
            >
              <span className={`w-4 text-center font-bold ${isFirst ? "text-teal" : "text-muted-foreground"}`}>#{rank}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{lastName}</span>
              <span className="shrink-0 font-bold tabular-nums">{r[statKey]}</span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-2 text-center text-[10px] text-muted-foreground">No data</p>
        )}
      </div>
    </div>
  );
}
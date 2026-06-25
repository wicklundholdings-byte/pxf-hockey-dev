import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Flame, Medal, Trophy, ChevronRight, Calendar, Users, BarChart3, Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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

  const top3 = leaders.slice(0, 3);
  const myRowIdx = leaders.findIndex((l) => myAthleteIds.includes(l.athlete_id));
  const myRow = myRowIdx >= 0 ? leaders[myRowIdx] : null;
  const myOutsideTop3 = myRow && myRowIdx >= 3;

  const tabs = [
    { to: "/parent/teams/$teamId/schedule", label: "Schedule" },
    { to: "/parent/teams/$teamId/roster", label: "Roster" },
    { to: "/parent/teams/$teamId/media", label: "Media" },
    { to: "/parent/teams/$teamId/stats", label: "Stats" },
    { to: "/parent/teams/$teamId/messages", label: "Messages" },
  ];
  const base = `/parent/teams/${teamId}`;
  const isOverview = pathname === base || pathname === base + "/";

  return (
    <div>
      <div className="px-5 pt-4">
        <Link to="/parent/teams" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft size={14} /> Teams
        </Link>
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

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/parent/teams/$teamId/schedule" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <Calendar size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Schedule</span>
          </Link>
          <Link to="/parent/teams/$teamId/roster" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <Users size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Roster</span>
          </Link>
          <Link to="/parent/teams/$teamId/stats" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <BarChart3 size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Stats</span>
          </Link>
          <Link to="/parent/teams/$teamId/media" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <Camera size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Media</span>
          </Link>
        </div>

        {leaders.length > 0 && (
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

        <div className="mt-3 grid grid-cols-5 gap-1 rounded-full border border-border bg-surface p-1">
          {tabs.map((t) => {
            const path = t.to.replace("$teamId", teamId);
            const active = pathname === path || pathname.startsWith(path + "/") || (isOverview && t.label === "Schedule");
            return (
              <Link
                key={t.to}
                to={t.to}
                params={{ teamId }}
                className={"rounded-full py-1.5 text-center text-[11px] font-bold tracking-wide " + (active ? "bg-teal text-background" : "text-muted-foreground")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mt-3">
        <Outlet />
      </div>
    </div>
  );
}
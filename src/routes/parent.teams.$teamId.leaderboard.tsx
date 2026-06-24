import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Flame, Medal, Shield, User } from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/leaderboard")({
  head: () => ({ meta: [{ title: "Dryland Leaderboard — PXF Hockey" }] }),
  component: TeamLeaderboard,
});

type Row = {
  athlete_id: string;
  full_name: string;
  athlete_position: "player" | "goalie";
  sessions_in_window: number;
  sessions_all_time: number;
  current_streak_weeks: number;
  longest_streak_weeks: number;
};

type Filter = "week" | "month" | "all";

function sinceFor(f: Filter): string {
  const d = new Date();
  if (f === "week") {
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
  } else if (f === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    return new Date(0).toISOString();
  }
  return d.toISOString();
}

function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  return (parts[0] ?? "") + (parts[1]?.[0] ? ` ${parts[1][0]}.` : "");
}

function TeamLeaderboard() {
  const { teamId } = Route.useParams();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("month");
  const [rows, setRows] = useState<Row[]>([]);
  const [myAthleteIds, setMyAthleteIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("get_team_dryland_leaderboard", {
        _team_id: teamId,
        _since: sinceFor(filter),
      });
      setRows((data ?? []) as Row[]);
    })();
  }, [teamId, filter]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("attendees").select("id").eq("owner_id", user.id);
      setMyAthleteIds(((data ?? []) as { id: string }[]).map((a) => a.id));
    })();
  }, [user?.id]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => b.sessions_in_window - a.sessions_in_window || b.sessions_all_time - a.sessions_all_time,
      ),
    [rows],
  );
  const active = sorted.filter((r) => r.sessions_in_window > 0);
  const inactive = sorted.filter((r) => r.sessions_in_window === 0);

  return (
    <div className="px-5 pb-28 pt-2">
      <h2 className="font-display text-xl font-bold">Dryland Leaderboard</h2>
      <div className="mt-3 flex gap-1 rounded-full border border-border bg-surface p-1">
        {([
          ["week", "This Week"],
          ["month", "This Month"],
          ["all", "All Time"],
        ] as [Filter, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={
              "flex-1 rounded-full py-1.5 text-[10px] font-bold tracking-wide " +
              (filter === k ? "bg-teal text-background" : "text-muted-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {active.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            No completed dryland sessions in this period.
          </p>
        )}
        {active.map((r, i) => (
          <LbRow key={r.athlete_id} row={r} rank={i + 1} mine={myAthleteIds.includes(r.athlete_id)} teamId={teamId} />
        ))}
      </div>

      {inactive.length > 0 && (
        <>
          <p className="mt-5 text-[11px] font-bold tracking-[0.25em] text-muted-foreground">NO ACTIVITY</p>
          <div className="mt-2 space-y-2">
            {inactive.map((r) => (
              <LbRow key={r.athlete_id} row={r} rank={null} inactive mine={myAthleteIds.includes(r.athlete_id)} teamId={teamId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LbRow({
  row,
  rank,
  inactive,
  mine,
  teamId,
}: {
  row: Row;
  rank: number | null;
  inactive?: boolean;
  mine: boolean;
  teamId: string;
}) {
  const medal = rank === 1 ? "text-amber-400" : rank === 2 ? "text-slate-300" : rank === 3 ? "text-orange-400" : null;
  const display = mine ? row.full_name : maskName(row.full_name);
  const PosIcon = row.athlete_position === "goalie" ? Shield : User;
  return (
    <Link
      to="/parent/teams/$teamId/leaderboard/$athleteId"
      params={{ teamId, athleteId: row.athlete_id }}
      className={
        "flex items-center gap-3 rounded-2xl border p-3 " +
        (mine ? "border-teal/60 bg-teal/10" : "border-border bg-surface")
      }
    >
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-xs font-bold">
        {medal ? <Medal size={16} className={medal} /> : <span className="text-muted-foreground">{rank ?? "—"}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{display}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] capitalize text-muted-foreground">
          <PosIcon size={11} /> {row.athlete_position} · {row.sessions_in_window} this period · {row.sessions_all_time} all-time
        </p>
      </div>
      {row.current_streak_weeks > 0 && (
        <span className="flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
          <Flame size={11} /> {row.current_streak_weeks}
        </span>
      )}
      {inactive && (
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-bold text-muted-foreground">No activity</span>
      )}
      <ChevronRight size={14} className="text-muted-foreground" />
    </Link>
  );
}
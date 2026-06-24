import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flame, Medal, Trophy, Bell, X, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/dryland")({
  component: TeamDrylandTab,
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
    const diff = (day + 6) % 7; // Monday start
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

function TeamDrylandTab() {
  const { teamId } = Route.useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("month");
  const [rows, setRows] = useState<Row[]>([]);
  const [openAthlete, setOpenAthlete] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_team_dryland_leaderboard", {
        _team_id: teamId,
        _since: sinceFor(filter),
      });
      if (error) {
        toast.error("Couldn't load leaderboard");
        setRows([]);
        return;
      }
      setRows((data ?? []) as Row[]);
    })();
  }, [teamId, filter]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (b.sessions_in_window !== a.sessions_in_window) return b.sessions_in_window - a.sessions_in_window;
        return b.sessions_all_time - a.sessions_all_time;
      }),
    [rows],
  );

  const active = sorted.filter((r) => r.sessions_in_window > 0);
  const inactive = sorted.filter((r) => r.sessions_in_window === 0);

  const sendNudge = async (athlete: Row) => {
    // TODO: dispatch in-app notification to the linked parent
    toast.success(`Nudge sent to ${athlete.full_name.split(" ")[0]}`);
  };

  return (
    <div className="pb-10">
      <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
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
            No completed dryland sessions yet.
          </p>
        )}
        {active.map((r, i) => (
          <LeaderRow key={r.athlete_id} row={r} rank={i + 1} onTap={() => setOpenAthlete(r)} onNudge={() => sendNudge(r)} />
        ))}
      </div>

      {inactive.length > 0 && (
        <>
          <p className="mt-5 text-[11px] font-bold tracking-[0.25em] text-muted-foreground">NO ACTIVITY</p>
          <div className="mt-2 space-y-2">
            {inactive.map((r) => (
              <LeaderRow key={r.athlete_id} row={r} rank={null} inactive onTap={() => setOpenAthlete(r)} onNudge={() => sendNudge(r)} />
            ))}
          </div>
        </>
      )}

      {openAthlete && (
        <AthleteActivitySheet athlete={openAthlete} onClose={() => setOpenAthlete(null)} />
      )}
    </div>
  );
}

function LeaderRow({
  row,
  rank,
  inactive,
  onTap,
  onNudge,
}: {
  row: Row;
  rank: number | null;
  inactive?: boolean;
  onTap: () => void;
  onNudge: () => void;
}) {
  const medal = rank === 1 ? "text-amber-400" : rank === 2 ? "text-slate-300" : rank === 3 ? "text-orange-400" : null;
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3">
      <button onClick={onTap} className="flex flex-1 items-center gap-3 text-left">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-xs font-bold">
          {medal ? <Medal size={18} className={medal} /> : <span className="text-muted-foreground">{rank ?? "—"}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{row.full_name}</p>
          <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
            {row.athlete_position} · {row.sessions_in_window} this period · {row.sessions_all_time} all-time
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
      </button>
      <button
        onClick={onNudge}
        title="Send nudge"
        className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-2 text-teal"
      >
        <Bell size={13} />
      </button>
    </div>
  );
}

function AthleteActivitySheet({ athlete, onClose }: { athlete: Row; onClose: () => void }) {
  const [log, setLog] = useState<Array<{ id: string; last_watched_at: string; title: string; category: string; duration_minutes: number }>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("dryland_watch_progress")
        .select("id,last_watched_at,dryland_videos(title,category,duration_minutes)")
        .eq("athlete_id", athlete.athlete_id)
        .eq("completed", true)
        .order("last_watched_at", { ascending: false })
        .limit(50);
      setLog(
        ((data as any[]) ?? []).map((r) => ({
          id: r.id,
          last_watched_at: r.last_watched_at,
          title: r.dryland_videos?.title ?? "Session",
          category: r.dryland_videos?.category ?? "",
          duration_minutes: r.dryland_videos?.duration_minutes ?? 0,
        })),
      );
    })();
  }, [athlete.athlete_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70" onClick={onClose}>
      <div
        className="w-full max-w-[480px] mx-auto rounded-t-3xl border-t border-border bg-surface p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">DRYLAND ACTIVITY</p>
            <h3 className="mt-0.5 text-base font-bold">{athlete.full_name}</h3>
            <p className="text-[11px] text-muted-foreground">
              Streak {athlete.current_streak_weeks}w · Longest {athlete.longest_streak_weeks}w · {athlete.sessions_all_time} all-time
            </p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2">
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
          {log.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface-2 p-4 text-center text-xs text-muted-foreground">
              No completed sessions yet.
            </p>
          )}
          {log.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
              <Trophy size={14} className="text-teal" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{l.title}</p>
                <p className="text-[11px] capitalize text-muted-foreground">
                  {l.category.replace(/_/g, " ")} · {l.duration_minutes}m · {new Date(l.last_watched_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
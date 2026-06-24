import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dumbbell, ChevronRight, Trophy, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function DrylandActivityCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, topName: "—", topCount: 0, zeroCount: 0, firstTeamId: null as string | null });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: teams } = await supabase.from("teams").select("id").eq("coach_id", user.id);
      const teamIds = ((teams ?? []) as { id: string }[]).map((t) => t.id);
      if (teamIds.length === 0) return;

      const weekStart = new Date();
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - ((day + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);

      // Per-team leaderboards aggregated
      const results = await Promise.all(
        teamIds.map((tid) =>
          (supabase as any).rpc("get_team_dryland_leaderboard", { _team_id: tid, _since: weekStart.toISOString() }),
        ),
      );

      const rowMap = new Map<string, { name: string; count: number }>();
      let total = 0;
      let zeros = 0;
      results.forEach((r: any) => {
        ((r?.data ?? []) as Array<{ athlete_id: string; full_name: string; sessions_in_window: number }>).forEach((row) => {
          total += row.sessions_in_window;
          if (row.sessions_in_window === 0) zeros++;
          const prev = rowMap.get(row.athlete_id);
          if (!prev || prev.count < row.sessions_in_window) {
            rowMap.set(row.athlete_id, { name: row.full_name, count: row.sessions_in_window });
          }
        });
      });
      let topName = "—";
      let topCount = 0;
      rowMap.forEach((v) => {
        if (v.count > topCount) {
          topCount = v.count;
          topName = v.name;
        }
      });
      setStats({ total, topName, topCount, zeroCount: zeros, firstTeamId: teamIds[0] });
    })();
  }, [user?.id]);

  if (!stats.firstTeamId) return null;

  return (
    <Link
      to="/coach/teams/$teamId/dryland"
      params={{ teamId: stats.firstTeamId }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15">
        <Dumbbell size={18} className="text-teal" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold">Dryland this week</p>
        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{stats.total} sessions</span>
          <span className="inline-flex items-center gap-1"><Trophy size={10} className="text-amber-400" /> {stats.topName.split(" ")[0]} ({stats.topCount})</span>
          <span className="inline-flex items-center gap-1"><UserX size={10} /> {stats.zeroCount} idle</span>
        </p>
      </div>
      <ChevronRight size={14} className="text-muted-foreground" />
    </Link>
  );
}
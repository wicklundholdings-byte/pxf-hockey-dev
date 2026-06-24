import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Users } from "lucide-react";

export const Route = createFileRoute("/parent/teams/")({
  head: () => ({ meta: [{ title: "Teams — PXF Hockey" }] }),
  component: ParentTeamsIndex,
});

type TeamCard = {
  id: string;
  name: string;
  season: string | null;
  logo_url: string | null;
  primary_color: string | null;
  coach_name: string | null;
  player_count: number;
};

function ParentTeamsIndex() {
  const [teams, setTeams] = useState<TeamCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ids = await (supabase as any).rpc("current_user_contact_ids");
      const contactIds = (ids.data ?? []) as string[];
      if (!contactIds.length) {
        setTeams([]);
        setLoading(false);
        return;
      }
      const { data: tps } = await supabase
        .from("team_players")
        .select("team_id")
        .in("parent_contact_id", contactIds);
      const teamIds = Array.from(new Set(((tps ?? []) as { team_id: string }[]).map((r) => r.team_id)));
      if (!teamIds.length) {
        setTeams([]);
        setLoading(false);
        return;
      }
      const { data: ts } = await supabase
        .from("teams")
        .select("id,name,season,logo_url,primary_color,coach_id")
        .in("id", teamIds);
      const rows = (ts ?? []) as { id: string; name: string; season: string | null; logo_url: string | null; primary_color: string | null; coach_id: string }[];
      const coachIds = Array.from(new Set(rows.map((r) => r.coach_id)));
      const [{ data: coaches }, { data: counts }] = await Promise.all([
        coachIds.length
          ? supabase.from("profiles").select("id,full_name").in("id", coachIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        supabase.from("team_players").select("team_id").in("team_id", teamIds),
      ]);
      const coachMap = new Map(((coaches ?? []) as { id: string; full_name: string | null }[]).map((c) => [c.id, c.full_name]));
      const countMap = new Map<string, number>();
      ((counts ?? []) as { team_id: string }[]).forEach((r) => {
        countMap.set(r.team_id, (countMap.get(r.team_id) ?? 0) + 1);
      });
      setTeams(rows.map((r) => ({
        id: r.id,
        name: r.name,
        season: r.season,
        logo_url: r.logo_url,
        primary_color: r.primary_color,
        coach_name: coachMap.get(r.coach_id) ?? null,
        player_count: countMap.get(r.id) ?? 0,
      })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-5 pt-4 pb-4">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">TEAMS</p>
      <h2 className="mt-1 font-display text-2xl font-bold">Your teams</h2>
      <div className="mt-4 space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && teams.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <Users className="mx-auto mb-2 text-muted-foreground" size={28} />
            <p className="text-sm font-semibold">No teams yet</p>
            <p className="mt-1 text-xs text-muted-foreground">When your athlete is added to a team you'll see it here.</p>
          </div>
        )}
        {teams.map((t) => (
          <Link
            key={t.id}
            to="/parent/teams/$teamId"
            params={{ teamId: t.id }}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {t.logo_url ? (
                <img src={t.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl text-xs font-bold text-background"
                  style={{ background: t.primary_color || "var(--color-teal)" }}
                >
                  {t.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[t.season, t.coach_name ? `Coach ${t.coach_name}` : null, `${t.player_count} players`].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/")({
  component: TeamsIndex,
});

type Team = { id: string; name: string; season: string | null; division: string | null; age_group: string | null; primary_color: string | null };

function TeamsIndex() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("teams").select("id,name,season,division,age_group,primary_color").order("created_at", { ascending: false });
      setTeams((data ?? []) as Team[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="-mx-5 -mt-2">
      <div className="flex items-center justify-between px-5 pb-3 pt-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">TEAMS</p>
          <h2 className="mt-1 font-display text-xl font-bold">Your teams</h2>
        </div>
        <Link to="/coach/teams/new" className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
          <Plus size={12} /> New team
        </Link>
      </div>
      <div className="space-y-2 px-5">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && teams.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <Users className="mx-auto mb-2 text-muted-foreground" size={28} />
            <p className="text-sm font-semibold">No teams yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Create your first team to start scheduling games, practices, and managing roster.</p>
            <Link to="/coach/teams/new" className="mt-3 inline-flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-background">
              <Plus size={12} /> Create team
            </Link>
          </div>
        )}
        {teams.map((t) => (
          <Link
            key={t.id}
            to="/coach/teams/$teamId"
            params={{ teamId: t.id }}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl text-xs font-bold text-background"
                style={{ background: t.primary_color || "var(--color-teal)" }}
              >
                {t.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[t.season, t.division, t.age_group].filter(Boolean).join(" · ") || "—"}
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
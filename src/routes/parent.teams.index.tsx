import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Users, Building2, Search, MapPin } from "lucide-react";
import { listMyHockeySchools } from "@/lib/hockey-schools.functions";

export const Route = createFileRoute("/parent/teams/")({
  head: () => ({ meta: [{ title: "My Clubs — PXF Hockey" }] }),
  component: ParentTeamsIndex,
});

type TeamCard = {
  id: string;
  name: string;
  season: string | null;
  age_group: string | null;
  logo_url: string | null;
  primary_color: string | null;
  role: string | null;
  player_count: number;
};
type School = { owner_id: string; name: string; head_coach: string | null; location: string | null };

function ParentTeamsIndex() {
  const [teams, setTeams] = useState<TeamCard[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchSchools = useServerFn(listMyHockeySchools);

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
        .select("team_id, position")
        .in("parent_contact_id", contactIds);
      const tpRows = ((tps ?? []) as { team_id: string; position: string | null }[]);
      const teamIds = Array.from(new Set(tpRows.map((r) => r.team_id)));
      const roleByTeam = new Map<string, string | null>();
      tpRows.forEach((r) => { if (!roleByTeam.has(r.team_id)) roleByTeam.set(r.team_id, r.position); });
      let rows: { id: string; name: string; season: string | null; age_group: string | null; logo_url: string | null; primary_color: string | null }[] = [];
      if (teamIds.length) {
        const { data: ts } = await supabase
          .from("teams")
          .select("id,name,season,age_group,logo_url,primary_color")
          .in("id", teamIds);
        rows = (ts ?? []) as typeof rows;
      }
      let countMap = new Map<string, number>();
      if (teamIds.length) {
        const { data: counts } = await supabase.from("team_players").select("team_id").in("team_id", teamIds);
        ((counts ?? []) as { team_id: string }[]).forEach((r) => {
          countMap.set(r.team_id, (countMap.get(r.team_id) ?? 0) + 1);
        });
      }
      setTeams(rows.map((r) => ({
        id: r.id,
        name: r.name,
        season: r.season,
        age_group: r.age_group,
        logo_url: r.logo_url,
        primary_color: r.primary_color,
        role: roleByTeam.get(r.id) ?? null,
        player_count: countMap.get(r.id) ?? 0,
      })));
      try {
        const s = await fetchSchools();
        setSchools(s as School[]);
      } catch {
        setSchools([]);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-5 pt-4 pb-4 space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">MY CLUBS</p>
        <h2 className="mt-1 font-display text-2xl font-bold">My Teams</h2>
        <div className="mt-3 space-y-2">
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
                    {[t.season, t.age_group].filter(Boolean).join(" · ") || `${t.player_count} players`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.role && (
                  <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal">
                    {t.role}
                  </span>
                )}
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold">My Hockey Schools</h2>
        <div className="mt-3 space-y-2">
          {!loading && schools.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
              <Building2 className="mx-auto mb-2 text-muted-foreground" size={28} />
              <p className="text-sm font-semibold">No hockey schools yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Find a hockey school below to register for camps and book privates.</p>
            </div>
          )}
          {schools.map((s) => (
            <Link
              key={s.owner_id}
              to="/parent/hockey-school/$ownerId"
              params={{ ownerId: s.owner_id }}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-teal to-emerald-500 text-background">
                  <Building2 size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[s.head_coach ? `Coach ${s.head_coach}` : null, s.location].filter(Boolean).join(" · ") || "Hockey school"}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          ))}
          <Link
            to="/parent/hockey-schools/browse"
            className="mt-2 flex items-center justify-center gap-2 rounded-full border border-teal/40 bg-teal/10 px-4 py-3 text-sm font-semibold text-teal"
          >
            <Search size={16} />
            Find a Hockey School
          </Link>
        </div>
      </div>
    </div>
  );
}
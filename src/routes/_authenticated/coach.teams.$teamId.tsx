import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId")({
  component: TeamLayout,
});

type Team = { id: string; name: string; season: string | null; primary_color: string | null };

function TeamLayout() {
  const { teamId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("teams").select("id,name,season,primary_color").eq("id", teamId).maybeSingle();
      setTeam((data as Team) ?? null);
    })();
  }, [teamId]);

  const base = `/coach/teams/${teamId}`;
  const isOverview = pathname === base || pathname === base + "/";
  const tabs: { to: any; label: string; match: (p: string) => boolean }[] = [
    { to: "/coach/teams/$teamId", label: "Overview", match: (p) => p === base || p === base + "/" },
    { to: "/coach/teams/$teamId/schedule", label: "Schedule", match: (p) => p.startsWith(base + "/schedule") },
    { to: "/coach/teams/$teamId/roster", label: "Roster", match: (p) => p.startsWith(base + "/roster") },
    { to: "/coach/teams/$teamId/stats", label: "Stats", match: (p) => p.startsWith(base + "/stats") },
    { to: "/coach/teams/$teamId/more", label: "More", match: (p) => p.startsWith(base + "/more") },
  ];

  return (
    <div className="-mx-5 -mt-2">
      <div className="px-5 pt-2">
        {isOverview ? (
          <Link to="/coach/teams" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> All teams
          </Link>
        ) : (
          <Link to="/coach/teams/$teamId" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> {team?.name || "Team"}
          </Link>
        )}
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl text-xs font-bold text-background" style={{ background: team?.primary_color || "var(--color-teal)" }}>
            {team?.name?.slice(0, 2).toUpperCase() || "—"}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">{team?.name || "Team"}</h2>
            <p className="text-[11px] text-muted-foreground">{team?.season || ""}</p>
          </div>
        </div>
      </div>
      <div className="sticky top-0 z-30 mt-3 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto px-5 no-scrollbar">
          {tabs.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.label}
                to={t.to}
                params={{ teamId } as any}
                className={
                  "shrink-0 border-b-2 px-3 py-3 text-sm font-bold transition-colors " +
                  (active ? "border-teal text-teal" : "border-transparent text-muted-foreground")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div id="team-tab-content" className="mt-3 px-5 scroll-mt-4">
        <Outlet />
      </div>
    </div>
  );
}
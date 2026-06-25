import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Users, BarChart3, Camera } from "lucide-react";

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

  const tabs = [
    { to: "/coach/teams/$teamId/schedule", label: "Schedule" },
    { to: "/coach/teams/$teamId/roster", label: "Roster" },
    { to: "/coach/teams/$teamId/dryland", label: "Dryland" },
    { to: "/coach/teams/$teamId/playbook", label: "Playbook" },
    { to: "/coach/teams/$teamId/stats", label: "Stats" },
    { to: "/coach/teams/$teamId/messages", label: "Messages" },
  ];

  const isOverview = pathname === `/coach/teams/${teamId}` || pathname === `/coach/teams/${teamId}/`;

  return (
    <div className="-mx-5 -mt-2">
      <div className="px-5 pt-2">
        <Link to="/coach/teams" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft size={14} /> All teams
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl text-xs font-bold text-background" style={{ background: team?.primary_color || "var(--color-teal)" }}>
            {team?.name?.slice(0, 2).toUpperCase() || "—"}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">{team?.name || "Team"}</h2>
            <p className="text-[11px] text-muted-foreground">{team?.season || ""}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/coach/teams/$teamId/schedule" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <Calendar size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Schedule</span>
          </Link>
          <Link to="/coach/teams/$teamId/roster" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <Users size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Roster</span>
          </Link>
          <Link to="/coach/teams/$teamId/stats" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <BarChart3 size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Stats</span>
          </Link>
          <Link to="/coach/teams/$teamId/playbook" params={{ teamId }} className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 shadow-glow-teal">
            <Camera size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Media</span>
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1 rounded-full border border-border bg-surface p-1">
          {tabs.map((t) => {
            const path = t.to.replace("$teamId", teamId);
            const active = pathname === path || pathname.startsWith(path + "/") || (isOverview && t.label === "Schedule");
            return (
              <Link
                key={t.to}
                to={t.to}
                params={{ teamId }}
                className={"rounded-full py-1.5 text-center text-[10px] font-bold tracking-wide " + (active ? "bg-teal text-background" : "text-muted-foreground")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mt-3 px-5">
        <Outlet />
      </div>
    </div>
  );
}
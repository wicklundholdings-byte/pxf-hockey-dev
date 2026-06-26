import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Users, BarChart3, Camera, DollarSign } from "lucide-react";

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
        {isOverview && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { to: "/coach/teams/$teamId/schedule" as const, label: "Schedule", Icon: Calendar },
            { to: "/coach/teams/$teamId/roster" as const, label: "Roster", Icon: Users },
            { to: "/coach/teams/$teamId/stats" as const, label: "Stats", Icon: BarChart3 },
            { to: "/coach/teams/$teamId/playbook" as const, label: "Media", Icon: Camera },
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
          <Link
            to="/coach/teams/$teamId/payments"
            params={{ teamId }}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal py-3 active:opacity-90"
          >
            <DollarSign size={18} className="text-background" />
            <span className="text-sm font-bold text-background">Payments</span>
          </Link>
        )}
      </div>
      <div id="team-tab-content" className="mt-3 px-5 scroll-mt-4">
        <Outlet />
      </div>
    </div>
  );
}
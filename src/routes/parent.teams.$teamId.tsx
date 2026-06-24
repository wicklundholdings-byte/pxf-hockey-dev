import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId")({
  component: TeamLayout,
});

type Team = { id: string; name: string; season: string | null; primary_color: string | null; logo_url: string | null };

function TeamLayout() {
  const { teamId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [team, setTeam] = useState<Team | null>(null);

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

  const tabs = [
    { to: "/parent/teams/$teamId/schedule", label: "Schedule" },
    { to: "/parent/teams/$teamId/roster", label: "Roster" },
    { to: "/parent/teams/$teamId/media", label: "Media" },
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
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-full border border-border bg-surface p-1">
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
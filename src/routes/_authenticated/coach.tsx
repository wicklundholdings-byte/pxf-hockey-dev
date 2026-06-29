import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, CalendarDays, MessageSquare, Megaphone, Settings, BookOpen, Users, Camera } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { TrialBanner } from "@/components/trial-banner";
import { DevTierSwitcher } from "@/components/tier-gate";
import { getUserAppRole } from "@/lib/user-role";
import { StandaloneRecorder } from "@/routes/_authenticated/coach.film";
import { useEliteRole } from "@/hooks/use-elite-role";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/coach")({
  ssr: false,
  beforeLoad: async () => {
    const { data: s } = await supabase.auth.getSession();
    const user = s.session?.user;
    if (!user) throw redirect({ to: "/auth", search: { mode: "login", redirect: "/coach" } });
    const role = await getUserAppRole(user.id);
    if (role !== "coach") throw redirect({ to: "/parent" });
  },
  component: CoachLayout,
});

function CoachLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [recorderOpen, setRecorderOpen] = useState(false);
  const { role } = useEliteRole();
  const baseNav = [
    { to: "/coach", label: "Dashboard", icon: LayoutDashboard, exact: true, match: ["/coach"] },
    { to: "/coach/camps", label: "Events", icon: CalendarDays, match: ["/coach/camps", "/coach/bookings"] },
    { to: "/coach/teams", label: "Teams", icon: Users, match: ["/coach/teams"] },
    { to: "/coach/playbook", label: "Playbook", icon: BookOpen, match: ["/coach/playbook"] },
    { to: "/coach/inbox", label: "Inbox", icon: MessageSquare, match: ["/coach/inbox", "/coach/broadcast"] },
  ];
  // Staff coaches cannot see camp management at all.
  const navItems = role === "staff" ? baseNav.filter((n) => n.to !== "/coach/camps") : baseNav;
  const hideChrome = pathname === "/coach/plans";

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-4 pb-28">
        {!hideChrome && <TrialBanner foundingMember plan="Elite Coach" />}
        <div className="flex items-center justify-between gap-2">
          <BackButton />
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">COACH</span>
            <Link to="/coach/broadcast" className="rounded-full bg-gradient-brand p-1.5 text-primary-foreground" aria-label="Broadcast">
              <Megaphone size={14} />
            </Link>
            <button
              onClick={() => setRecorderOpen(true)}
              className="rounded-full bg-gradient-brand p-1.5 text-primary-foreground"
              aria-label="Record film"
            >
              <Camera size={14} />
            </button>
            <Link to="/settings" className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground" aria-label="Settings">
              <Settings size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <Outlet />
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav items={navItems} />
      {recorderOpen && <StandaloneRecorder onClose={() => setRecorderOpen(false)} />}
      <DevTierSwitcher />
    </div>
  );
}
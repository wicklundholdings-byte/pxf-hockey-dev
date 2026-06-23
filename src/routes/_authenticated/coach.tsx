import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, CalendarDays, MessageSquare, Bell, Megaphone, Settings, BookOpen, Heart, Users, Camera } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { TrialBanner } from "@/components/trial-banner";
import { getUserAppRole } from "@/lib/user-role";
import { StandaloneRecorder } from "@/routes/_authenticated/coach.film";

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
  const navItems = [
    { to: "/coach", label: "Dashboard", icon: LayoutDashboard, exact: true, match: ["/coach"] },
    { to: "/coach/camps", label: "Events", icon: CalendarDays, match: ["/coach/camps", "/coach/bookings"] },
    { to: "/coach/teams", label: "Teams", icon: Users, match: ["/coach/teams"] },
    { to: "/coach/playbook", label: "Playbook", icon: BookOpen, match: ["/coach/playbook"] },
    { to: "/coach/inbox", label: "Inbox", icon: MessageSquare, match: ["/coach/inbox", "/coach/broadcast"] },
  ];
  const hideChrome = pathname === "/coach/plans";

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-4 pb-28">
        {!hideChrome && <TrialBanner daysLeft={12} plan="Elite" />}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">COACH</span>
            <button className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground">
              <Bell size={14} />
            </button>
            <Link to="/coach/broadcast" className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
              <Megaphone size={12} /> Broadcast
            </Link>
            <button
              onClick={() => setRecorderOpen(true)}
              className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
              aria-label="Record film"
            >
              <Camera size={12} /> Film
            </button>
            <Link to="/coach/family" className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground" aria-label="My Family">
              <Heart size={14} />
            </Link>
            <Link to="/settings" className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground" aria-label="Settings">
              <Settings size={14} />
            </Link>
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Coach Console</h1>
          <span className="text-[11px] text-muted-foreground">{today}</span>
        </div>

        <div className="mt-5">
          <Outlet />
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav items={navItems} />
      {recorderOpen && <StandaloneRecorder onClose={() => setRecorderOpen(false)} />}
    </div>
  );
}
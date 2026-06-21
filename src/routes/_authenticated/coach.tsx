import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, CalendarDays, Users, MessageSquare, ArrowLeft, Bell, Megaphone, Settings, BookOpen } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { TrialBanner } from "@/components/trial-banner";

export const Route = createFileRoute("/_authenticated/coach")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth", search: { mode: "login", redirect: "/coach" } });
    const [{ data: role }, { data: subs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan_name,status,current_period_end")
        .eq("user_id", u.user.id)
        .eq("status", "active"),
    ]);
    const subActive = (subs ?? []).some((s) => {
      const notExpired = !s.current_period_end || new Date(s.current_period_end) > new Date();
      const plan = (s.plan_name ?? "").toLowerCase();
      return notExpired && (plan.includes("coach") || plan.includes("platinum"));
    });
    if (!role && !subActive) throw redirect({ to: "/" });
  },
  component: CoachLayout,
});

function CoachLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navItems = [
    { to: "/coach", label: "Dashboard", icon: LayoutDashboard, exact: true, match: ["/coach"] },
    { to: "/coach/camps", label: "Events", icon: CalendarDays, match: ["/coach/camps", "/coach/bookings"] },
    { to: "/coach/library", label: "Library", icon: BookOpen, match: ["/coach/library"] },
    { to: "/coach/inbox", label: "Inbox", icon: MessageSquare, match: ["/coach/inbox", "/coach/broadcast"] },
    { to: "/coach/contacts", label: "Contacts", icon: Users, match: ["/coach/contacts", "/coach/attendees"] },
  ];
  const hideChrome = pathname === "/coach/plans";

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-4 pb-28">
        {!hideChrome && <TrialBanner daysLeft={12} plan="Elite" />}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> Back to app
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">COACH</span>
            <button className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground">
              <Bell size={14} />
            </button>
            <Link to="/coach/broadcast" className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black">
              <Megaphone size={12} /> Broadcast
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
    </div>
  );
}
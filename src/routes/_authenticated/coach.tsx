import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, CalendarDays, Users, MessageSquare, Wallet, Mail, UserCog, ArrowLeft, Bell, Megaphone } from "lucide-react";

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
  const tabs = [
    { to: "/coach", label: "Dashboard", icon: LayoutDashboard, exact: true, soon: false },
    { to: "/coach/camps", label: "Events", icon: CalendarDays, exact: false, soon: false },
    { to: "/coach/contacts", label: "Contacts", icon: Users, exact: false, soon: false },
    { to: "/coach", label: "Inbox", icon: MessageSquare, exact: false, soon: true },
    { to: "/coach", label: "Financials", icon: Wallet, exact: false, soon: true },
    { to: "/coach", label: "Email", icon: Mail, exact: false, soon: true },
    { to: "/coach", label: "Team", icon: UserCog, exact: false, soon: true },
  ];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> Back to app
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">COACH</span>
            <button className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground">
              <Bell size={14} />
            </button>
            <button className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black">
              <Megaphone size={12} /> Broadcast
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Coach Console</h1>
          <span className="text-[11px] text-muted-foreground">{today}</span>
        </div>

        <nav className="mt-4 -mx-5 overflow-x-auto px-5">
          <div className="flex gap-2">
            {tabs.map((t, i) => {
              const active = !t.soon && (t.exact ? pathname === t.to : pathname.startsWith(t.to));
              const cls =
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold " +
                (active
                  ? "border-teal bg-teal/10 text-teal"
                  : t.soon
                    ? "border-border/40 bg-surface text-muted-foreground/60 cursor-not-allowed"
                    : "border-border/60 bg-surface text-muted-foreground");
              return t.soon ? (
                <span key={`${t.label}-${i}`} className={cls} title="Coming in next phase">
                  <t.icon size={12} /> {t.label}
                  <span className="ml-1 rounded-full bg-muted px-1.5 text-[8px] uppercase">soon</span>
                </span>
              ) : (
                <Link key={`${t.label}-${i}`} to={t.to} className={cls}>
                  <t.icon size={12} /> {t.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-5 pb-20">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Dumbbell, FolderTree, ListChecks, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth", search: { mode: "login", redirect: "/admin" } });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true as boolean },
    { to: "/admin/drills", label: "Drills", icon: Dumbbell, exact: false as boolean },
    { to: "/admin/categories", label: "Categories", icon: FolderTree, exact: false as boolean },
    { to: "/admin/programs", label: "Programs", icon: ListChecks, exact: false as boolean },
  ] as const;

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft size={14} /> Back to app
        </Link>
        <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-volt">ADMIN</span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">PXF Admin</h1>

      <nav className="mt-4 -mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold " +
                  (active ? "border-teal bg-teal/10 text-teal" : "border-border/60 bg-surface text-muted-foreground")
                }
              >
                <t.icon size={12} /> {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-5"><Outlet /></div>
    </div>
  );
}
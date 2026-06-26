import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, CalendarDays, Dumbbell, MessageCircle, Building2, Bell } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { supabase } from "@/integrations/supabase/client";
import { getUserAppRole } from "@/lib/user-role";
import { DevTierSwitcher } from "@/components/tier-gate";
import { useAuth } from "@/hooks/use-auth";
import { PxfLogo } from "@/components/app-shell";

export const Route = createFileRoute("/parent")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/auth", search: { mode: "login", redirect: location.href } });
    const role = await getUserAppRole(user.id);
    if (role === "coach") throw redirect({ to: "/coach" });
  },
  component: ParentLayout,
});

function ParentLayout() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      setFullName((data as { full_name: string | null } | null)?.full_name ?? null);
    });
  }, [user?.id]);
  const display = fullName || user?.email || "";
  const initials = display
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "P";
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-background pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/85 px-5 pb-3 pt-5 backdrop-blur-xl">
        <PxfLogo />
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface text-foreground/80 transition-colors hover:text-foreground"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-volt shadow-glow-volt" />
          </Link>
          <Link
            to="/parent/profile"
            aria-label="Profile"
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-teal text-[12px] font-bold text-background"
          >
            {initials}
          </Link>
        </div>
      </header>
      <Outlet />
      <BottomNav
        items={[
          { to: "/parent", label: "Home", icon: Home, exact: true },
          { to: "/parent/camps", label: "Events", icon: CalendarDays },
          { to: "/parent/teams", label: "My Clubs", icon: Building2 },
          { to: "/parent/train", label: "Train", icon: Dumbbell },
          { to: "/parent/inbox", label: "Inbox", icon: MessageCircle },
        ]}
      />
      <DevTierSwitcher />
    </div>
  );
}
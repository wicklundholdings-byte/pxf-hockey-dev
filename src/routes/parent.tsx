import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Flag, MessageCircle, User } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { supabase } from "@/integrations/supabase/client";
import { getUserAppRole } from "@/lib/user-role";

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
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-background pb-24">
      <Outlet />
      <BottomNav
        items={[
          { to: "/parent", label: "Dashboard", icon: LayoutDashboard, exact: true },
          { to: "/parent/camps", label: "Camps", icon: Flag },
          { to: "/parent/inbox", label: "Inbox", icon: MessageCircle },
          { to: "/parent/profile", label: "Profile", icon: User },
        ]}
      />
    </div>
  );
}
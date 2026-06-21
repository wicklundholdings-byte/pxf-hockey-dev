import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Flag, CalendarCheck, MessageCircle, User } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-background pb-24">
      <Outlet />
      <BottomNav
        items={[
          { to: "/parent", label: "Camps", icon: Flag, exact: true },
          { to: "/parent/schedule", label: "Schedule", icon: CalendarCheck },
          { to: "/parent/inbox", label: "Inbox", icon: MessageCircle },
          { to: "/parent/profile", label: "Profile", icon: User },
        ]}
      />
    </div>
  );
}
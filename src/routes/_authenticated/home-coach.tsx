import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, ClipboardList, MessageCircle, User, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { TrialBanner } from "@/components/trial-banner";

export const Route = createFileRoute("/_authenticated/home-coach")({
  component: HomeCoachLayout,
});

function HomeCoachLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showOutlet = pathname !== "/home-coach";
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-background">
      <div className="px-5 pt-4 pb-28">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> Back to app
          </Link>
          <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-volt">HOME COACH</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold">{titleFor(pathname)}</h1>
        <div className="mt-3">
          <TrialBanner daysLeft={9} plan="Home Coach" />
        </div>
        <div className="mt-3">{showOutlet ? <Outlet /> : <HomeCoachIndex />}</div>
      </div>
      <BottomNav
        items={[
          { to: "/home-coach", label: "Library", icon: BookOpen, exact: true },
          { to: "/home-coach/sessions", label: "Sessions", icon: ClipboardList },
          { to: "/home-coach/inbox", label: "Inbox", icon: MessageCircle },
          { to: "/home-coach/profile", label: "Profile", icon: User },
        ]}
      />
    </div>
  );
}

function titleFor(p: string) {
  if (p.startsWith("/home-coach/sessions")) return "Sessions";
  if (p.startsWith("/home-coach/inbox")) return "Inbox";
  if (p.startsWith("/home-coach/profile")) return "Profile";
  return "Library";
}

function HomeCoachIndex() {
  const drills = [
    { name: "Edge Work Builder", duration: "12 min" },
    { name: "Quick Release Shot", duration: "8 min" },
    { name: "Tight Turns Flow", duration: "10 min" },
    { name: "1v1 Battle Box", duration: "15 min" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Build sessions for your kid. No camp tools — just training.</p>
      <div className="grid grid-cols-2 gap-2">
        {drills.map((d) => (
          <div key={d.name} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs font-semibold">{d.name}</p>
            <p className="mt-1 text-[10px] text-teal">{d.duration}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
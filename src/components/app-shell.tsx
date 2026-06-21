import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Dumbbell, CalendarDays, User, Bell, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth, useHasCoachAccess } from "@/hooks/use-auth";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
const baseNav: NavItem[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/drills", label: "Drills", icon: Dumbbell },
  { to: "/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
];

export function PxfLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col leading-none ${className}`}>
      <span className="font-display text-3xl font-bold tracking-tight text-gradient-brand">
        PXF
      </span>
      <span className="font-display text-[10px] font-medium tracking-[0.45em] text-muted-foreground">
        HOCKEY
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { hasAccess } = useHasCoachAccess(user?.id);
  const isChromeless = pathname.startsWith("/book/") || pathname === "/auth" || pathname === "/coach" || pathname.startsWith("/coach/");
  if (isChromeless) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }
  const nav: NavItem[] = hasAccess
    ? [...baseNav, { to: "/coach", label: "Coach", icon: Shield }]
    : baseNav;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/85 px-5 pb-3 pt-5 backdrop-blur-xl">
        <PxfLogo />
        <button
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface text-foreground/80 transition-colors hover:text-foreground"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-volt shadow-glow-volt" />
        </button>
      </header>

      <main className="flex-1 pb-28">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border/60 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl">
        <ul className="flex items-stretch justify-between">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to as "/"}
                  className="group flex flex-col items-center gap-1 px-1 py-1.5"
                >
                  <Icon
                    size={20}
                    className={active ? "text-teal" : "text-muted-foreground transition-colors group-hover:text-foreground"}
                  />
                  <span
                    className={
                      "text-[10px] font-medium tracking-wide " +
                      (active ? "text-teal" : "text-muted-foreground")
                    }
                  >
                    {label}
                  </span>
                  <span
                    className={
                      "h-0.5 w-6 rounded-full transition-all " +
                      (active ? "bg-gradient-brand opacity-100" : "opacity-0")
                    }
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
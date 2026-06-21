import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type BottomNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  match?: string[];
};

export function BottomNav({ items }: { items: BottomNavItem[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl">
      <ul className="flex items-stretch justify-between">
        {items.map((item) => {
          const matches = item.match ?? [item.to];
          const active = item.exact
            ? pathname === item.to
            : matches.some((m) => pathname === m || pathname.startsWith(m + "/"));
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <Link to={item.to} className="group flex flex-col items-center gap-1 px-1 py-1.5">
                <Icon size={22} className={active ? "text-teal" : "text-muted-foreground"} />
                <span className={"text-[11px] font-semibold " + (active ? "text-teal" : "text-muted-foreground")}>
                  {item.label}
                </span>
                <span className={"h-0.5 w-6 rounded-full " + (active ? "bg-teal" : "opacity-0")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
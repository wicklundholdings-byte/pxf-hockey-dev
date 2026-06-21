import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

const steps = [
  { n: 1, label: "Info", path: "register" as const },
  { n: 2, label: "Waiver", path: "waiver" as const },
  { n: 3, label: "Payment", path: "payment" as const },
];

export function RegistrationStepper({
  slug,
  active,
  backTo,
}: {
  slug: string;
  active: 1 | 2 | 3;
  backTo: { to: string; params?: Record<string, string> };
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[480px] items-center justify-between">
        <Link
          to={backTo.to as "/"}
          params={backTo.params as never}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={14} /> Back
        </Link>
        <div className="flex items-center gap-2">
          {steps.map((s) => {
            const done = s.n < active;
            const current = s.n === active;
            return (
              <div key={s.n} className="flex items-center gap-2">
                <span
                  className={
                    "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold " +
                    (current
                      ? "bg-gradient-brand text-primary-foreground"
                      : done
                        ? "bg-teal/20 text-teal"
                        : "bg-surface text-muted-foreground")
                  }
                >
                  {s.n}
                </span>
                <span className={"hidden text-[11px] font-semibold sm:inline " + (current ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <span className="w-10 text-right text-[10px] text-muted-foreground">{active}/3</span>
      </div>
    </header>
  );
}
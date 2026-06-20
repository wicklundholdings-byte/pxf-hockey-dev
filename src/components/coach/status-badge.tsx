import { cn } from "@/lib/utils";

type Status =
  | "paid"
  | "pending"
  | "abandoned"
  | "waitlisted"
  | "refunded"
  | "live"
  | "draft"
  | "ended"
  | "scheduled"
  | "sent"
  | "active"
  | "invited";

const STYLES: Record<Status, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sent: "bg-teal/15 text-teal border-teal/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  waitlisted: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  scheduled: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  invited: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  abandoned: "bg-red-500/15 text-red-400 border-red-500/30",
  refunded: "bg-red-500/15 text-red-400 border-red-500/30",
  draft: "bg-muted text-muted-foreground border-border",
  ended: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: Status | string; className?: string }) {
  const key = (status?.toLowerCase?.() ?? "draft") as Status;
  const style = STYLES[key] ?? STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        style,
        className,
      )}
    >
      {status}
    </span>
  );
}
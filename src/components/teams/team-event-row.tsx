import { CalendarDays, Swords, Dumbbell, Star } from "lucide-react";

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: typeof CalendarDays }> = {
  game: { label: "Game", color: "text-red-400", bg: "bg-red-500/15", icon: Swords },
  practice: { label: "Practice", color: "text-emerald-400", bg: "bg-emerald-500/15", icon: Dumbbell },
  team_event: { label: "Event", color: "text-muted-foreground", bg: "bg-surface-2", icon: Star },
  camp: { label: "Camp", color: "text-teal", bg: "bg-teal/15", icon: CalendarDays },
};

export function TeamEventRow({ event, counts }: {
  event: {
    event_type: string;
    title?: string | null;
    opponent_name?: string | null;
    venue?: string | null;
    event_date: string;
    start_time?: string | null;
    team_name?: string | null;
  };
  counts?: { yes: number; no: number; maybe: number; none: number };
}) {
  const meta = TYPE_META[event.event_type] || TYPE_META.team_event;
  const Icon = meta.icon;
  const label =
    event.event_type === "game"
      ? `vs ${event.opponent_name || "TBD"}`
      : event.title || meta.label;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <div className={"grid h-10 w-10 place-items-center rounded-xl " + meta.bg}>
        <Icon size={16} className={meta.color} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider " + meta.bg + " " + meta.color}>{meta.label.toUpperCase()}</span>
          {event.team_name && <span className="truncate text-[10px] text-muted-foreground">{event.team_name}</span>}
        </div>
        <p className="mt-0.5 truncate text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">
          {fmtDate(event.event_date)}{event.start_time ? " · " + fmtTime(event.start_time) : ""}{event.venue ? " · " + event.venue : ""}
        </p>
        {counts && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold">
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400">{counts.yes} IN</span>
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-amber-400">{counts.maybe} MAYBE</span>
            <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-red-400">{counts.no} OUT</span>
            {counts.none > 0 && <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-muted-foreground">{counts.none} —</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10); const ap = hr >= 12 ? "PM" : "AM"; const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}
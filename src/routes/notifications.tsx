import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, MessageSquare, DollarSign, CalendarClock, Check, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyNotifications, markAllNotificationsRead } from "@/lib/hockey-schools.functions";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — PXF Hockey" }] }),
  component: NotificationsScreen,
});

type N = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_to: string | null;
  related_id: string | null;
  payment_amount_cents: number | null;
  read_at: string | null;
  created_at: string;
};

const ICONS: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  booking_confirmed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/15" },
  booking_declined:  { icon: XCircle,      color: "text-rose-400",    bg: "bg-rose-400/15" },
  session_assigned:  { icon: UserPlus,     color: "text-teal",        bg: "bg-teal/15" },
  payment_received:  { icon: DollarSign,   color: "text-emerald-400", bg: "bg-emerald-400/15" },
  reminder:          { icon: CalendarClock,color: "text-amber-400",   bg: "bg-amber-400/15" },
  message:           { icon: MessageSquare,color: "text-amber-400",   bg: "bg-amber-400/15" },
};
const DEFAULT_ICON = { icon: Bell, color: "text-muted-foreground", bg: "bg-muted/20" };

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

function NotificationsScreen() {
  const list = useServerFn(listMyNotifications);
  const markAll = useServerFn(markAllNotificationsRead);
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await list({} as any);
        setItems((data ?? []) as N[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unread = items.filter((i) => !i.read_at).length;
  const handleMarkAll = async () => {
    await markAll({} as any);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: new Date().toISOString() })));
  };

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-32">
      <Link to="/" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back
      </Link>

      <div className="mt-2 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-[11px] text-muted-foreground">{loading ? "Loading…" : `${unread} unread`}</p>
        </div>
        <button
          onClick={handleMarkAll}
          className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-foreground"
        >
          <Check size={12} /> Mark all read
        </button>
      </div>

      {!loading && items.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <Bell className="mx-auto mb-2 text-muted-foreground" size={28} />
          <p className="text-sm font-semibold">You're all caught up</p>
          <p className="mt-1 text-[11px] text-muted-foreground">New activity will show up here.</p>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {items.map((n) => {
          const { icon: Icon, color, bg } = ICONS[n.kind] ?? DEFAULT_ICON;
          const read = !!n.read_at;
          return (
            <li key={n.id}>
              <Link
                to={n.link_to ?? "/"}
                className={"flex items-start gap-3 rounded-2xl border p-3 " +
                  (read ? "border-border bg-card" : "border-teal/30 bg-card")}
              >
                <div className={"grid h-9 w-9 shrink-0 place-items-center rounded-full " + bg}>
                  <Icon size={14} className={color} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{relTime(n.created_at)}</span>
                  </div>
                  {n.body && <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>}
                  {n.kind === "booking_confirmed" && n.payment_amount_cents ? (
                    <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      Pay ${(n.payment_amount_cents / 100).toFixed(0)}
                    </span>
                  ) : null}
                </div>
                {!read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
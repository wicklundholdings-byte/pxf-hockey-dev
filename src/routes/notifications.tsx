import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, UserPlus, MessageSquare, ListChecks, DollarSign, CalendarClock, Check } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — PXF Hockey" }] }),
  component: NotificationsScreen,
});

type N = {
  id: string; kind: "registration" | "message" | "waitlist" | "payment" | "reminder";
  title: string; body: string; ts: string; read: boolean; to?: string;
};

const SEED: N[] = [
  { id: "1", kind: "registration", title: "New registration", body: "Mason Chen registered for Elite Skills Camp.", ts: "2m", read: false, to: "/coach/camps" },
  { id: "2", kind: "payment", title: "Payment received", body: "$420 from Sarah Walsh — Elite Skills Camp.", ts: "8m", read: false, to: "/coach/financials" },
  { id: "3", kind: "message", title: "New message", body: "Linda Chen: Will Mason need full gear day 1?", ts: "1h", read: false, to: "/coach/inbox" },
  { id: "4", kind: "waitlist", title: "Waitlist movement", body: "Ava Thompson moved up to position #1.", ts: "3h", read: true, to: "/coach/camps" },
  { id: "5", kind: "reminder", title: "Camp starts tomorrow", body: "Elite Skills Camp — 9:00 AM at Scotiabank Arena.", ts: "Yesterday", read: true, to: "/coach/camps" },
  { id: "6", kind: "registration", title: "New registration", body: "Ella Brooks registered for Spring Power Skating.", ts: "2d", read: true, to: "/coach/camps" },
  { id: "7", kind: "payment", title: "Payout sent", body: "$1,840 deposited to your bank account.", ts: "3d", read: true, to: "/coach/financials" },
];

const ICONS = {
  registration: { icon: UserPlus, color: "text-teal", bg: "bg-teal/15" },
  message: { icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-400/15" },
  waitlist: { icon: ListChecks, color: "text-violet-400", bg: "bg-violet-400/15" },
  payment: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/15" },
  reminder: { icon: CalendarClock, color: "text-rose-400", bg: "bg-rose-400/15" },
};

function NotificationsScreen() {
  const [items, setItems] = useState(SEED);
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-32">
      <Link to="/" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12}/> Back
      </Link>

      <div className="mt-2 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-[11px] text-muted-foreground">{unread} unread</p>
        </div>
        <button
          onClick={() => setItems((prev) => prev.map((i) => ({ ...i, read: true })))}
          className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-foreground"
        >
          <Check size={12}/> Mark all read
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((n) => {
          const { icon: Icon, color, bg } = ICONS[n.kind];
          return (
            <li key={n.id}>
              <Link
                to={n.to ?? "/"}
                onClick={() => setItems((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i))}
                className={"flex items-start gap-3 rounded-2xl border p-3 " +
                  (n.read ? "border-border bg-card" : "border-teal/30 bg-card")}
              >
                <div className={"grid h-9 w-9 shrink-0 place-items-center rounded-full " + bg}>
                  <Icon size={14} className={color} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{n.ts}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, MapPin, X, Receipt, Mail } from "lucide-react";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — PXF Hockey" }] }),
  component: BookingsScreen,
});

type Status = "Upcoming" | "Completed" | "Cancelled";
type Booking = {
  id: string; camp: string; coach: string; dates: string; location: string; paid: string; status: Status;
};

const items: Booking[] = [
  { id: "b1", camp: "Summer Elite Camp", coach: "Coach Reilly", dates: "Aug 12–16, 2026", location: "Mississauga, ON", paid: "$420.00", status: "Upcoming" },
  { id: "b2", camp: "Skating Power Clinic", coach: "Coach Park", dates: "Jul 22, 2026", location: "Toronto, ON", paid: "$95.00", status: "Upcoming" },
  { id: "b3", camp: "Spring Skills Camp", coach: "Coach Reilly", dates: "Apr 14–18, 2026", location: "Mississauga, ON", paid: "$380.00", status: "Completed" },
  { id: "b4", camp: "Winter Goalie Clinic", coach: "Coach Smith", dates: "Feb 8, 2026", location: "Burlington, ON", paid: "$0.00 (refunded)", status: "Cancelled" },
];

const tone: Record<Status, string> = {
  Upcoming: "bg-teal/15 text-teal",
  Completed: "bg-volt/15 text-volt",
  Cancelled: "bg-muted/20 text-muted-foreground",
};

function BookingsScreen() {
  const [open, setOpen] = useState<Booking | null>(null);

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">My Bookings</h1>
      <p className="text-xs text-muted-foreground">All camps you've registered Jake for.</p>

      <div className="mt-5 space-y-3">
        {items.map((b) => (
          <button key={b.id} onClick={() => setOpen(b)} className="w-full rounded-2xl border border-border bg-card p-4 text-left">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{b.camp}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone[b.status]}`}>{b.status}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{b.coach}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays size={11} />{b.dates}</span>
              <span className="flex items-center gap-1"><MapPin size={11} />{b.location}</span>
              <span>Paid {b.paid}</span>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 sm:items-center sm:p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{open.camp}</h3>
              <button onClick={() => setOpen(null)}><X size={16} /></button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{open.coach} · {open.dates}</p>
            <p className="text-xs text-muted-foreground">{open.location}</p>

            <div className="mt-4 rounded-xl border border-border bg-background p-3 text-xs">
              <p className="flex items-center gap-2 font-semibold"><Receipt size={14} className="text-teal" /> Receipt</p>
              <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Camp fee</span><span>{open.paid}</span></div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Order #PXF-{open.id.toUpperCase()}</span><span>Stripe</span></div>
            </div>

            <div className="mt-3 flex gap-2">
              <Link to="/coaches/$slug" params={{ slug: "coach-reilly" }} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs">
                <Mail size={12} /> Contact Coach
              </Link>
              {open.status === "Upcoming" && (
                <button className="flex-1 rounded-lg border border-destructive/50 py-2 text-xs text-destructive">Cancel Booking</button>
              )}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Cancellations are subject to the coach's refund policy.</p>
          </div>
        </div>
      )}
    </div>
  );
}
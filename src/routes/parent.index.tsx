import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, MapPin, Star, MessageCircle, ShoppingBag, User, Search, BookOpen, ChevronDown, Check } from "lucide-react";

export const Route = createFileRoute("/parent")({
  head: () => ({ meta: [{ title: "Home — PXF Hockey" }] }),
  component: ParentHome,
});

const bookings = [
  { name: "Summer Elite Camp", coach: "Coach Reilly", date: "Aug 12–16", days: 12, location: "Mississauga, ON" },
  { name: "Skating Power Clinic", coach: "Coach Park", date: "Jul 22", days: 4, location: "Toronto, ON" },
];

const evals = [
  { skill: "Skating", score: 4 },
  { skill: "Puck Control", score: 5 },
  { skill: "Shooting", score: 3 },
  { skill: "Hockey IQ", score: 4 },
];

const drills = [
  { name: "Edge Work Builder", level: "U12", duration: "12 min" },
  { name: "Quick Release Shot", level: "U12", duration: "8 min" },
  { name: "Tight Turns Flow", level: "U12", duration: "10 min" },
];

const messages = [
  { from: "Coach Reilly", preview: "Reminder: bring water bottle Friday.", time: "2h" },
  { from: "Coach Park", preview: "Great work this week, Jake!", time: "1d" },
];

function ParentHome() {
  const coaches = [
    { id: "pep", name: "Power Edge Pro", initials: "PEP", color: "from-teal/40 to-volt/30" },
    { id: "pxf", name: "PXF Skills Academy", initials: "PXF", color: "from-volt/30 to-teal/40" },
    { id: "park", name: "Coach Park Hockey", initials: "CP", color: "from-teal/30 to-blue-500/30" },
  ];
  const [active, setActive] = useState(coaches[0]);
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      {/* Coach switcher */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3"
        >
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${active.color} text-[10px] font-bold`}>{active.initials}</div>
            <div className="text-left">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">You are viewing</p>
              <p className="text-sm font-semibold">{active.name}</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-border bg-card p-2 shadow-xl">
            {coaches.map((c) => (
              <button
                key={c.id}
                onClick={() => { setActive(c); setOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface"
              >
                <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${c.color} text-[9px] font-bold`}>{c.initials}</div>
                <span className="flex-1 text-xs font-semibold">{c.name}</span>
                {active.id === c.id && <Check size={14} className="text-teal" />}
              </button>
            ))}
            <Link to="/search" className="mt-1 block rounded-xl border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
              + Find another coach
            </Link>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Welcome back, Sarah</p>
      <h1 className="font-display text-2xl font-bold">Jake's hockey journey</h1>

      {/* Upcoming bookings */}
      <section className="mt-5">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upcoming Camps</h2>
        <div className="mt-2 space-y-2">
          {bookings.map((b) => (
            <div key={b.name} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{b.name}</p>
                <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">{b.days}d</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{b.coach}</p>
              <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays size={11} />{b.date}</span>
                <span className="flex items-center gap-1"><MapPin size={11} />{b.location}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent evaluations */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest Evaluation</h2>
        <div className="mt-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">From Coach Reilly · Summer Elite</p>
          <div className="mt-3 space-y-2">
            {evals.map((e) => (
              <div key={e.skill} className="flex items-center gap-3">
                <span className="w-24 text-xs">{e.skill}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className={s <= e.score ? "fill-volt text-volt" : "text-muted-foreground"} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended drills */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommended for Jake (U12)</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {drills.map((d) => (
            <div key={d.name} className="rounded-xl border border-border bg-card p-3">
              <p className="text-sm font-semibold">{d.name}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{d.level} · {d.duration}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Messages */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From your coaches</h2>
        <div className="mt-2 space-y-2">
          {messages.map((m) => (
            <div key={m.from} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <MessageCircle size={16} className="mt-0.5 text-teal" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{m.from}</p>
                  <span className="text-[10px] text-muted-foreground">{m.time}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.preview}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-6 grid grid-cols-4 gap-2">
        {[
          { label: "Bookings", to: "/bookings", icon: BookOpen },
          { label: "Find Camps", to: "/camps/browse", icon: Search },
          { label: "Athlete", to: "/profile", icon: User },
          { label: "Store", to: "/store", icon: ShoppingBag },
        ].map((q) => (
          <Link key={q.label} to={q.to as "/bookings"} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3">
            <q.icon size={18} className="text-teal" />
            <span className="text-[10px] font-semibold">{q.label}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
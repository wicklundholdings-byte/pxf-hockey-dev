import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Star, MessageCircle, Search, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parent/")({
  head: () => ({ meta: [{ title: "Home — PXF Hockey" }] }),
  component: ParentHome,
});

const bookings = [
  { name: "Summer Elite Camp", coach: "Power Edge Pro", date: "Aug 12–16", days: 12, location: "Mississauga, ON" },
  { name: "Skating Power Clinic", coach: "Coach Park Hockey", date: "Jul 22", days: 4, location: "Toronto, ON" },
  { name: "PXF Summer Intensive", coach: "PXF Skills Academy", date: "Aug 5–9", days: 8, location: "Toronto, ON" },
];

const evals = [
  { skill: "Skating", score: 4 },
  { skill: "Puck Control", score: 5 },
  { skill: "Shooting", score: 3 },
  { skill: "Hockey IQ", score: 4 },
];

const messages = [
  { from: "Coach Reilly", camp: "Summer Elite Camp", preview: "Reminder: bring water bottle Friday.", time: "2h" },
  { from: "Coach Park", camp: "Skating Power Clinic", preview: "Great work this week, Jake!", time: "1d" },
  { from: "PXF Skills", camp: "PXF Summer Intensive", preview: "Schedule for week 2 just posted.", time: "2d" },
];

function ParentHome() {
  const { user } = useAuth();
  const [myCamps, setMyCamps] = useState<Array<{ id: string; name: string; start_date: string | null; end_date: string | null; venue_name: string | null }>>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: kids } = await supabase
        .from("attendees")
        .select("id")
        .eq("owner_id", user.id);
      const ids = (kids ?? []).map((k) => k.id);
      if (ids.length === 0) return setMyCamps([]);
      const { data: regs } = await supabase
        .from("registrations")
        .select("camp_id, status, camps(id, name, start_date, end_date, venue_name)")
        .in("attendee_id", ids)
        .in("status", ["paid", "pending"]);
      const camps = (regs ?? [])
        .map((r) => (r as unknown as { camps: { id: string; name: string; start_date: string | null; end_date: string | null; venue_name: string | null } }).camps)
        .filter(Boolean);
      const seen = new Set<string>();
      const unique = camps.filter((c) => (c && !seen.has(c.id) ? (seen.add(c.id), true) : false));
      setMyCamps(unique);
    })();
  }, [user?.id]);

  function daysUntil(d: string | null) {
    if (!d) return null;
    return Math.max(0, Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000));
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <p className="text-xs text-muted-foreground">Welcome back, Sarah</p>
      <h1 className="font-display text-2xl font-bold">Jake's hockey journey</h1>
      <p className="mt-1 text-[11px] text-muted-foreground">All camps and coaches in one view.</p>

      {/* Upcoming bookings */}
      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registered Camps</h2>
          <Link to="/camps/browse" className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[10px] font-bold text-background">
            <Search size={11} /> Browse
          </Link>
        </div>
        <div className="mt-2 space-y-2">
          {(myCamps.length > 0 ? myCamps.map((c) => ({ ...c, coach: null as string | null })) : bookings.map((b, i) => ({ id: `demo-${i}`, name: b.name, start_date: null, end_date: null, venue_name: b.location, coach: b.coach }))).map((c) => {
            const isReal = !c.id.startsWith("demo-");
            const countdown = daysUntil(c.start_date);
            const card = (
              <>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    {c.coach && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-teal">{c.coach}</p>}
                  </div>
                  {countdown != null && (
                    <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">{countdown === 0 ? "Today" : `${countdown}d`}</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={11} />{c.venue_name ?? "Venue TBA"}</span>
                  {isReal && <ChevronRight size={14} className="text-teal" />}
                </div>
              </>
            );
            return isReal ? (
              <Link key={c.id} to="/parent/camp/$campId" params={{ campId: c.id }} className="block rounded-2xl border border-border bg-card p-4">
                {card}
              </Link>
            ) : (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4">{card}</div>
            );
          })}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal/80">{m.camp}</p>
                <p className="text-xs text-muted-foreground">{m.preview}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link to="/camps/browse" className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-xs font-bold text-teal">
        <Search size={14} /> Browse and register for camps
      </Link>
    </div>
  );
}
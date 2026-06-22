import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parent/camps")({
  head: () => ({ meta: [{ title: "Camps — PXF Hockey" }] }),
  component: ParentCamps,
});

type CampRow = { id: string; name: string; start_date: string | null; end_date: string | null; venue_name: string | null; owner_id: string | null };
type RegItem = { reg_id: string; status: string | null; child_name: string; camp: CampRow };

function fmtDates(s: string | null, e: string | null) {
  if (!s) return "Dates TBA";
  const f = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return e && e !== s ? `${f(s)} – ${f(e)}` : f(s);
}

function ParentCamps() {
  const { user } = useAuth();
  const [registered, setRegistered] = useState<RegItem[]>([]);
  const [available, setAvailable] = useState<CampRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const parentEmail = user.email ?? "";

      // Registrations from the public booking flow are keyed off the
      // coach-side contact row, not the parent's own attendee ids.
      const { data: contactRows } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", parentEmail);
      const contactIds = (contactRows ?? []).map((c) => c.id);
      let coachIds: string[] = [];
      let regCampIds: string[] = [];
      if (contactIds.length) {
        const { data: regs } = await supabase
          .from("registrations")
          .select("id, status, attendee_id, attendees(full_name), camps(id, name, start_date, end_date, venue_name, owner_id)")
          .in("contact_id", contactIds);
        const rows = (regs ?? []) as unknown as Array<{
          id: string;
          status: string | null;
          attendee_id: string;
          attendees: { full_name: string } | null;
          camps: CampRow | null;
        }>;
        const items: RegItem[] = rows
          .filter((r) => r.camps)
          .map((r) => ({ reg_id: r.id, status: r.status, child_name: r.attendees?.full_name ?? "Athlete", camp: r.camps! }))
          .sort((a, b) => (a.camp.start_date ?? "").localeCompare(b.camp.start_date ?? ""));
        setRegistered(items);
        coachIds = Array.from(new Set(items.map((i) => i.camp.owner_id).filter(Boolean) as string[]));
        regCampIds = items.map((i) => i.camp.id);
      }

      // Available: from coaches the parent has registered with, exclude already-registered camps, only published & upcoming
      const today = new Date().toISOString().slice(0, 10);
      let q = supabase
        .from("camps")
        .select("id, name, start_date, end_date, venue_name, owner_id")
        .neq("status", "draft")
        .gte("end_date", today)
        .order("start_date", { ascending: true })
        .limit(20);
      if (coachIds.length) q = q.in("owner_id", coachIds);
      const { data: avail } = await q;
      const filtered = (avail ?? []).filter((c) => !regCampIds.includes(c.id)) as CampRow[];
      setAvailable(filtered);
    })();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-24 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Camps</h1>
        <Link to="/camps/browse" className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-background">
          <Search size={12} /> Browse
        </Link>
      </div>

      <section className="mt-5">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Registered</h2>
        <div className="mt-2 space-y-2">
          {registered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">No camps registered yet</p>
          ) : (
            registered.map((r) => (
              <Link key={r.reg_id} to="/parent/camp/$campId" params={{ campId: r.camp.id }} className="block rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.camp.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">For {r.child_name}</p>
                  </div>
                  {r.status && (
                    <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " + (r.status === "paid" ? "bg-volt/15 text-volt" : "bg-teal/15 text-teal")}>
                      {r.status}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={11} />{r.camp.venue_name ?? "Venue TBA"}</span>
                  <span>{fmtDates(r.camp.start_date, r.camp.end_date)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Available for you</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">From coaches you've registered with</p>
        <div className="mt-2 space-y-2">
          {available.length === 0 ? (
            <Link to="/camps/browse" className="block rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
              Browse all public camps →
            </Link>
          ) : (
            available.map((c) => (
              <Link key={c.id} to="/camps/$slug" params={{ slug: c.id }} className="block rounded-2xl border border-border bg-card p-4">
                <p className="truncate font-semibold">{c.name}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={11} />{c.venue_name ?? "Venue TBA"}</span>
                  <span>{fmtDates(c.start_date, c.end_date)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
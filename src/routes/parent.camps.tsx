import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Swords, Dumbbell, Flag, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { payForPrivateSession } from "@/lib/hockey-schools.functions";
import { OutstandingPayments } from "@/components/parent/outstanding-payments";

export const Route = createFileRoute("/parent/camps")({
  head: () => ({ meta: [{ title: "Events — PXF Hockey" }] }),
  component: ParentEvents,
});

type EventKind = "game" | "practice" | "team_event" | "camp_session" | "private";

type FeedEvent = {
  id: string;
  kind: EventKind;
  title: string;
  subtitle?: string | null;
  date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time?: string | null;
  venue: string | null;
  sourceKey: string; // team:<id> | camp:<id>
  sourceLabel: string;
  to: string;
  params: Record<string, string>;
  privateSessionId?: string;
  paymentStatus?: string | null;
  feeCents?: number | null;
};

const META: Record<EventKind, { icon: typeof Swords; color: string; label: string }> = {
  game: { icon: Swords, color: "#F59E0B", label: "Game" },
  practice: { icon: Dumbbell, color: "#10B981", label: "Practice" },
  team_event: { icon: Flag, color: "#8B5CF6", label: "Team Event" },
  camp_session: { icon: Calendar, color: "#06B6D4", label: "Camp Session" },
  private: { icon: User, color: "#14B8A6", label: "Private" },
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? "PM" : "AM";
  const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ampm}`;
}

function ParentEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const payFn = useServerFn(payForPrivateSession);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);

      // Resolve contact ids for parent
      const { data: contactRows } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", user.email ?? "");
      const contactIds = ((contactRows ?? []) as { id: string }[]).map((c) => c.id);

      const all: FeedEvent[] = [];

      if (contactIds.length) {
        // Teams parent's child is on
        const { data: tps } = await supabase
          .from("team_players")
          .select("team_id")
          .in("parent_contact_id", contactIds);
        const teamIds = Array.from(new Set(((tps ?? []) as { team_id: string }[]).map((r) => r.team_id)));
        let teamMap = new Map<string, string>();
        if (teamIds.length) {
          const { data: teams } = await supabase
            .from("teams")
            .select("id,name")
            .in("id", teamIds);
          teamMap = new Map(((teams ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
          const { data: te } = await supabase
            .from("team_events")
            .select("id,team_id,event_type,title,opponent_name,home_away,venue,event_date,start_time,end_time")
            .in("team_id", teamIds)
            .gte("event_date", today)
            .order("event_date", { ascending: true })
            .order("start_time", { ascending: true });
          ((te ?? []) as Array<{
            id: string; team_id: string; event_type: string; title: string | null;
            opponent_name: string | null; home_away: string | null; venue: string | null;
            event_date: string; start_time: string | null; end_time: string | null;
          }>).forEach((e) => {
            const teamName = teamMap.get(e.team_id) ?? "Team";
            const kind: EventKind = e.event_type === "game" ? "game" : e.event_type === "practice" ? "practice" : "team_event";
            const title =
              kind === "game"
                ? `${e.home_away === "away" ? "@" : "vs"} ${e.opponent_name ?? "Opponent"}`
                : e.title ?? (kind === "practice" ? "Practice" : "Team Event");
            all.push({
              id: e.id,
              kind,
              title,
              date: e.event_date,
              start_time: e.start_time,
              end_time: e.end_time,
              venue: e.venue,
              sourceKey: `team:${e.team_id}`,
              sourceLabel: teamName,
              to: kind === "game" ? "/parent/teams/$teamId/game/$eventId" : "/parent/team/event/$eventId",
              params: kind === "game" ? { teamId: e.team_id, eventId: e.id } : { eventId: e.id },
            });
          });
        }

        // Camp sessions
        const { data: regs } = await supabase
          .from("registrations")
          .select("camp_id, camps(id,name,venue_name)")
          .in("contact_id", contactIds);
        const campRows = ((regs ?? []) as Array<{ camp_id: string; camps: { id: string; name: string; venue_name: string | null } | null }>)
          .filter((r) => r.camps)
          .map((r) => r.camps!);
        const campMap = new Map(campRows.map((c) => [c.id, c]));
        const campIds = Array.from(campMap.keys());
        if (campIds.length) {
          const { data: sessions } = await supabase
            .from("camp_sessions")
            .select("id,camp_id,session_date,start_time,end_time,sort_order")
            .in("camp_id", campIds)
            .gte("session_date", today)
            .order("session_date", { ascending: true });
          // Compute session day numbers per camp
          const dayCounters = new Map<string, number>();
          const { data: allSessions } = await supabase
            .from("camp_sessions")
            .select("id,camp_id,session_date,sort_order")
            .in("camp_id", campIds)
            .order("session_date", { ascending: true })
            .order("sort_order", { ascending: true });
          const dayIndex = new Map<string, number>();
          (allSessions ?? []).forEach((s: any) => {
            const n = (dayCounters.get(s.camp_id) ?? 0) + 1;
            dayCounters.set(s.camp_id, n);
            dayIndex.set(s.id, n);
          });
          ((sessions ?? []) as Array<{ id: string; camp_id: string; session_date: string; start_time: string | null; end_time: string | null }>).forEach((s) => {
            const camp = campMap.get(s.camp_id);
            if (!camp) return;
            const day = dayIndex.get(s.id);
            all.push({
              id: s.id,
              kind: "camp_session",
              title: day ? `Session ${day}` : "Camp Session",
              date: s.session_date,
              start_time: s.start_time,
              end_time: s.end_time,
              venue: camp.venue_name,
              sourceKey: `camp:${camp.id}`,
              sourceLabel: camp.name,
              to: "/parent/camp/$campId",
              params: { campId: camp.id },
            });
          });
        }
      }

      all.sort((a, b) => (a.date + (a.start_time ?? "")).localeCompare(b.date + (b.start_time ?? "")));
      // Private sessions tied to this parent
      const today2 = new Date().toISOString().slice(0, 10);
      const { data: privates } = await (supabase as any)
        .from("private_sessions")
        .select("id, athlete_name, session_date, start_time, location, fee_cents, payment_status")
        .eq("parent_user_id", user.id)
        .gte("session_date", today2)
        .order("session_date", { ascending: true });
      ((privates ?? []) as Array<any>).forEach((p) => {
        all.push({
          id: p.id,
          kind: "private",
          title: `Private · ${p.athlete_name}`,
          date: p.session_date,
          start_time: p.start_time,
          venue: p.location,
          sourceKey: `private`,
          sourceLabel: "Private Sessions",
          to: "/parent/camps",
          params: {},
          privateSessionId: p.id,
          paymentStatus: p.payment_status,
          feeCents: p.fee_cents,
        });
      });
      all.sort((a, b) => (a.date + (a.start_time ?? "")).localeCompare(b.date + (b.start_time ?? "")));
      setEvents(all);
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  const onPay = async (sessionId: string) => {
    setPaying(sessionId);
    try {
      await payFn({ data: { sessionId } });
      setEvents((prev) => prev.map((e) => e.privateSessionId === sessionId ? { ...e, paymentStatus: "paid" } : e));
    } finally {
      setPaying(null);
    }
  };

  const upcoming = events;

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Events</h1>
      <p className="mt-1 text-[11px] text-muted-foreground">Everything your athlete is enrolled in</p>

      <OutstandingPayments />

      {loading ? (
        <p className="mt-6 text-xs text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <Calendar className="mx-auto mb-2 text-muted-foreground" size={28} />
          <p className="text-sm font-semibold">No upcoming events</p>
          <p className="mt-1 text-xs text-muted-foreground">When your athlete joins a team or camp, events show up here.</p>
        </div>
      ) : (
        <>
          <section className="mt-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Upcoming</h2>
            <div className="mt-2 space-y-2">
              {upcoming.map((e) => (
                <EventCard key={`up-${e.kind}-${e.id}`} event={e} showSource onPay={onPay} paying={paying} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EventCard({ event, showSource, onPay, paying }: { event: FeedEvent; showSource?: boolean; onPay?: (id: string) => void; paying?: string | null }) {
  const meta = META[event.kind];
  const Icon = meta.icon;
  const isPrivate = event.kind === "private";
  const needsPayment = isPrivate && event.paymentStatus === "pending";
  const isPaid = isPrivate && event.paymentStatus === "paid";
  return (
    <Link
      to={event.to}
      params={event.params as any}
      className="block rounded-2xl border border-border bg-card p-3"
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{event.title}</p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
          {showSource && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{event.sourceLabel}</p>
          )}
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {fmtDate(event.date)}
              {event.start_time ? ` · ${fmtTime(event.start_time)}` : ""}
            </span>
            {event.venue && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} />
                <span className="truncate">{event.venue}</span>
              </span>
            )}
          </div>
          {isPrivate && (
            <div className="mt-2 flex items-center gap-2">
              {needsPayment && (
                <>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Payment Pending
                  </span>
                  {event.privateSessionId && onPay && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPay(event.privateSessionId!); }}
                      disabled={paying === event.privateSessionId}
                      className="rounded-full bg-teal px-3 py-1 text-[10px] font-bold text-black disabled:opacity-50"
                    >
                      {paying === event.privateSessionId ? "Paying…" : `Pay Now${event.feeCents ? ` · $${(event.feeCents/100).toFixed(0)}` : ""}`}
                    </button>
                  )}
                </>
              )}
              {isPaid && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Paid
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
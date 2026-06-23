import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, MapPin, Star, MessageCircle, ChevronRight, ChevronDown, Cpu, Calendar, Clock, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parent/")({
  head: () => ({ meta: [{ title: "Dashboard — PXF Hockey" }] }),
  component: ParentDashboard,
});

type Kid = { id: string; full_name: string; birthday: string | null; position: string | null; skill_level: string | null };
type RegCamp = {
  reg_id: string;
  camp: { id: string; name: string; start_date: string | null; end_date: string | null; venue_name: string | null; owner_id: string | null };
  child_name: string;
  coach_name: string | null;
};
type Thread = { conv_id: string; coach_name: string; preview: string; time: string; camp_name: string | null };
type Evaluation = {
  id: string;
  child_name: string;
  camp_name: string | null;
  coach_name: string | null;
  skating: number | null;
  puck_control: number | null;
  shooting: number | null;
  hockey_sense: number | null;
};
type RsvpPrompt = { id: string; child_name: string; camp_name: string; session_date: string };
type NextSession = {
  camp_id: string;
  child_name: string;
  camp_name: string;
  session_title: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
};

function ageFrom(b: string | null) {
  if (!b) return null;
  const d = new Date(b + "T00:00:00");
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 86400000));
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}
function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
}
function isLive(start: string | null, end: string | null) {
  if (!start) return false;
  const today = new Date(new Date().toDateString()).getTime();
  const s = new Date(start + "T00:00:00").getTime();
  const e = end ? new Date(end + "T00:00:00").getTime() : s;
  return today >= s && today <= e;
}
function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}
function fmtDates(s: string | null, e: string | null) {
  if (!s) return "Dates TBA";
  const f = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return e && e !== s ? `${f(s)} – ${f(e)}` : f(s);
}
function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ParentDashboard() {
  const { user } = useAuth();
  const [parentName, setParentName] = useState<string>("");
  const [kids, setKids] = useState<Kid[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [regCamps, setRegCamps] = useState<RegCamp[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [rsvps, setRsvps] = useState<RsvpPrompt[]>([]);
  const [hasActiveDryland, setHasActiveDryland] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setParentName(prof?.full_name ?? user.email?.split("@")[0] ?? "Parent");

      const parentEmail = user.email ?? "";

      const { data: kidsRows } = await supabase
        .from("attendees")
        .select("id, full_name, birthday, position, skill_level")
        .eq("owner_id", user.id)
        .order("created_at");
      const kidList = (kidsRows ?? []) as Kid[];
      setKids(kidList);

      if (kidList.length > 0) {
        const { count } = await supabase
          .from("athlete_program_enrollments")
          .select("id", { count: "exact", head: true })
          .in("athlete_id", kidList.map((k) => k.id))
          .eq("status", "active");
        setHasActiveDryland((count ?? 0) > 0);
      } else {
        setHasActiveDryland(false);
      }

      // Look up registrations made via the public booking flow: those
      // attach to coach-side contact/attendee rows keyed by the parent's
      // email, NOT the parent's own attendee ids.
      const { data: contactRows } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", parentEmail);
      const contactIds = (contactRows ?? []).map((c) => c.id);

      if (contactIds.length) {
        const { data: regs } = await supabase
          .from("registrations")
          .select("id, attendee_id, status, camps(id, name, start_date, end_date, venue_name, owner_id), attendees(full_name)")
          .in("contact_id", contactIds)
          .in("status", ["paid", "pending"]);
        const regRows = (regs ?? []) as unknown as Array<{
          id: string;
          attendee_id: string;
          camps: RegCamp["camp"] | null;
          attendees: { full_name: string } | null;
        }>;
        const coachIds = Array.from(new Set(regRows.map((r) => r.camps?.owner_id).filter(Boolean) as string[]));
        const coachMap = new Map<string, string>();
        if (coachIds.length) {
          const { data: coaches } = await supabase.from("profiles").select("id, full_name").in("id", coachIds);
          (coaches ?? []).forEach((c) => coachMap.set(c.id, c.full_name ?? "Coach"));
        }
        const built: RegCamp[] = regRows
          .filter((r) => r.camps)
          .map((r) => ({
            reg_id: r.id,
            camp: r.camps!,
            child_name: r.attendees?.full_name ?? "Athlete",
            coach_name: r.camps?.owner_id ? coachMap.get(r.camps.owner_id) ?? null : null,
          }));
        setRegCamps(built);

        // tomorrow's RSVPs (one per child per camp day)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ymd = tomorrow.toISOString().slice(0, 10);
        const regIds = regRows.map((r) => r.id);
        if (regIds.length) {
          const { data: rsvps } = await supabase
            .from("daily_rsvps")
            .select("id, registration_id, status, camp_sessions(session_date), camps(name)")
            .in("registration_id", regIds)
            .limit(20);
          const pending = (rsvps ?? []).filter(
            (r: any) =>
              r.camp_sessions?.session_date === ymd &&
              r.status !== "attending" &&
              r.status !== "not_attending",
          );
          const built: RsvpPrompt[] = pending.map((p: any) => {
            const reg = regRows.find((r) => r.id === p.registration_id);
            return {
              id: p.id,
              child_name: reg?.attendees?.full_name ?? "Athlete",
              camp_name: p.camps?.name ?? "Camp",
              session_date: ymd,
            };
          });
          setRsvps(built);
        }

        // latest evaluation
        const { data: evals } = await supabase
          .from("evaluations")
          .select("id, skating, puck_control, shooting, hockey_sense, created_at, registrations!inner(attendee_id, attendees(full_name), camps(name, owner_id))")
          .in("registrations.contact_id", contactIds)
          .order("created_at", { ascending: false })
          .limit(1);
        const ev: any = (evals ?? [])[0];
        if (ev) {
          setEvaluation({
            id: ev.id,
            child_name: ev.registrations?.attendees?.full_name ?? "Athlete",
            camp_name: ev.registrations?.camps?.name ?? null,
            coach_name: ev.registrations?.camps?.owner_id ? coachMap.get(ev.registrations.camps.owner_id) ?? null : null,
            skating: ev.skating,
            puck_control: ev.puck_control,
            shooting: ev.shooting,
            hockey_sense: ev.hockey_sense,
          });
        }
      }

      // unread message threads
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);
      const convIds = (memberships ?? []).map((m) => m.conversation_id);
      if (convIds.length) {
        const { data: convs } = await supabase
          .from("conversations")
          .select("id, camps(name)")
          .in("id", convIds);
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at, read_by")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
          .limit(50);
        const latestByConv = new Map<string, any>();
        (lastMsgs ?? []).forEach((m: any) => {
          if (!latestByConv.has(m.conversation_id)) latestByConv.set(m.conversation_id, m);
        });
        const senderIds = Array.from(new Set(Array.from(latestByConv.values()).map((m) => m.sender_id).filter(Boolean)));
        const senderMap = new Map<string, string>();
        if (senderIds.length) {
          const { data: senders } = await supabase.from("profiles").select("id, full_name").in("id", senderIds);
          (senders ?? []).forEach((s) => senderMap.set(s.id, s.full_name ?? "Coach"));
        }
        const convCampMap = new Map<string, string | null>();
        (convs ?? []).forEach((c: any) => convCampMap.set(c.id, c.camps?.name ?? null));
        const unread: Thread[] = [];
        latestByConv.forEach((m, conv) => {
          const readBy = Array.isArray(m.read_by) ? m.read_by : [];
          const isUnread = m.sender_id !== user.id && !readBy.includes(user.id);
          if (isUnread) {
            unread.push({
              conv_id: conv,
              coach_name: senderMap.get(m.sender_id) ?? "Coach",
              preview: m.body ?? "",
              time: timeAgo(m.created_at),
              camp_name: convCampMap.get(conv) ?? null,
            });
          }
        });
        setThreads(unread);
      }
    })();
  }, [user?.id]);

  async function respondRsvp(id: string, status: "attending" | "not_attending") {
    await supabase.from("daily_rsvps").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
    setRsvps((prev) => prev.filter((r) => r.id !== id));
  }

  const sortedCamps = useMemo(
    () => [...regCamps].sort((a, b) => (a.camp.start_date ?? "").localeCompare(b.camp.start_date ?? "")),
    [regCamps],
  );

  // Mock fallbacks so the dashboard is information-rich even before live data lands.
  const today = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return ymd(d); };

  const displayKids: Kid[] = kids.length > 0 ? kids : [
    { id: "mock-1", full_name: "Braxton Wicklund", birthday: "2014-04-12", position: "Forward", skill_level: "Advanced" },
    { id: "mock-2", full_name: "Everest Wicklund", birthday: "2016-09-03", position: "Defense", skill_level: "Intermediate" },
  ];

  const displayCamps: RegCamp[] = sortedCamps.length > 0 ? sortedCamps : [
    {
      reg_id: "mock-c1",
      camp: { id: "mock-camp-1", name: "Summer Elite Skating Camp", start_date: addDays(22), end_date: addDays(26), venue_name: "Iceland Arena", owner_id: null },
      child_name: displayKids[0].full_name,
      coach_name: "Power Edge Pro",
    },
    {
      reg_id: "mock-c2",
      camp: { id: "mock-camp-2", name: "Skating Power Clinic", start_date: addDays(-1), end_date: addDays(1), venue_name: "Coach Park Arena", owner_id: null },
      child_name: displayKids[1]?.full_name ?? displayKids[0].full_name,
      coach_name: "Coach Park Hockey",
    },
  ];

  const displayThreads: Thread[] = threads.length > 0 ? threads : [
    {
      conv_id: "mock-t1",
      coach_name: "Coach Reilly",
      preview: "Great session today! Braxton showed real improvement on his edges...",
      time: "2h",
      camp_name: "Summer Elite Camp",
    },
  ];

  const displayEvaluation: Evaluation = evaluation ?? {
    id: "mock-e1",
    child_name: displayKids[0].full_name,
    camp_name: "Summer Elite Camp",
    coach_name: "Coach Reilly",
    skating: 4, puck_control: 4, shooting: 3, hockey_sense: 4,
  };

  const displayRsvps: RsvpPrompt[] = rsvps.length > 0 ? rsvps : [
    {
      id: "mock-r1",
      child_name: displayKids[0].full_name,
      camp_name: "Summer Elite Skating Camp",
      session_date: addDays(1),
    },
    {
      id: "mock-r2",
      child_name: displayKids[1]?.full_name ?? displayKids[0].full_name,
      camp_name: "Skating Power Clinic",
      session_date: addDays(1),
    },
  ];

  // Next session per child — earliest upcoming (or currently-live) camp for each registered athlete.
  const nextSessions: NextSession[] = (() => {
    const todayYmd = ymd(today);
    const byChild = new Map<string, NextSession>();
    const sorted = [...displayCamps].sort((a, b) => (a.camp.start_date ?? "").localeCompare(b.camp.start_date ?? ""));
    for (const c of sorted) {
      if (byChild.has(c.child_name)) continue;
      const isUpcoming = c.camp.start_date && c.camp.start_date >= todayYmd;
      const live = isLive(c.camp.start_date, c.camp.end_date);
      if (!isUpcoming && !live) continue;
      byChild.set(c.child_name, {
        camp_id: c.camp.id,
        child_name: c.child_name,
        camp_name: c.camp.name,
        session_title: live ? "Edge Work & Power Skating" : null,
        session_date: live ? ymd(today) : c.camp.start_date!,
        start_time: "16:30",
        end_time: "18:00",
        venue_name: c.camp.venue_name,
      });
    }
    return Array.from(byChild.values()).sort((a, b) => a.session_date.localeCompare(b.session_date));
  })();

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-24 text-foreground">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Welcome back,</p>
          <h1 className="font-display text-2xl font-bold">{parentName || "Parent"}</h1>
        </div>
        <Link to="/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground">
          <Bell size={18} />
          {displayThreads.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal" />}
        </Link>
      </div>

      {/* My Athletes */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">My Athletes</h2>
        {(
          <div className={"mt-2 " + (displayKids.length > 1 ? "grid grid-cols-2 gap-3" : "")}>
            {displayKids.map((k) => {
              const open = expanded === k.id;
              const age = ageFrom(k.birthday);
              return (
                <div
                  key={k.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <button onClick={() => setExpanded(open ? null : k.id)} className="flex w-full flex-col items-center gap-2 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-teal/30 to-volt/20 font-display text-lg font-bold text-teal ring-2 ring-teal/40">
                      {initials(k.full_name)}
                    </div>
                    <p className="w-full break-words text-sm font-semibold leading-tight">{k.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[age != null ? `Age ${age}` : null, k.position].filter(Boolean).join(" · ") || "Profile"}
                    </p>
                    {k.skill_level && (
                      <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-volt">
                        {k.skill_level}
                      </span>
                    )}
                    <ChevronDown size={14} className={"mt-1 text-muted-foreground transition-transform " + (open ? "rotate-180" : "")} />
                  </button>
                  {open && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div>
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
                          <Cpu size={11} /> PXF Combine Stats
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 opacity-40">
                          {["Skating", "Shot", "Edges"].map((s) => (
                            <div key={s} className="rounded-lg border border-border bg-surface p-1.5 text-center">
                              <p className="font-display text-sm font-bold">--</p>
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{s}</p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">Connect PXF hardware to unlock</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Camp History</p>
                        <div className="mt-2 space-y-1">
                          {displayCamps.filter((r) => r.child_name === k.full_name).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No camps yet</p>
                          ) : (
                            displayCamps
                              .filter((r) => r.child_name === k.full_name)
                              .map((r) => (
                                <div key={r.reg_id} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="truncate">{r.camp.name}</span>
                                  <span className="whitespace-nowrap text-muted-foreground">{fmtDates(r.camp.start_date, r.camp.end_date)}</span>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RSVP prompt */}
      {/* Next Session */}
      <section className="mt-6">
        {hasActiveDryland === false && (
          <Link
            to="/parent/train"
            className="mb-3 flex items-center gap-3 rounded-2xl border border-volt/40 bg-volt/10 p-3"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt/20">
              <Dumbbell size={18} className="text-volt" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">No training program scheduled</p>
              <p className="text-[11px] text-muted-foreground">Browse free dryland programs to keep training between camps.</p>
            </div>
            <ChevronRight size={16} className="text-volt" />
          </Link>
        )}
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Next Session</h2>
        <div className="mt-2 space-y-2">
          {nextSessions.map((ns) => {
            const days = daysUntil(ns.session_date);
            const label = days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : new Date(ns.session_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
            return (
              <Link
                key={ns.child_name + ns.camp_id}
                to="/parent/camp/$campId"
                params={{ campId: ns.camp_id }}
                className="block rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">{ns.child_name}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold">{ns.camp_name}</p>
                    {ns.session_title && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{ns.session_title}</p>
                    )}
                  </div>
                  <span className={"whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold " + (days != null && days <= 1 ? "bg-teal/15 text-teal" : "bg-surface text-foreground border border-border")}>
                    {label}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    {new Date(ns.session_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                  </span>
                  {(ns.start_time || ns.end_time) && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} />
                      {[fmtTime(ns.start_time), fmtTime(ns.end_time)].filter(Boolean).join(" – ")}
                    </span>
                  )}
                  {ns.venue_name && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={11} />
                      {ns.venue_name}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tomorrow's RSVPs — one card per child per camp day */}
      {displayRsvps.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Tomorrow's RSVP</h2>
          <div className="mt-2 space-y-2">
            {displayRsvps.map((r) => (
              <div key={r.id} className="rounded-2xl border border-teal/40 bg-teal/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">{r.child_name}</p>
                <p className="mt-1 text-sm font-semibold">Is {r.child_name} attending {r.camp_name} tomorrow?</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => respondRsvp(r.id, "attending")} className="flex-1 rounded-full bg-teal py-2 text-xs font-bold text-background">Attending</button>
                  <button onClick={() => respondRsvp(r.id, "not_attending")} className="flex-1 rounded-full border border-border py-2 text-xs font-bold text-foreground">Not Attending</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Registered Camps */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Registered Camps</h2>
        <div className="mt-2 space-y-2">
          {displayCamps.map((r) => {
              const live = isLive(r.camp.start_date, r.camp.end_date);
              const d = daysUntil(r.camp.start_date);
              return (
                <Link key={r.reg_id} to="/parent/camp/$campId" params={{ campId: r.camp.id }} className="block rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.camp.name}</p>
                      {r.coach_name && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[2px] text-teal">{r.coach_name}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">For {r.child_name}</p>
                    </div>
                    {live ? (
                      <span className="flex items-center gap-1 rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-volt" /> LIVE
                      </span>
                    ) : d != null && d >= 0 ? (
                      <span className="whitespace-nowrap rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">
                        {d === 0 ? "Today" : `${d} day${d === 1 ? "" : "s"} away`}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={11} />{r.camp.venue_name ?? "Venue TBA"}</span>
                    <span>{fmtDates(r.camp.start_date, r.camp.end_date)}</span>
                  </div>
                </Link>
              );
            })}
        </div>
      </section>

      {/* Unread Messages */}
      {displayThreads.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Unread Messages</h2>
          <div className="mt-2 space-y-2">
            {displayThreads.map((t) => (
              <Link key={t.conv_id} to="/parent/inbox" className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
                  {initials(t.coach_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{t.coach_name}</p>
                    <span className="text-[10px] text-muted-foreground">{t.time}</span>
                  </div>
                  {t.camp_name && <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal/80">{t.camp_name}</p>}
                  <p className="truncate text-xs text-muted-foreground">{t.preview}</p>
                </div>
                <span className="mt-2 h-2 w-2 rounded-full bg-teal" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest Evaluation */}
      {displayEvaluation && (
        <section className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Latest Evaluation</h2>
          <Link to="/parent/camp/$campId" params={{ campId: displayCamps[0]?.camp.id ?? "" }} className="mt-2 block rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{displayEvaluation.child_name}</p>
              <ChevronRight size={14} className="text-teal" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {[displayEvaluation.coach_name, displayEvaluation.camp_name].filter(Boolean).join(" · ") || "Coach evaluation"}
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                { label: "Skating", v: displayEvaluation.skating },
                { label: "Puck Control", v: displayEvaluation.puck_control },
                { label: "Shooting", v: displayEvaluation.shooting },
                { label: "Hockey IQ", v: displayEvaluation.hockey_sense },
              ].filter((r) => r.v != null).map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="w-24 text-xs">{r.label}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} className={s <= (r.v ?? 0) ? "fill-volt text-volt" : "text-muted-foreground"} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] italic text-muted-foreground">"Strong edge control, needs to work on backward crossovers"</p>
          </Link>
        </section>
      )}
    </div>
  );
}
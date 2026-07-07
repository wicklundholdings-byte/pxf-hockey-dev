import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Star, ChevronRight, ChevronDown, Cpu, Calendar, Clock, Dumbbell, Trophy, Image as ImageIcon, Swords, CheckCircle2, X, CreditCard, Camera, Share2, Download, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OutstandingPayments } from "@/components/parent/outstanding-payments";

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
type TeamCard = { id: string; name: string; season: string | null; logo_url: string | null; primary_color: string | null; coach_name: string | null; player_count: number };
type NextUpItem = {
  kind: "camp" | "game" | "practice";
  link_to: "/parent/camp/$campId" | "/parent/teams/$teamId";
  link_params: { campId?: string; teamId?: string };
  child_name: string;
  title: string;
  subtitle: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
};
type MediaItem = { id: string; thumb_url: string; athlete_name: string | null; kind: "photo" | "video"; tag?: string; date?: string; session?: string; note?: string; icon?: "puck" | "camera" };
type DrylandWeek = { done: number; goal: number; team_name: string; rank: number };

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
  const [teams, setTeams] = useState<TeamCard[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [openMedia, setOpenMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setParentName(prof?.full_name ?? user.email?.split("@")[0] ?? "Parent");

      // Recent media for this parent's athletes
      try {
        const { data: kRows } = await supabase.from("attendees").select("id, full_name").eq("owner_id", user.id);
        const aIds = ((kRows ?? []) as { id: string; full_name: string }[]);
        if (aIds.length) {
          const nameMap = new Map(aIds.map((k) => [k.id, k.full_name]));
          const { data: media } = await supabase
            .from("athlete_media")
            .select("id, thumbnail_url, media_url, media_type, athlete_id, created_at")
            .in("athlete_id", aIds.map((k) => k.id))
            .order("created_at", { ascending: false })
            .limit(3);
          const items = ((media ?? []) as any[]).map((m) => ({
            id: m.id,
            thumb_url: m.thumbnail_url ?? m.media_url,
            athlete_name: nameMap.get(m.athlete_id) ?? null,
            kind: (m.media_type === "video" ? "video" : "photo") as "photo" | "video",
          }));
          setRecentMedia(items);
        }
      } catch {
        /* keep mock fallback */
      }

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

      // Teams for this parent's athletes
      try {
        const ids = await (supabase as any).rpc("current_user_contact_ids");
        const contactIds = (ids.data ?? []) as string[];
        if (contactIds.length) {
          const { data: tps } = await supabase.from("team_players").select("team_id").in("parent_contact_id", contactIds);
          const teamIds = Array.from(new Set(((tps ?? []) as { team_id: string }[]).map((r) => r.team_id)));
          if (teamIds.length) {
            const { data: ts } = await supabase.from("teams").select("id,name,season,logo_url,primary_color,coach_id").in("id", teamIds);
            const rows = (ts ?? []) as { id: string; name: string; season: string | null; logo_url: string | null; primary_color: string | null; coach_id: string }[];
            const coachIds = Array.from(new Set(rows.map((r) => r.coach_id)));
            const [{ data: coaches }, { data: counts }] = await Promise.all([
              coachIds.length ? supabase.from("profiles").select("id,full_name").in("id", coachIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
              supabase.from("team_players").select("team_id").in("team_id", teamIds),
            ]);
            const coachMap = new Map(((coaches ?? []) as { id: string; full_name: string | null }[]).map((c) => [c.id, c.full_name]));
            const countMap = new Map<string, number>();
            ((counts ?? []) as { team_id: string }[]).forEach((r) => { countMap.set(r.team_id, (countMap.get(r.team_id) ?? 0) + 1); });
            setTeams(rows.map((r) => ({
              id: r.id, name: r.name, season: r.season, logo_url: r.logo_url, primary_color: r.primary_color,
              coach_name: coachMap.get(r.coach_id) ?? null, player_count: countMap.get(r.id) ?? 0,
            })));
          }
        }
      } catch {
        setTeams([]);
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
          const { data: coaches } = await (supabase as any).rpc("get_profile_names", { _ids: coachIds });
          ((coaches ?? []) as Array<{ id: string; full_name: string | null }>).forEach((c) =>
            coachMap.set(c.id, c.full_name ?? "Coach"),
          );
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
          const { data: senders } = await (supabase as any).rpc("get_profile_names", { _ids: senderIds });
          ((senders ?? []) as Array<{ id: string; full_name: string | null }>).forEach((s) =>
            senderMap.set(s.id, s.full_name ?? "Coach"),
          );
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

  const displayTeams: TeamCard[] = teams.length > 0 ? teams : [
    { id: "mock-team-1", name: "Spring Selects", season: "2025", logo_url: null, primary_color: null, coach_name: "Coach Park", player_count: 14 },
  ];

  // Next Up — single soonest event across camps + team games/practices.
  const nextUp: NextUpItem | null = (() => {
    const todayYmd = ymd(today);
    const candidates: NextUpItem[] = [];
    for (const c of displayCamps) {
      const live = isLive(c.camp.start_date, c.camp.end_date);
      const upcoming = c.camp.start_date && c.camp.start_date >= todayYmd;
      if (!live && !upcoming) continue;
      candidates.push({
        kind: "camp",
        link_to: "/parent/camp/$campId",
        link_params: { campId: c.camp.id },
        child_name: c.child_name,
        title: c.camp.name,
        subtitle: live ? "Edge Work & Power Skating" : null,
        date: live ? ymd(today) : c.camp.start_date!,
        start_time: "16:30",
        end_time: "18:00",
        venue: c.camp.venue_name,
      });
    }
    // Mock team game so layout is rich before live team_events data lands.
    if (displayTeams[0]) {
      candidates.push({
        kind: "game",
        link_to: "/parent/teams/$teamId",
        link_params: { teamId: displayTeams[0].id },
        child_name: displayKids[0].full_name,
        title: `${displayTeams[0].name} vs Northstars`,
        subtitle: "Regular Season Game",
        date: addDays(2),
        start_time: "18:30",
        end_time: "20:00",
        venue: "Iceland Arena · Rink 2",
      });
    }
    candidates.sort((a, b) =>
      (a.date + (a.start_time ?? "")).localeCompare(b.date + (b.start_time ?? "")),
    );
    return candidates[0] ?? null;
  })();

  const alexName = displayKids[0]?.full_name ?? "Alex Dev";
  const samName = displayKids[1]?.full_name ?? "Sam Dev";
  const displayMedia: MediaItem[] = [
    { id: "mm1", thumb_url: "", athlete_name: alexName, kind: "video", tag: "Edge Work", date: "Jul 5", session: "Jul 5 Practice", note: "Good edge work on the left side. Watch knee bend.", icon: "puck" },
    { id: "mm2", thumb_url: "", athlete_name: samName, kind: "video", tag: "Skating", date: "Jul 3", session: "Jul 3 Skating Session", note: "Strong crossovers — keep chest tall through the turn.", icon: "puck" },
    { id: "mm3", thumb_url: "", athlete_name: "Team Photo", kind: "photo", tag: "Lightning U14", date: "Jul 1", session: "Lightning U14 Team Photo", note: "Team photo from July 1 practice.", icon: "camera" },
  ];

  const dryland: DrylandWeek = { done: 2, goal: 3, team_name: displayTeams[0]?.name ?? "Lightning U14", rank: 2 };

  const firstName = (parentName || user?.email?.split("@")[0] || "there").split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-24 text-foreground">
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight">Hey {firstName},</h1>
        <p className="text-base font-light text-muted-foreground">Here's what's happening.</p>
      </div>

      <OutstandingPayments />

      {/* My Athletes */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">My Athletes</h2>
        {(
          <div className={"mt-2 " + (displayKids.length > 1 ? "grid grid-cols-2 gap-3" : "")}>
            {displayKids.map((k) => {
              const open = expanded === k.id;
              const age = ageFrom(k.birthday);
              const routeId = k.full_name.toLowerCase().includes("sam") ? "sam" : "alex";
              return (
                <div
                  key={k.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <Link
                    to="/parent/athlete/$athleteId"
                    params={{ athleteId: routeId }}
                    className="flex w-full flex-col items-center gap-2 text-center"
                  >
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
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-teal">View Profile →</span>
                  </Link>
                  <button onClick={() => setExpanded(open ? null : k.id)} className="mt-2 flex w-full items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    Quick stats <ChevronDown size={12} className={"transition-transform " + (open ? "rotate-180" : "")} />
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

      {/* Next Up — soonest event across all sources */}
      {nextUp && (
        <section className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Next Up</h2>
          <Link
            to={nextUp.link_to}
            params={nextUp.link_params as any}
            className="mt-2 block rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">{nextUp.child_name}</p>
                <p className="mt-0.5 truncate text-sm font-semibold">{nextUp.title}</p>
                {nextUp.subtitle && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{nextUp.subtitle}</p>
                )}
              </div>
              {(() => {
                const days = daysUntil(nextUp.date);
                const label = days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : new Date(nextUp.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                return (
                  <span className={"whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold " + (days != null && days <= 1 ? "bg-teal/15 text-teal" : "bg-surface text-foreground border border-border")}>
                    {label}
                  </span>
                );
              })()}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar size={11} />
                {new Date(nextUp.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </span>
              {(nextUp.start_time || nextUp.end_time) && (
                <span className="flex items-center gap-1.5">
                  <Clock size={11} />
                  {[fmtTime(nextUp.start_time), fmtTime(nextUp.end_time)].filter(Boolean).join(" – ")}
                </span>
              )}
              {nextUp.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} />
                  {nextUp.venue}
                </span>
              )}
              {nextUp.kind === "game" && (
                <span className="flex items-center gap-1.5">
                  <Swords size={11} />
                  Team Game
                </span>
              )}
            </div>
          </Link>
        </section>
      )}

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

      {/* Payments */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Payments</h2>
        <div className="mt-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Outstanding Balance</p>
          <p className="mt-1 font-display text-3xl font-bold text-teal">${paid ? "0.00" : "450.00"}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{paid ? "Paid Jul 7" : "Due Jul 15"}</p>
          <button
            onClick={() => setPayOpen(true)}
            disabled={paid}
            className="mt-3 w-full rounded-full bg-gradient-to-r from-teal to-teal/70 py-2.5 text-sm font-bold text-background disabled:opacity-50"
          >
            {paid ? "Paid ✓" : "Pay Now →"}
          </button>

          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Recent Payments</p>
            <div className="mt-2 space-y-2">
              {[
                { name: "Summer Elite Camp deposit", amt: "$225", date: "Jun 28" },
                { name: "Skating Power Clinic", amt: "$175", date: "Jun 15" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={14} className="shrink-0 text-teal" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="font-semibold">{p.amt}</span>
                  <span className="text-muted-foreground">· {p.date}</span>
                </div>
              ))}
            </div>
            <Link to="/parent/invoices" className="mt-3 block text-[11px] font-semibold text-teal">View All Invoices →</Link>
          </div>
        </div>
      </section>

      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => setPayOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Invoice</p>
                <p className="mt-1 text-sm font-semibold">Summer Elite Camp balance</p>
              </div>
              <button onClick={() => setPayOpen(false)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Amount</p>
              <p className="mt-1 font-display text-3xl font-bold text-teal">$450.00</p>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="grid h-9 w-12 place-items-center rounded-md bg-surface-2">
                <CreditCard size={16} className="text-teal" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Card ending in 4242</p>
                <p className="text-[11px] text-muted-foreground">Visa · Saved</p>
              </div>
            </div>
            <button
              onClick={() => { setPaid(true); setPayOpen(false); }}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-teal to-teal/70 py-3 text-sm font-bold text-background"
            >
              Confirm Payment
            </button>
            <button className="mt-2 w-full text-center text-[12px] font-semibold text-teal">Use Different Card</button>
          </div>
        </div>
      )}

      {/* Dryland This Week */}
      <section className="mt-6">
        <Link to="/parent/train" className="block rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Dryland This Week</h2>
            <Dumbbell size={14} className="text-teal" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-sm font-semibold">{dryland.done} of {dryland.goal} sessions</p>
            <p className="text-[11px] text-muted-foreground">{Math.round((dryland.done / dryland.goal) * 100)}%</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, (dryland.done / dryland.goal) * 100)}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Trophy size={12} className="text-volt" />
            <span>Ranked #{dryland.rank} on {dryland.team_name}</span>
          </div>
        </Link>
      </section>

      {/* My Teams */}
      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">My Teams</h2>
        <div className="mt-2 space-y-2">
          {displayTeams.map((t) => (
            <Link
              key={t.id}
              to="/parent/teams/$teamId"
              params={{ teamId: t.id }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {t.logo_url ? (
                  <img src={t.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl text-xs font-bold text-background"
                    style={{ background: t.primary_color || "var(--color-teal)" }}
                  >
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[t.season, t.coach_name ? `Coach ${t.coach_name}` : null, `${t.player_count} players`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Media */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Recent Media</h2>
          <Link to="/parent/media" className="text-[11px] font-semibold text-teal">
            See All →
          </Link>
        </div>
        <div className="-mx-5 mt-2 flex gap-3 overflow-x-auto px-5 pb-1">
          {displayMedia.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpenMedia(m)}
              className="relative flex h-40 w-44 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left"
            >
              <div className="flex flex-1 items-center justify-center bg-surface-2/40">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-2">
                  {m.icon === "camera" ? (
                    <Camera size={24} className="text-muted-foreground" />
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <ellipse cx="12" cy="12" rx="9" ry="4" />
                      <path d="M3 12v3c0 2.2 4 4 9 4s9-1.8 9-4v-3" />
                    </svg>
                  )}
                </div>
              </div>
              {m.kind === "video" && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-white">
                  <Play size={11} />
                </span>
              )}
              <div className="border-t border-border bg-card px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold text-foreground">{m.athlete_name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  <span className="text-teal">{m.tag}</span> · {m.date}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {openMedia && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{openMedia.athlete_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{openMedia.session}</p>
            </div>
            <button onClick={() => setOpenMedia(null)} className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center bg-black">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-surface-2">
              {openMedia.icon === "camera" ? (
                <Camera size={40} className="text-muted-foreground" />
              ) : (
                <Play size={40} className="text-white" />
              )}
            </div>
          </div>
          <div className="border-t border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Coach Note</p>
            <p className="mt-1 text-sm text-foreground">{openMedia.note}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface py-2.5 text-xs font-bold text-foreground">
                <Share2 size={14} /> Share
              </button>
              <button className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-background">
                <Download size={14} /> Save to Camera Roll
              </button>
            </div>
          </div>
        </div>
      )}

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
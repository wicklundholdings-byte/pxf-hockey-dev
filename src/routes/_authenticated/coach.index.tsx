import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, Users, ChevronRight, AlertTriangle, Snowflake, Plus, Image as ImageIcon, Trophy, ChevronDown, CalendarDays } from "lucide-react";
import { TeamEventRow } from "@/components/teams/team-event-row";
import { useCurrentTier } from "@/hooks/use-tier";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/coach/")({
  component: CoachDashboardRoot,
});

function CoachDashboardRoot() {
  const { tier, dbTier, loading } = useCurrentTier();
  if (loading) return <div className="h-40" />;
  const effectiveCoachTier = tier === "parent" && dbTier ? dbTier : tier;
  return effectiveCoachTier === "elite" ? <EliteCoachDashboard /> : <TeamCoachDashboard />;
}

type Camp = { id: string; name: string; slug: string; capacity: number; status: string; start_date: string | null; price_cents: number };
type Reg = { id: string; status: string; amount_cents: number; created_at: string; camp_id: string; attendee_id: string | null; contact_id: string | null };

function fmtMoney(cents: number) {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type Camp2 = Camp & { end_date?: string | null };
type CampSession = { id: string; camp_id: string; session_date: string; start_time: string | null; end_time: string | null };
type EventLite = {
  id: string; event_type: string; title: string | null; opponent_name: string | null;
  venue: string | null; event_date: string; start_time: string | null; team_id?: string; team_name?: string | null;
  link: { to: string; params: Record<string, string> };
};
type KidLite = { id: string; full_name: string; birthday: string | null; position: string | null };
type TeamLite = { id: string; name: string; season: string | null; logo_url: string | null; primary_color: string | null; role: "coach" | "parent" };
type LeaderLite = { athlete_id: string; name: string; team_name: string; count: number };
type MediaLite = { id: string; thumb_url: string; athlete_name: string | null; team_id: string };

function ageOf(b: string | null) {
  if (!b) return null;
  const d = new Date(b + "T00:00:00");
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}
function fmtEventDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10); const ap = hr >= 12 ? "PM" : "AM"; const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}
function fmtCampRange(s: string | null, e?: string | null) {
  if (!s) return "—";
  const a = new Date(s + "T00:00:00");
  const b = e ? new Date(e + "T00:00:00") : null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!b) return a.toLocaleDateString(undefined, opts);
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`;
}

function EliteCoachDashboard() {
  const { user } = useAuth();
  const [coachName, setCoachName] = useState("");
  const [camps, setCamps] = useState<Camp2[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [unassignedCampIds, setUnassignedCampIds] = useState<string[]>([]);
  const [missingHealthCount, setMissingHealthCount] = useState(0);
  const [kids, setKids] = useState<KidLite[]>([]);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [leaders, setLeaders] = useState<LeaderLite[]>([]);
  const [media, setMedia] = useState<MediaLite[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setCoachName(prof?.full_name ?? user.email?.split("@")[0] ?? "Coach");

      const [c, r, st] = await Promise.all([
        supabase.from("camps").select("id,name,slug,capacity,status,start_date,end_date,price_cents").order("start_date", { ascending: true }),
        supabase.from("registrations").select("id,status,amount_cents,created_at,camp_id,attendee_id,contact_id").order("created_at", { ascending: false }),
        (supabase as any).from("camp_staff").select("camp_id"),
      ]);
      const campsRows = ((c.data ?? []) as Camp2[]);
      const regsRows = ((r.data ?? []) as Reg[]);
      setCamps(campsRows);
      setRegs(regsRows);
      const staffed = new Set(((st.data as any[]) ?? []).map((row) => row.camp_id as string));
      const upcomingCamps = campsRows.filter((cc) => cc.status !== "ended");
      setUnassignedCampIds(upcomingCamps.filter((cc) => !staffed.has(cc.id)).map((cc) => cc.id));

      // Missing health forms
      const attendeeIds = Array.from(new Set(regsRows.map((x) => x.attendee_id).filter(Boolean) as string[]));
      if (attendeeIds.length) {
        const { data: hp } = await (supabase as any).from("athlete_health_profiles").select("athlete_id").in("athlete_id", attendeeIds);
        const have = new Set(((hp ?? []) as any[]).map((h) => h.athlete_id));
        setMissingHealthCount(attendeeIds.filter((id) => !have.has(id)).length);
      }

      // Kids
      try {
        const ids = await (supabase as any).rpc("current_user_contact_ids");
        const myContactIds = (ids.data ?? []) as string[];
        if (myContactIds.length) {
          const { data: kRows } = await supabase.from("attendees").select("id, full_name, birthday, position").in("contact_id", myContactIds);
          setKids((kRows ?? []) as KidLite[]);
        }
      } catch { /* noop */ }

      // Teams (coached + parent)
      const { data: coachTeams } = await supabase.from("teams").select("id,name,season,logo_url,primary_color").eq("coach_id", user.id);
      const coachedRows: TeamLite[] = ((coachTeams ?? []) as any[]).map((t) => ({ ...t, role: "coach" }));
      const coachedIds = new Set(coachedRows.map((t) => t.id));
      let parentRows: TeamLite[] = [];
      try {
        const ids = await (supabase as any).rpc("current_user_contact_ids");
        const contactIds = (ids.data ?? []) as string[];
        if (contactIds.length) {
          const { data: tps } = await supabase.from("team_players").select("team_id").in("parent_contact_id", contactIds);
          const parentTeamIds = Array.from(new Set(((tps ?? []) as any[]).map((r) => r.team_id))).filter((id) => !coachedIds.has(id));
          if (parentTeamIds.length) {
            const { data: pt } = await supabase.from("teams").select("id,name,season,logo_url,primary_color").in("id", parentTeamIds);
            parentRows = ((pt ?? []) as any[]).map((t) => ({ ...t, role: "parent" }));
          }
        }
      } catch { /* noop */ }
      const allTeams = [...coachedRows, ...parentRows];
      setTeams(allTeams);

      // Next 7 days: team events + camp sessions
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const allTeamIds = allTeams.map((t) => t.id);
      const evs: EventLite[] = [];
      if (allTeamIds.length) {
        const { data: te } = await supabase
          .from("team_events")
          .select("id,event_type,title,opponent_name,venue,event_date,start_time,team_id, teams(name)")
          .in("team_id", allTeamIds)
          .in("event_type", ["game", "practice"])
          .gte("event_date", today).lte("event_date", in7);
        ((te ?? []) as any[]).forEach((x) => evs.push({
          id: x.id, event_type: x.event_type, title: x.title, opponent_name: x.opponent_name,
          venue: x.venue, event_date: x.event_date, start_time: x.start_time,
          team_id: x.team_id, team_name: x.teams?.name ?? null,
          link: { to: "/coach/teams/$teamId/schedule/$eventId", params: { teamId: x.team_id, eventId: x.id } },
        }));
      }
      const { data: cs } = await supabase
        .from("camp_sessions").select("id,camp_id,session_date,start_time,end_time")
        .gte("session_date", today).lte("session_date", in7);
      const campNameById = new Map(campsRows.map((cc) => [cc.id, cc.name]));
      ((cs ?? []) as CampSession[]).forEach((x) => {
        const cname = campNameById.get(x.camp_id) ?? "Camp";
        evs.push({
          id: x.id, event_type: "camp", title: cname, opponent_name: null,
          venue: null, event_date: x.session_date, start_time: x.start_time, team_name: cname,
          link: { to: "/coach/camps/$campId", params: { campId: x.camp_id } },
        });
      });
      evs.sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
      setEvents(evs);

      // Dryland leaderboard (top 3 across all teams this week)
      if (allTeamIds.length) {
        const { data: players } = await supabase.from("team_players").select("athlete_id, team_id").in("team_id", allTeamIds);
        const playerRows = ((players ?? []) as any[]);
        const athleteIds = Array.from(new Set(playerRows.map((p) => p.athlete_id).filter(Boolean)));
        const teamByAthlete = new Map<string, string>();
        playerRows.forEach((p) => { if (p.athlete_id && !teamByAthlete.has(p.athlete_id)) teamByAthlete.set(p.athlete_id, p.team_id); });
        const teamNameById = new Map(allTeams.map((t) => [t.id, t.name]));
        if (athleteIds.length) {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          const { data: an } = await supabase.from("attendees").select("id, full_name").in("id", athleteIds);
          const nameMap = new Map(((an ?? []) as any[]).map((a) => [a.id, a.full_name as string]));
          const { data: prog } = await supabase
            .from("dryland_watch_progress").select("athlete_id, completed, last_watched_at")
            .in("athlete_id", athleteIds).eq("completed", true).gte("last_watched_at", weekAgo);
          const counts = new Map<string, number>();
          ((prog ?? []) as any[]).forEach((rr) => counts.set(rr.athlete_id, (counts.get(rr.athlete_id) ?? 0) + 1));
          const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
          setLeaders(top.map(([id, count]) => ({
            athlete_id: id, name: nameMap.get(id) ?? "Athlete",
            team_name: teamNameById.get(teamByAthlete.get(id) ?? "") ?? "", count,
          })));
          // Recent media
          const { data: med } = await supabase
            .from("athlete_media").select("id, thumbnail_url, video_url, athlete_id, recorded_at")
            .in("athlete_id", athleteIds).order("recorded_at", { ascending: false }).limit(3);
          setMedia(((med ?? []) as any[]).map((m) => ({
            id: m.id, thumb_url: m.thumbnail_url ?? m.video_url,
            athlete_name: nameMap.get(m.athlete_id) ?? null,
            team_id: teamByAthlete.get(m.athlete_id) ?? "",
          })));
        }
      }
    })();
  }, [user?.id]);

  // Revenue MTD + trend vs last month-to-day
  const revenue = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, day, 23, 59, 59);
    const paid = regs.filter((r) => r.status === "paid");
    const inRange = (iso: string, a: Date, b: Date) => {
      const d = new Date(iso);
      return d >= a && d <= b;
    };
    const grossThis = paid.filter((r) => inRange(r.created_at, thisMonthStart, now)).reduce((s, r) => s + r.amount_cents, 0);
    const grossLast = paid.filter((r) => inRange(r.created_at, lastMonthStart, lastMonthSameDay)).reduce((s, r) => s + r.amount_cents, 0);
    const feesThis = Math.round(grossThis * 0.029) + paid.filter((r) => inRange(r.created_at, thisMonthStart, now)).length * 30;
    const feesLast = Math.round(grossLast * 0.029) + paid.filter((r) => inRange(r.created_at, lastMonthStart, lastMonthSameDay)).length * 30;
    const netThis = grossThis - feesThis;
    const netLast = grossLast - feesLast;
    const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));
    return { grossThis, netThis, grossTrend: pct(grossThis, grossLast), netTrend: pct(netThis, netLast) };
  }, [regs]);

  // Registrations this month
  const regsThisMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const inMonth = regs.filter((r) => new Date(r.created_at) >= start);
    const confirmed = inMonth.filter((r) => r.status === "paid").length;
    const pending = inMonth.filter((r) => r.status === "pending" || r.status === "unpaid").length;
    return { total: inMonth.length, confirmed, pending };
  }, [regs]);

  const regsByCamp = useMemo(() => {
    const m = new Map<string, number>();
    regs.filter((r) => r.status === "paid").forEach((r) => m.set(r.camp_id, (m.get(r.camp_id) ?? 0) + 1));
    return m;
  }, [regs]);
  const revenueByCamp = useMemo(() => {
    const m = new Map<string, number>();
    regs.filter((r) => r.status === "paid").forEach((r) => m.set(r.camp_id, (m.get(r.camp_id) ?? 0) + r.amount_cents));
    return m;
  }, [regs]);

  const activeCamps = camps.filter((c) => c.status === "live");
  const lowEnrollCamps = camps.filter((c) => {
    if (c.status === "ended" || !c.capacity) return false;
    const filled = regsByCamp.get(c.id) ?? 0;
    return filled / c.capacity < 0.5;
  });
  const unpaidCount = regs.filter((r) => r.status === "pending" || r.status === "unpaid").length;

  const firstName = (coachName || user?.email?.split("@")[0] || "Coach").split(/\s+/)[0];
  const hasAlerts = unassignedCampIds.length > 0 || missingHealthCount > 0 || lowEnrollCamps.length > 0 || unpaidCount > 0;

  const Trend = ({ pct }: { pct: number }) => {
    if (pct === 0) return <span className="text-[10px] text-muted-foreground">flat vs last mo</span>;
    const up = pct > 0;
    const Icon = up ? TrendingUp : TrendingDown;
    return (
      <span className={"flex items-center gap-0.5 text-[10px] font-bold " + (up ? "text-emerald-400" : "text-red-400")}>
        <Icon size={10} /> {up ? "+" : ""}{pct}%
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight">Hey {firstName},</h1>
        <p className="text-base font-light text-muted-foreground">Here's what's happening.</p>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <section className="space-y-2">
          {unassignedCampIds.length > 0 && (
            <Link to="/coach/camps" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3">
              <AlertTriangle size={18} className="text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{unassignedCampIds.length} camp{unassignedCampIds.length === 1 ? "" : "s"} need a coach assigned</p>
                <p className="text-[10px] text-muted-foreground">Tap to assign staff</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          )}
          {missingHealthCount > 0 && (
            <Link to="/coach/attendees" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3">
              <AlertTriangle size={18} className="text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{missingHealthCount} athlete{missingHealthCount === 1 ? "" : "s"} missing health forms</p>
                <p className="text-[10px] text-muted-foreground">Request from parents</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          )}
          {lowEnrollCamps.length > 0 && (
            <Link to="/coach/camps" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3">
              <AlertTriangle size={18} className="text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{lowEnrollCamps.length} camp{lowEnrollCamps.length === 1 ? "" : "s"} under 50% enrolled</p>
                <p className="text-[10px] text-muted-foreground">Promote to fill seats</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          )}
          {unpaidCount > 0 && (
            <Link to="/coach/financials" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3">
              <DollarSign size={18} className="text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{unpaidCount} unpaid registration{unpaidCount === 1 ? "" : "s"}</p>
                <p className="text-[10px] text-muted-foreground">Send payment reminders</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          )}
        </section>
      )}

      {/* Revenue Snapshot */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Revenue · Month to date</h2>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Link to="/coach/financials" className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Gross sales</span>
              <DollarSign size={14} className="text-teal" />
            </div>
            <div className="mt-1 font-display text-xl font-bold text-teal">{fmtMoney(revenue.grossThis)}</div>
            <div className="mt-1"><Trend pct={revenue.grossTrend} /></div>
          </Link>
          <Link to="/coach/financials" className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Net sales</span>
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <div className="mt-1 font-display text-xl font-bold text-emerald-400">{fmtMoney(revenue.netThis)}</div>
            <div className="mt-1"><Trend pct={revenue.netTrend} /></div>
          </Link>
        </div>
      </section>

      {/* Active Camps horizontal scroll */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Active Camps</h2>
          <Link to="/coach/camps" className="text-[11px] font-semibold text-teal">View all</Link>
        </div>
        <div className="-mx-5 mt-2 flex gap-3 overflow-x-auto px-5 pb-1">
          {activeCamps.map((c) => {
            const filled = regsByCamp.get(c.id) ?? 0;
            const rev = revenueByCamp.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                to="/coach/camps/$campId"
                params={{ campId: c.id }}
                className="w-60 shrink-0 rounded-2xl border border-border bg-card p-3"
              >
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtCampRange(c.start_date, c.end_date)}</p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{filled} / {c.capacity || 0} spots</span>
                  <span className="font-bold text-teal">{fmtMoney(rev)}</span>
                </div>
              </Link>
            );
          })}
          <Link
            to="/coach/camps/new"
            className="grid w-44 shrink-0 place-items-center rounded-2xl border border-dashed border-teal/40 bg-transparent p-3 text-center"
          >
            <div>
              <Plus size={20} className="mx-auto text-teal" />
              <p className="mt-1 text-[11px] font-semibold text-teal">Add Camp</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Registrations */}
      <section>
        <Link to="/coach/roster" className="block rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Registrations · This month</h2>
            <ChevronRight size={14} className="text-muted-foreground" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">{regsThisMonth.total}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <span className="font-bold text-emerald-400">{regsThisMonth.confirmed} confirmed</span>
            <span className="mx-1">·</span>
            <span className="font-bold text-amber-400">{regsThisMonth.pending} pending</span>
          </p>
        </Link>
      </section>

      {/* My Athletes */}
      {kids.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">My Athletes</h2>
          <div className={"mt-2 " + (kids.length > 1 ? "grid grid-cols-2 gap-3" : "")}>
            {kids.map((k) => {
              const age = ageOf(k.birthday);
              const inits = k.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
              return (
                <div key={k.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-teal/30 to-volt/20 font-display text-lg font-bold text-teal ring-2 ring-teal/40">
                      {inits}
                    </div>
                    <p className="w-full break-words text-sm font-semibold leading-tight">{k.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[age != null ? `Age ${age}` : null, k.position].filter(Boolean).join(" · ") || "Profile"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Next Up */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Next Up · 7 days</h2>
        {events.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            No events scheduled in the next 7 days.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {events.map((e) => (
              <Link key={`${e.event_type}-${e.id}`} to={e.link.to} params={e.link.params} className="block">
                <TeamEventRow event={{
                  event_type: e.event_type, title: e.title, opponent_name: e.opponent_name,
                  venue: e.venue, event_date: e.event_date, start_time: e.start_time, team_name: e.team_name,
                }} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Teams */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">My Teams</h2>
        {teams.length === 0 ? (
          <Link to="/coach/teams" className="mt-2 flex items-center justify-between rounded-2xl border border-dashed border-border bg-card p-4">
            <span className="text-xs text-muted-foreground">No teams yet. Tap to create one.</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        ) : (
          <div className="mt-2 space-y-2">
            {teams.map((t) => {
              const isCoach = t.role === "coach";
              const linkProps = isCoach
                ? { to: "/coach/teams/$teamId" as const, params: { teamId: t.id } }
                : { to: "/parent/teams/$teamId" as const, params: { teamId: t.id } };
              return (
                <Link key={t.id} {...linkProps} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
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
                      <p className="truncate text-[11px] text-muted-foreground">{t.season ?? ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider " + (isCoach ? "bg-teal/15 text-teal" : "bg-volt/15 text-volt")}>
                      {isCoach ? "COACH" : "PARENT"}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Dryland This Week */}
      <section>
        <Link to="/coach/analytics" className="block rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Dryland This Week</h2>
            <Trophy size={14} className="text-volt" />
          </div>
          {leaders.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No completed sessions yet this week.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {leaders.map((l, idx) => (
                <li key={l.athlete_id} className="flex items-center gap-3">
                  <span className={"grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold " + (idx === 0 ? "bg-volt/20 text-volt" : "bg-surface text-foreground")}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{l.team_name}</p>
                  </div>
                  <span className="text-xs font-bold text-teal">{l.count} session{l.count === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ol>
          )}
        </Link>
      </section>

      {/* Recent Media */}
      {media.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Recent Media</h2>
          </div>
          <div className="-mx-5 mt-2 flex gap-3 overflow-x-auto px-5 pb-1">
            {media.map((m) => (
              <div key={m.id} className="relative block h-32 w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface">
                {m.thumb_url ? (
                  <img src={m.thumb_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageIcon size={20} /></div>
                )}
                {m.athlete_name && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold text-foreground">
                    {m.athlete_name.split(/\s+/)[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ice Times + Create Session */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/coach/ice" className="flex items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-transparent py-3 text-center transition-colors hover:bg-teal/5">
          <Snowflake size={18} className="text-teal" />
          <span className="text-xs font-semibold text-teal">Add Ice Times</span>
        </Link>
        <Link to="/coach/sessions" className="flex items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-transparent py-3 text-center transition-colors hover:bg-teal/5">
          <Plus size={18} className="text-teal" />
          <span className="text-xs font-semibold text-teal">{"\u00a0"}Create Session</span>
        </Link>
      </div>
    </div>
  );
}

// ====================== Team / Association Coach Dashboard ======================

type Kid = { id: string; full_name: string; birthday: string | null; position: string | null; skill_level: string | null };
type TeamRow = { id: string; name: string; season: string | null; logo_url: string | null; primary_color: string | null; role: "coach" | "parent" };
type EventRow = {
  id: string; event_type: string; title: string | null; opponent_name: string | null; venue: string | null;
  event_date: string; start_time: string | null; team_name: string | null; team_id: string;
};
type LeaderRow = { athlete_id: string; name: string; team_name: string; count: number };
type MediaRow = { id: string; thumb_url: string; athlete_name: string | null; team_id: string };

function ageFrom(b: string | null) {
  if (!b) return null;
  const d = new Date(b + "T00:00:00");
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function TeamCoachDashboard() {
  const { user } = useAuth();
  const [coachName, setCoachName] = useState("");
  const [kids, setKids] = useState<Kid[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setCoachName(prof?.full_name ?? user.email?.split("@")[0] ?? "Coach");

      // Linked children athletes (only when the coach is ALSO a parent of those
      // athletes — match via their parent contact record, not owner_id, since
      // coaches own their entire roster's attendee rows).
      try {
        const ids = await (supabase as any).rpc("current_user_contact_ids");
        const myContactIds = (ids.data ?? []) as string[];
        if (myContactIds.length) {
          const { data: kRows } = await supabase
            .from("attendees")
            .select("id, full_name, birthday, position, skill_level")
            .in("contact_id", myContactIds);
          setKids((kRows ?? []) as Kid[]);
        } else {
          setKids([]);
        }
      } catch {
        setKids([]);
      }

      // Teams coached (coach_id = user.id)
      const { data: coachTeams } = await supabase
        .from("teams").select("id,name,season,logo_url,primary_color").eq("coach_id", user.id);
      const coachedRows: TeamRow[] = ((coachTeams ?? []) as any[]).map((t) => ({
        id: t.id, name: t.name, season: t.season, logo_url: t.logo_url, primary_color: t.primary_color, role: "coach",
      }));
      const coachedIds = new Set(coachedRows.map((t) => t.id));

      // Teams where the user is a parent (via contact ids)
      let parentRows: TeamRow[] = [];
      try {
        const ids = await (supabase as any).rpc("current_user_contact_ids");
        const contactIds = (ids.data ?? []) as string[];
        if (contactIds.length) {
          const { data: tps } = await supabase.from("team_players").select("team_id").in("parent_contact_id", contactIds);
          const parentTeamIds = Array.from(new Set(((tps ?? []) as any[]).map((r) => r.team_id))).filter((id) => !coachedIds.has(id));
          if (parentTeamIds.length) {
            const { data: pt } = await supabase
              .from("teams").select("id,name,season,logo_url,primary_color").in("id", parentTeamIds);
            parentRows = ((pt ?? []) as any[]).map((t) => ({
              id: t.id, name: t.name, season: t.season, logo_url: t.logo_url, primary_color: t.primary_color, role: "parent",
            }));
          }
        }
      } catch { /* noop */ }
      const allTeams = [...coachedRows, ...parentRows];
      setTeams(allTeams);

      const allTeamIds = allTeams.map((t) => t.id);
      if (allTeamIds.length === 0) return;

      // Next 7 days of games + practices
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const { data: te } = await supabase
        .from("team_events")
        .select("id,event_type,title,opponent_name,venue,event_date,start_time,team_id, teams(name)")
        .in("team_id", allTeamIds)
        .in("event_type", ["game", "practice"])
        .gte("event_date", today).lte("event_date", in7)
        .order("event_date");
      setEvents(((te ?? []) as any[]).map((r) => ({
        id: r.id, event_type: r.event_type, title: r.title, opponent_name: r.opponent_name,
        venue: r.venue, event_date: r.event_date, start_time: r.start_time,
        team_name: r.teams?.name ?? null, team_id: r.team_id,
      })));

      // Dryland leaderboard — top 3 athletes by completed sessions this week
      const { data: players } = await supabase
        .from("team_players").select("athlete_id, team_id").in("team_id", allTeamIds);
      const playerRows = ((players ?? []) as any[]);
      const athleteIds = Array.from(new Set(playerRows.map((p) => p.athlete_id).filter(Boolean)));
      const teamByAthlete = new Map<string, string>();
      playerRows.forEach((p) => { if (p.athlete_id && !teamByAthlete.has(p.athlete_id)) teamByAthlete.set(p.athlete_id, p.team_id); });
      const teamNameById = new Map(allTeams.map((t) => [t.id, t.name]));
      if (athleteIds.length) {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data: an } = await supabase.from("attendees").select("id, full_name").in("id", athleteIds);
        const nameMap = new Map(((an ?? []) as any[]).map((a) => [a.id, a.full_name as string]));

        const { data: prog } = await supabase
          .from("dryland_watch_progress")
          .select("athlete_id, completed, last_watched_at")
          .in("athlete_id", athleteIds)
          .eq("completed", true)
          .gte("last_watched_at", weekAgo);
        const counts = new Map<string, number>();
        ((prog ?? []) as any[]).forEach((r) => counts.set(r.athlete_id, (counts.get(r.athlete_id) ?? 0) + 1));
        const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
        setLeaders(top.map(([id, count]) => ({
          athlete_id: id,
          name: nameMap.get(id) ?? "Athlete",
          team_name: teamNameById.get(teamByAthlete.get(id) ?? "") ?? "",
          count,
        })));

        // Recent media for athletes in their teams
        const { data: med } = await supabase
          .from("athlete_media")
          .select("id, thumbnail_url, video_url, athlete_id, recorded_at")
          .in("athlete_id", athleteIds)
          .order("recorded_at", { ascending: false })
          .limit(8);
        setMedia(((med ?? []) as any[]).map((m) => ({
          id: m.id,
          thumb_url: m.thumbnail_url ?? m.video_url,
          athlete_name: nameMap.get(m.athlete_id) ?? null,
          team_id: teamByAthlete.get(m.athlete_id) ?? "",
        })));
      }
    })();
  }, [user?.id]);

  const firstName = (coachName || user?.email?.split("@")[0] || "Coach").split(/\s+/)[0];
  const fallbackTeamId = teams[0]?.id ?? "";

  return (
    <div className="space-y-6 pb-4">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight">Hey {firstName},</h1>
        <p className="text-base font-light text-muted-foreground">Here's what's happening.</p>
      </div>

      {/* My Athletes — only if coach has linked children */}
      {kids.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">My Athletes</h2>
          <div className={"mt-2 " + (kids.length > 1 ? "grid grid-cols-2 gap-3" : "")}>
            {kids.map((k) => {
              const open = expanded === k.id;
              const age = ageFrom(k.birthday);
              return (
                <div key={k.id} className="rounded-2xl border border-border bg-card p-4">
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
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Next Up — next 7 days */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Next Up</h2>
        {events.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            No games or practices scheduled in the next 7 days.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {events.map((e) => (
              <Link
                key={e.id}
                to="/coach/teams/$teamId/schedule/$eventId"
                params={{ teamId: e.team_id, eventId: e.id }}
                className="block"
              >
                <TeamEventRow event={e} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Teams */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">My Teams</h2>
        {teams.length === 0 ? (
          <Link to="/coach/teams" className="mt-2 flex items-center justify-between rounded-2xl border border-dashed border-border bg-card p-4">
            <span className="text-xs text-muted-foreground">No teams yet. Tap to create one.</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        ) : (
          <div className="mt-2 space-y-2">
            {teams.map((t) => {
              const isCoach = t.role === "coach";
              const linkProps = isCoach
                ? { to: "/coach/teams/$teamId" as const, params: { teamId: t.id } }
                : { to: "/parent/teams/$teamId" as const, params: { teamId: t.id } };
              return (
                <Link
                  key={t.id}
                  {...linkProps}
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
                      <p className="truncate text-[11px] text-muted-foreground">{t.season ?? ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider " + (isCoach ? "bg-teal/15 text-teal" : "bg-volt/15 text-volt")}>
                      {isCoach ? "COACH" : "PARENT"}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Dryland This Week */}
      <section>
        <Link to="/coach/analytics" className="block rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Dryland This Week</h2>
            <Trophy size={14} className="text-volt" />
          </div>
          {leaders.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No completed sessions yet this week.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {leaders.map((l, idx) => (
                <li key={l.athlete_id} className="flex items-center gap-3">
                  <span className={"grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold " + (idx === 0 ? "bg-volt/20 text-volt" : "bg-surface text-foreground")}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{l.team_name}</p>
                  </div>
                  <span className="text-xs font-bold text-teal">{l.count} session{l.count === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ol>
          )}
        </Link>
      </section>

      {/* Ice Times + Create Session */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/coach/ice" className="flex items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-transparent py-3 text-center transition-colors hover:bg-teal/5">
          <Snowflake size={18} className="text-teal" />
          <span className="text-xs font-semibold text-teal">Add Ice Times</span>
        </Link>
        <Link to="/coach/sessions" className="flex items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-transparent py-3 text-center transition-colors hover:bg-teal/5">
          <Plus size={18} className="text-teal" />
          <span className="text-xs font-semibold text-teal">{"\u00a0"}Create Session</span>
        </Link>
      </div>

      {/* Recent Media */}
      {media.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Recent Media</h2>
            {fallbackTeamId && (
              <Link to="/coach/teams/$teamId" params={{ teamId: fallbackTeamId }} className="text-[11px] font-semibold text-teal">
                See All
              </Link>
            )}
          </div>
          <div className="-mx-5 mt-2 flex gap-3 overflow-x-auto px-5 pb-1">
            {media.map((m) => (
              <div key={m.id} className="relative block h-32 w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface">
                {m.thumb_url ? (
                  <img src={m.thumb_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageIcon size={20} /></div>
                )}
                {m.athlete_name && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold text-foreground">
                    {m.athlete_name.split(/\s+/)[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
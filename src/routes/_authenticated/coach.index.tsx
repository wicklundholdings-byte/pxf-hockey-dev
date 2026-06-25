import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, Users, ChevronRight, AlertTriangle, Snowflake, Plus, Image as ImageIcon, Trophy, ChevronDown } from "lucide-react";
import { TeamEventRow } from "@/components/teams/team-event-row";
import { useCurrentTier } from "@/hooks/use-tier";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/coach/")({
  component: CoachDashboardRoot,
});

function CoachDashboardRoot() {
  const { tier, loading } = useCurrentTier();
  if (loading) return <div className="h-40" />;
  return tier === "elite" ? <EliteCoachDashboard /> : <TeamCoachDashboard />;
}

type Camp = { id: string; name: string; slug: string; capacity: number; status: string; start_date: string | null; price_cents: number };
type Reg = { id: string; status: string; amount_cents: number; created_at: string; camp_id: string; attendee_id: string | null; contact_id: string | null };

function fmtMoney(cents: number) {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function EliteCoachDashboard() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [unassignedCampIds, setUnassignedCampIds] = useState<string[]>([]);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [unscheduledIce, setUnscheduledIce] = useState(0);
  const [unscheduledIceHours, setUnscheduledIceHours] = useState(0);

  useEffect(() => {
    (async () => {
      const [c, r, ct, st, ps, ice] = await Promise.all([
        supabase.from("camps").select("id,name,slug,capacity,status,start_date,price_cents").order("start_date", { ascending: true }),
        supabase.from("registrations").select("id,status,amount_cents,created_at,camp_id,attendee_id,contact_id").order("created_at", { ascending: false }),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        (supabase as any).from("camp_staff").select("camp_id"),
        (supabase as any).from("attendee_payment_status").select("registration_id, payment_status").in("payment_status", ["pending", "overdue"]),
        (supabase as any).from("ice_slots").select("id,start_time,end_time,slot_date").is("camp_id", null).gte("slot_date", new Date().toISOString().slice(0, 10)),
      ]);
      setCamps((c.data ?? []) as Camp[]);
      setRegs((r.data ?? []) as Reg[]);
      setContactCount(ct.count ?? 0);
      const staffed = new Set(((st.data as any[]) ?? []).map((row) => row.camp_id as string));
      const upcomingCamps = ((c.data ?? []) as Camp[]).filter((cc) => cc.status !== "ended");
      setUnassignedCampIds(upcomingCamps.filter((cc) => !staffed.has(cc.id)).map((cc) => cc.id));
      setOutstandingCount(((ps.data as any[]) ?? []).length);
      const slots = (ice.data as any[]) ?? [];
      setUnscheduledIce(slots.length);
      const mins = slots.reduce((acc, s) => {
        if (!s.start_time || !s.end_time) return acc;
        const [sh, sm] = String(s.start_time).split(":").map(Number);
        const [eh, em] = String(s.end_time).split(":").map(Number);
        return acc + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
      }, 0);
      setUnscheduledIceHours(Math.round((mins / 60) * 10) / 10);
    })();
  }, []);

  const stats = useMemo(() => {
    const paid = regs.filter((r) => r.status === "paid");
    const gross = paid.reduce((s, r) => s + r.amount_cents, 0);
    const fees = Math.round(gross * 0.029) + paid.length * 30;
    const net = gross - fees;
    return { gross, net, total: regs.length, paidCount: paid.length };
  }, [regs]);

  const chartData = useMemo(() => {
    const days = range;
    const buckets: { date: string; count: number; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.push({ date: d.toISOString().slice(5, 10), count: 0, revenue: 0 });
    }
    regs.forEach((r) => {
      const k = r.created_at.slice(5, 10);
      const b = buckets.find((x) => x.date === k);
      if (b) {
        b.count++;
        if (r.status === "paid") b.revenue += r.amount_cents / 100;
      }
    });
    return buckets;
  }, [regs, range]);

  const regsByCamp = useMemo(() => {
    const map = new Map<string, number>();
    regs.filter((r) => r.status === "paid").forEach((r) => map.set(r.camp_id, (map.get(r.camp_id) ?? 0) + 1));
    return map;
  }, [regs]);

  const activeCamps = camps.filter((c) => c.status === "live");
  const upcoming = camps.filter((c) => c.start_date && new Date(c.start_date) > new Date()).length;

  const recent = regs.slice(0, 6);
  const campName = (id: string) => camps.find((c) => c.id === id)?.name ?? "—";

  const statCards = [
    { label: "Gross sales", value: fmtMoney(stats.gross), icon: DollarSign, accent: "text-teal" },
    { label: "Net sales", value: fmtMoney(stats.net), icon: TrendingUp, accent: "text-emerald-400" },
    { label: "Registrations", value: stats.total, icon: Users, accent: "text-foreground" },
    { label: "Contacts", value: contactCount, icon: Users, accent: "text-foreground" },
  ];

  return (
    <div className="space-y-5">
      <TodaysAttendanceCard />
      <UpcomingSevenDays />
      <DrylandActivityCard />
      {(unscheduledIce > 0 || unassignedCampIds.length > 0 || outstandingCount > 0) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {unscheduledIce > 0 && (
            <Link to="/coach/ice" className="flex items-center gap-3 rounded-2xl border border-teal/40 bg-teal/5 p-3">
              <Snowflake size={18} className="text-teal" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">{unscheduledIce} ice slot{unscheduledIce === 1 ? "" : "s"} not assigned to a camp</p>
                <p className="text-[10px] text-muted-foreground">{unscheduledIceHours}h unscheduled · tap to schedule</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          )}
          {unassignedCampIds.length > 0 && (
            <Link to="/coach/teams" className="flex items-center gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/5 p-3">
              <AlertTriangle size={18} className="text-orange-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">{unassignedCampIds.length} camp{unassignedCampIds.length === 1 ? "" : "s"} have no assigned coach</p>
                <p className="text-[10px] text-muted-foreground">Tap to quick-assign</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          )}
          {outstandingCount > 0 && (
            <Link to="/coach/financials" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3">
              <DollarSign size={18} className="text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">{outstandingCount} attendee{outstandingCount === 1 ? "" : "s"} have outstanding payments</p>
                <p className="text-[10px] text-muted-foreground">Review pending & overdue</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/coach/ice" className="flex items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-transparent py-3 text-center transition-colors hover:bg-teal/5">
          <Snowflake size={18} className="text-teal" />
          <span className="text-xs font-semibold text-teal">Add Ice Times</span>
        </Link>
        <Link to="/coach/camps/new" className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-transparent py-3 text-center transition-colors hover:bg-emerald-400/5">
          <Plus size={18} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">{"\u00a0"}Create Session</span>
        </Link>
      </div>
      {/* Quick Access */}
      <div className="grid gap-2 grid-cols-4">
        {([
              { to: "/coach/camps/new" as const, label: "Create Camp", icon: CalendarPlus },
              { to: "/coach/roster" as const, label: "Roster", icon: Users },
              { to: "/coach/financials" as const, label: "Financials", icon: DollarSign },
              { to: "/coach/analytics" as const, label: "Analytics", icon: BarChart3 },
        ]).map((q) => (
          <Link
            key={q.label}
            to={q.to}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-surface px-2 py-3 text-center transition-colors hover:border-teal/40"
          >
            <q.icon size={18} className="text-teal" />
            <span className="text-[10px] font-semibold leading-tight text-foreground">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* Full-width Athletes button */}
      <Link
        to="/coach/attendees"
        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-center text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Users size={18} />
        <span className="text-xs font-semibold">Athletes</span>
      </Link>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon size={14} className={s.accent} />
            </div>
            <div className={"mt-1 font-display text-xl font-bold " + s.accent}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-foreground">Registrations</h2>
            <p className="text-[11px] text-muted-foreground">Last {range} days</p>
          </div>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={
                  "rounded-full px-2.5 py-1 text-[10px] font-bold " +
                  (range === r ? "bg-gradient-brand text-primary-foreground" : "bg-surface text-muted-foreground")
                }
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5D6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00E5D6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#21262D" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#8B949E", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#161B22", border: "1px solid #21262D", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#8B949E" }}
              />
              <Area type="monotone" dataKey="count" stroke="#00E5D6" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active camps */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Active camps</h2>
          <Link to="/coach/camps" className="text-[11px] font-semibold text-teal">View all</Link>
        </div>
        {activeCamps.length === 0 ? (
          <p className="text-xs text-muted-foreground">No live camps yet.</p>
        ) : (
          <ul className="space-y-3">
            {activeCamps.map((c) => {
              const filled = regsByCamp.get(c.id) ?? 0;
              const pct = c.capacity ? Math.min(100, (filled / c.capacity) * 100) : 0;
              return (
                <li key={c.id}>
                  <Link
                    to="/coach/camps/$campId"
                    params={{ campId: c.id }}
                    className="block space-y-1.5 rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-surface"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{c.name}</span>
                      <span className="text-[11px] text-muted-foreground">{filled}/{c.capacity}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-teal" style={{ width: pct + "%" }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Activity */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
            <Activity size={14} className="text-teal" /> Recent activity
          </h2>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">Activity will appear here.</p>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((r) => {
                const linkProps = r.attendee_id
                  ? { to: "/coach/attendees/$athleteId" as const, params: { athleteId: r.attendee_id } }
                  : r.contact_id
                  ? { to: "/coach/contacts/$contactId" as const, params: { contactId: r.contact_id } }
                  : { to: "/coach/camps/$campId" as const, params: { campId: r.camp_id } };
                return (
                  <li key={r.id}>
                    <Link
                      {...linkProps}
                      className="flex items-center justify-between gap-2 rounded-lg p-1.5 -m-1.5 text-xs transition-colors hover:bg-surface"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground">New registration · {campName(r.camp_id)}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-foreground">Quick stats</h2>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays size={12} /> Upcoming camps</span>
              <span className="font-bold text-foreground">{upcoming}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Users size={12} /> Total contacts</span>
              <span className="font-bold text-foreground">{contactCount}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><DollarSign size={12} /> Paid registrations</span>
              <span className="font-bold text-foreground">{stats.paidCount}</span>
            </li>
          </ul>
        </div>
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
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Users, CalendarDays, Activity, BarChart3, ChevronRight, AlertTriangle, Snowflake, CalendarPlus, Plus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from "recharts";
import { StatusBadge } from "@/components/coach/status-badge";
import { TodaysAttendanceCard } from "@/components/coach/todays-attendance-card";
import { UpcomingSevenDays } from "@/components/teams/upcoming-7-days";

export const Route = createFileRoute("/_authenticated/coach/")({
  component: CoachDashboard,
});

type Camp = { id: string; name: string; slug: string; capacity: number; status: string; start_date: string | null; price_cents: number };
type Reg = { id: string; status: string; amount_cents: number; created_at: string; camp_id: string; attendee_id: string | null; contact_id: string | null };

function fmtMoney(cents: number) {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function CoachDashboard() {
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
      {(unassignedCampIds.length > 0 || outstandingCount > 0 || unscheduledIce > 0) && (
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
          <span className="text-xs font-semibold text-emerald-400">+ Create Session</span>
        </Link>
      </div>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { to: "/coach/camps/new", label: "Create Camp", icon: CalendarPlus },
          { to: "/coach/camps/new", label: "Create Session", icon: Layers },
          { to: "/coach/ice", label: "Add Ice Time", icon: Snowflake },
          { to: "/coach/broadcast", label: "Broadcast", icon: Megaphone },
        ].map((q) => (
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

      {/* Quick Access */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { to: "/coach/camps/new", label: "Create Camp", icon: CalendarPlus },
          { to: "/coach/roster", label: "Roster", icon: Users },
          { to: "/coach/financials", label: "Financials", icon: DollarSign },
          { to: "/coach/analytics", label: "Analytics", icon: BarChart3 },
        ].map((q) => (
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
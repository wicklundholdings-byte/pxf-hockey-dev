import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Calendar as CalendarIcon, MapPin, AlertTriangle, Snowflake, Swords, Dumbbell, Flag, User, Clock, X } from "lucide-react";
import { StatusBadge } from "@/components/coach/status-badge";
import { TierGate } from "@/components/tier-gate";
import { useCurrentTier } from "@/hooks/use-tier";
import { tierAtLeast } from "@/lib/tiers";
import { BlockForStaff } from "@/components/block-for-staff";

export const Route = createFileRoute("/_authenticated/coach/camps/")({
  component: GatedCampsPage,
});

function GatedCampsPage() {
  const { tier, loading } = useCurrentTier();
  // Staff coaches never see camp management.
  return (
    <BlockForStaff>
      <InnerGatedCampsPage tier={tier} loading={loading} />
    </BlockForStaff>
  );
}

function InnerGatedCampsPage({ tier, loading }: { tier: ReturnType<typeof useCurrentTier>["tier"]; loading: boolean }) {
  // Team / Association tiers don't have camps — show a unified team events feed instead
  if (tier && !tierAtLeast(tier, "elite")) return <TeamEventsFeed />;
  if (loading) return null;
  if (!tierAtLeast(tier, "elite")) return <TeamEventsFeed />;
  return (
    <TierGate feature="campManagement" fallback={<TeamEventsFeed />}>
      <CampsPage />
    </TierGate>
  );
}

type Camp = {
  id: string;
  name: string;
  slug: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number;
  price_cents: number;
  hero_image: string | null;
  venue_name: string | null;
  location_type: string;
};

function fmtDate(d: string | null) {
  if (!d) return "TBA";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtMonth(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}
function fmtDay(d: string | null) {
  if (!d) return "—";
  return new Date(d).getDate().toString();
}

type PrivateLite = {
  id: string;
  athlete_name: string | null;
  session_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  series_id: string | null;
  assigned_coach_id: string | null;
};

type TeamEventLite = {
  id: string;
  team_id: string;
  team_name: string;
  event_type: "game" | "practice" | "team_event";
  title: string | null;
  opponent_name: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
};

type StaffMember = { id: string; email: string; title: string | null };

function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ap = hr >= 12 ? "PM" : "AM";
  const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}

function CampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [regCounts, setRegCounts] = useState<Map<string, { count: number; revenue: number }>>(new Map());
  const [staffedCampIds, setStaffedCampIds] = useState<Set<string>>(new Set());
  const [privates, setPrivates] = useState<PrivateLite[]>([]);
  const [teamEvents, setTeamEvents] = useState<TeamEventLite[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "camps" | "privates" | "teams">("all");
  const [assignFor, setAssignFor] = useState<Camp | null>(null);

  async function reload() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: { user } } = await supabase.auth.getUser();
    const [c, r, st, pv, teamsRes] = await Promise.all([
      supabase.from("camps").select("*").order("start_date", { ascending: true }),
      supabase.from("registrations").select("camp_id,status,amount_cents").eq("status", "paid"),
      (supabase as any).from("camp_staff").select("camp_id"),
      user ? (supabase as any).from("private_sessions")
        .select("id,athlete_name,session_date,start_time,duration_minutes,location,series_id,assigned_coach_id")
        .eq("owner_id", user.id).gte("session_date", today)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true }) : Promise.resolve({ data: [] }),
      user ? supabase.from("teams").select("id,name").eq("coach_id", user.id) : Promise.resolve({ data: [] }),
    ]);
    setCamps((c.data ?? []) as Camp[]);
    const m = new Map<string, { count: number; revenue: number }>();
    (r.data ?? []).forEach((row: any) => {
      const prev = m.get(row.camp_id) ?? { count: 0, revenue: 0 };
      m.set(row.camp_id, { count: prev.count + 1, revenue: prev.revenue + (row.amount_cents ?? 0) });
    });
    setRegCounts(m);
    setStaffedCampIds(new Set(((st.data as any[]) ?? []).map((row) => row.camp_id as string)));
    setPrivates(((pv as any).data ?? []) as PrivateLite[]);

    const teamList = (((teamsRes as any).data ?? []) as Array<{ id: string; name: string }>);
    if (teamList.length) {
      const nameMap = new Map(teamList.map((t) => [t.id, t.name]));
      const { data: te } = await supabase
        .from("team_events")
        .select("id,team_id,event_type,title,opponent_name,venue,event_date,start_time")
        .in("team_id", teamList.map((t) => t.id))
        .in("event_type", ["game", "practice"])
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });
      setTeamEvents(((te ?? []) as any[]).map((e) => ({
        ...e, team_name: nameMap.get(e.team_id) ?? "Team",
      })));
    } else {
      setTeamEvents([]);
    }
  }

  useEffect(() => { reload(); }, []);

  const ql = q.trim().toLowerCase();
  const matchText = (s: string | null | undefined) => !ql || (s ?? "").toLowerCase().includes(ql);

  const filteredCamps = camps.filter((c) => matchText(c.name));
  const filteredPrivates = privates.filter((p) => matchText(p.athlete_name) || matchText(p.location));
  const filteredTeamEvents = teamEvents.filter((e) =>
    matchText(e.title) || matchText(e.opponent_name) || matchText(e.team_name) || matchText(e.venue),
  );

  // All-tab merged list
  type Merged = { key: string; sortDate: string; sortTime: string; node: JSX.Element };
  const merged: Merged[] = useMemo(() => {
    const items: Merged[] = [];
    filteredCamps.forEach((c) => {
      if (!c.start_date) return;
      items.push({
        key: "c-" + c.id,
        sortDate: c.start_date,
        sortTime: "00:00",
        node: (
          <CampCard
            key={"c-" + c.id}
            camp={c}
            stats={regCounts.get(c.id) ?? { count: 0, revenue: 0 }}
            staffed={staffedCampIds.has(c.id)}
            onAssign={() => setAssignFor(c)}
          />
        ),
      });
    });
    filteredPrivates.forEach((p) => {
      items.push({
        key: "p-" + p.id,
        sortDate: p.session_date,
        sortTime: p.start_time ?? "00:00",
        node: <PrivateCard key={"p-" + p.id} item={p} />,
      });
    });
    filteredTeamEvents.forEach((e) => {
      items.push({
        key: "t-" + e.id,
        sortDate: e.event_date,
        sortTime: e.start_time ?? "00:00",
        node: <CampsTeamEventCard key={"t-" + e.id} event={e} />,
      });
    });
    items.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.sortTime.localeCompare(b.sortTime));
    return items;
  }, [filteredCamps, filteredPrivates, filteredTeamEvents, regCounts, staffedCampIds]);

  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: "all", label: "All" },
    { key: "camps", label: "Camps" },
    { key: "privates", label: "Privates" },
    { key: "teams", label: "Teams" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
            />
          </div>
          <Link
            to="/coach/camps/new"
            className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-2 text-[11px] font-bold text-primary-foreground"
          >
            <Plus size={12} /> New
          </Link>
        </div>
        <Link
          to="/coach/ice"
          className="flex items-center justify-between rounded-2xl border border-teal/40 bg-teal/5 p-3 text-xs"
        >
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Snowflake size={14} className="text-teal" /> Ice Time Log
          </span>
          <span className="text-[10px] font-bold text-teal">Manage →</span>
        </Link>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "rounded-full border px-3 py-1 text-[11px] font-semibold " +
                (tab === t.key ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "all" && (
        <div className="space-y-3">
          {merged.length === 0 ? (
            <EmptyMsg>No events match your search.</EmptyMsg>
          ) : merged.map((x) => x.node)}
        </div>
      )}

      {tab === "camps" && (
        <div className="space-y-3">
          {filteredCamps.length === 0 ? (
            <EmptyMsg>No camps match your search.</EmptyMsg>
          ) : filteredCamps.map((c) => (
            <CampCard
              key={c.id}
              camp={c}
              stats={regCounts.get(c.id) ?? { count: 0, revenue: 0 }}
              staffed={staffedCampIds.has(c.id)}
              onAssign={() => setAssignFor(c)}
            />
          ))}
        </div>
      )}

      {tab === "privates" && (
        <div className="space-y-3">
          {filteredPrivates.length === 0 ? (
            <Link
              to="/coach/bookings"
              className="block rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs"
            >
              <p className="font-semibold text-foreground">No upcoming privates</p>
              <p className="mt-1 text-teal font-bold">Book a Private +</p>
            </Link>
          ) : filteredPrivates.map((p) => <PrivateCard key={p.id} item={p} />)}
        </div>
      )}

      {tab === "teams" && (
        <TeamsTab events={filteredTeamEvents} />
      )}

      {assignFor && (
        <AssignCoachModal
          camp={assignFor}
          onClose={() => setAssignFor(null)}
          onAssigned={async () => { setAssignFor(null); await reload(); }}
        />
      )}
    </div>
  );
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function CampCard({ camp: c, stats, staffed, onAssign }: {
  camp: Camp;
  stats: { count: number; revenue: number };
  staffed: boolean;
  onAssign: () => void;
}) {
  const pct = c.capacity ? Math.min(100, (stats.count / c.capacity) * 100) : 0;
  return (
    <Link
      to="/coach/camps/$campId"
      params={{ campId: c.id }}
      className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-teal/40"
    >
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
          <span className="text-[9px] font-bold tracking-wider text-teal">{fmtMonth(c.start_date)}</span>
          <span className="font-display text-lg font-bold leading-none text-foreground">{fmtDay(c.start_date)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-foreground">{c.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-400">Camp</span>
              <StatusBadge status={c.status} />
            </div>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin size={10} /> {c.venue_name ?? (c.location_type === "online" ? "Online" : "TBA")}
          </p>
          {!staffed && c.status !== "ended" && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAssign(); }}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-500 hover:bg-orange-500/25"
            >
              <AlertTriangle size={9} /> No coach assigned · Assign
            </button>
          )}
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">{stats.count}/{c.capacity} spots</span>
            <span className="font-bold text-emerald-400">${(stats.revenue / 100).toLocaleString()}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-teal" style={{ width: pct + "%" }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function PrivateCard({ item: p }: { item: PrivateLite }) {
  return (
    <Link
      to="/coach/bookings"
      className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-teal/40"
    >
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
          <span className="text-[9px] font-bold tracking-wider text-teal">{fmtMonth(p.session_date)}</span>
          <span className="font-display text-lg font-bold leading-none text-foreground">{fmtDay(p.session_date)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-foreground">{p.athlete_name || "Private session"}</h3>
            <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-400">
              {p.series_id ? "Series" : "Private"}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            {p.start_time && <span className="flex items-center gap-1"><Clock size={10} />{fmtTime(p.start_time)}</span>}
            {p.duration_minutes && <span>{p.duration_minutes} min</span>}
          </p>
          {p.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <MapPin size={10} /> {p.location}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-[10px]">
            <User size={10} className={p.assigned_coach_id ? "text-teal" : "text-orange-500"} />
            <span className={p.assigned_coach_id ? "text-muted-foreground" : "font-bold uppercase text-orange-500"}>
              {p.assigned_coach_id ? "Instructor assigned" : "No instructor assigned"}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function CampsTeamEventCard({ event: e }: { event: TeamEventLite }) {
  const isGame = e.event_type === "game";
  const title = isGame ? `vs ${e.opponent_name || "TBD"}` : (e.title || "Practice");
  return (
    <Link
      to="/coach/teams/$teamId/schedule/$eventId"
      params={{ teamId: e.team_id, eventId: e.id }}
      className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-teal/40"
    >
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
          <span className="text-[9px] font-bold tracking-wider text-teal">{fmtMonth(e.event_date)}</span>
          <span className="font-display text-lg font-bold leading-none text-foreground">{fmtDay(e.event_date)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-foreground">{title}</h3>
            <span className={
              "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase " +
              (isGame ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400")
            }>
              {isGame ? "Game" : "Practice"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{e.team_name}</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            {e.start_time && <span className="flex items-center gap-1"><Clock size={10} />{fmtTime(e.start_time)}</span>}
            {e.venue && <span className="flex min-w-0 items-center gap-1 truncate"><MapPin size={10} /><span className="truncate">{e.venue}</span></span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function TeamsTab({ events }: { events: TeamEventLite[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: TeamEventLite[] }>();
    events.forEach((e) => {
      if (!map.has(e.team_id)) map.set(e.team_id, { label: e.team_name, items: [] });
      map.get(e.team_id)!.items.push(e);
    });
    return Array.from(map.entries());
  }, [events]);

  if (events.length === 0) {
    return <EmptyMsg>No upcoming team events.</EmptyMsg>;
  }

  if (groups.length === 1) {
    return <div className="space-y-3">{events.map((e) => <CampsTeamEventCard key={e.id} event={e} />)}</div>;
  }

  return (
    <div className="space-y-5">
      {groups.map(([key, g]) => (
        <section key={key}>
          <h3 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">{g.label}</h3>
          <div className="mt-2 space-y-3">
            {g.items.map((e) => <CampsTeamEventCard key={e.id} event={e} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function AssignCoachModal({ camp, onClose, onAssigned }: { camp: Camp; onClose: () => void; onAssigned: () => void }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("team_members")
        .select("id,email,title")
        .eq("owner_id", user.id);
      setStaff(((data ?? []) as any[]).map((r) => ({ id: r.id, email: r.email, title: r.title })));
      setLoading(false);
    })();
  }, []);

  async function assign(memberId: string) {
    setBusy(memberId);
    await (supabase as any).from("camp_staff").insert({ camp_id: camp.id, team_member_id: memberId });
    setBusy(null);
    onAssigned();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-foreground">Assign coach</h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{camp.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 space-y-1.5">
          {loading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : staff.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No staff yet. <Link to="/coach/staff" className="font-bold text-teal">Invite a coach →</Link>
            </p>
          ) : (
            staff.map((m) => (
              <button
                key={m.id}
                disabled={!!busy}
                onClick={() => assign(m.id)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left text-xs hover:border-teal/40 disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">{m.title || m.email}</span>
                  {m.title && <span className="block truncate text-[10px] text-muted-foreground">{m.email}</span>}
                </span>
                <span className="shrink-0 rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-bold text-primary-foreground">
                  {busy === m.id ? "…" : "Assign"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type FeedEvent = {
  id: string;
  team_id: string;
  team_name: string;
  event_type: "game" | "practice" | "team_event";
  kind: "game" | "practice" | "team_event";
  title_text: string;
  title: string | null;
  opponent_name: string | null;
  home_away: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
};

const FEED_META: Record<FeedEvent["kind"], { label: string; icon: typeof Swords; bg: string; color: string }> = {
  game: { label: "Game", icon: Swords, bg: "bg-amber-500/15", color: "text-amber-400" },
  practice: { label: "Practice", icon: Dumbbell, bg: "bg-emerald-500/15", color: "text-emerald-400" },
  team_event: { label: "Team Event", icon: Flag, bg: "bg-violet-500/15", color: "text-violet-400" },
};

function feedFmtDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function feedFmtTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10); const ap = hr >= 12 ? "PM" : "AM"; const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}

function TeamEventsFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: teams } = await supabase
        .from("teams")
        .select("id,name")
        .eq("coach_id", user.id);
      const teamList = (teams ?? []) as Array<{ id: string; name: string }>;
      if (!teamList.length) { setEvents([]); setLoading(false); return; }
      const nameMap = new Map(teamList.map((t) => [t.id, t.name]));
      const today = new Date().toISOString().slice(0, 10);
      const { data: evs } = await supabase
        .from("team_events")
        .select("id,team_id,event_type,title,opponent_name,home_away,venue,event_date,start_time,end_time")
        .in("team_id", teamList.map((t) => t.id))
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(50);
      setEvents(((evs ?? []) as Array<Omit<FeedEvent, "team_name" | "kind" | "title_text">>).map((e) => {
        const kind = e.event_type === "game" ? "game" : e.event_type === "practice" ? "practice" : "team_event";
        const titleText = kind === "game"
          ? `${e.home_away === "away" ? "@" : "vs"} ${e.opponent_name || "Opponent"}`
          : e.title || (kind === "practice" ? "Practice" : "Team Event");
        return { ...e, kind, title_text: titleText, team_name: nameMap.get(e.team_id) ?? "Team" };
      }));
      setLoading(false);
    })();
  }, []);

  const upcoming = events.slice(0, 3);
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: FeedEvent[] }>();
    events.forEach((event) => {
      if (!map.has(event.team_id)) map.set(event.team_id, { label: event.team_name, items: [] });
      map.get(event.team_id)!.items.push(event);
    });
    return Array.from(map.entries());
  }, [events]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Events</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">Everything happening across your teams</p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <CalendarIcon className="mx-auto mb-2 text-muted-foreground" size={28} />
          <p className="text-sm font-semibold">No upcoming events</p>
          <p className="mt-1 text-xs text-muted-foreground">When team events are scheduled, they show up here.</p>
        </div>
      ) : (
        <>
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Upcoming</h3>
            <div className="mt-2 space-y-2">
              {upcoming.map((event) => <FeedTeamEventCard key={`up-${event.id}`} event={event} showSource />)}
            </div>
          </section>

          {groups.map(([key, group]) => (
            <section key={key}>
              <h3 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">{group.label}</h3>
              <div className="mt-2 space-y-2">
                {group.items.slice(0, 3).map((event) => <FeedTeamEventCard key={`${key}-${event.id}`} event={event} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function FeedTeamEventCard({ event, showSource }: { event: FeedEvent; showSource?: boolean }) {
  const meta = FEED_META[event.kind];
  const Icon = meta.icon;
  return (
    <Link
      to="/coach/teams/$teamId/schedule/$eventId"
      params={{ teamId: event.team_id, eventId: event.id }}
      className="block rounded-2xl border border-border bg-card p-3"
    >
      <div className="flex items-start gap-3">
        <div className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl " + meta.bg}>
          <Icon size={18} className={meta.color} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{event.title_text}</p>
            <span className={"shrink-0 text-[10px] font-bold uppercase tracking-wider " + meta.color}>{meta.label}</span>
          </div>
          {showSource && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{event.team_name}</p>}
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <CalendarIcon size={11} className="shrink-0" />
              <span className="truncate">{feedFmtDate(event.event_date)}{event.start_time ? ` · ${feedFmtTime(event.start_time)}` : ""}</span>
            </span>
            {event.venue && (
              <span className="flex min-w-0 items-center gap-1 truncate">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{event.venue}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
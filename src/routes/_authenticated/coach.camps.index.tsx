import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, List, Calendar as CalendarIcon, MapPin, AlertTriangle, Snowflake, Swords, Dumbbell, Flag } from "lucide-react";
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

function CampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [regCounts, setRegCounts] = useState<Map<string, { count: number; revenue: number }>>(new Map());
  const [staffedCampIds, setStaffedCampIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "draft" | "ended">("all");
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    (async () => {
      const [c, r, st] = await Promise.all([
        supabase.from("camps").select("*").order("start_date", { ascending: true }),
        supabase.from("registrations").select("camp_id,status,amount_cents").eq("status", "paid"),
        (supabase as any).from("camp_staff").select("camp_id"),
      ]);
      setCamps((c.data ?? []) as Camp[]);
      const m = new Map<string, { count: number; revenue: number }>();
      (r.data ?? []).forEach((row: any) => {
        const prev = m.get(row.camp_id) ?? { count: 0, revenue: 0 };
        m.set(row.camp_id, { count: prev.count + 1, revenue: prev.revenue + (row.amount_cents ?? 0) });
      });
      setRegCounts(m);
      setStaffedCampIds(new Set(((st.data as any[]) ?? []).map((row) => row.camp_id as string)));
    })();
  }, []);

  const filtered = useMemo(() => {
    return camps.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [camps, q, filter]);

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
              placeholder="Search camps…"
              className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
            />
          </div>
          <div className="flex rounded-full border border-border bg-card p-0.5">
            <button
              onClick={() => setView("list")}
              className={"rounded-full px-2 py-1 " + (view === "list" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}
              aria-label="List view"
            >
              <List size={12} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={"rounded-full px-2 py-1 " + (view === "calendar" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}
              aria-label="Calendar view"
            >
              <CalendarIcon size={12} />
            </button>
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
          {(["all", "live", "draft", "ended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-full border px-3 py-1 text-[11px] font-semibold capitalize " +
                (filter === f ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No camps match your filters.
            </p>
          ) : (
            filtered.map((c) => {
              const stats = regCounts.get(c.id) ?? { count: 0, revenue: 0 };
              const pct = c.capacity ? Math.min(100, (stats.count / c.capacity) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  to="/coach/camps/$campId"
                  params={{ campId: c.id }}
                  className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-teal/40"
                >
                  <div className="flex gap-3">
                    {/* Date block */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
                      <span className="text-[9px] font-bold tracking-wider text-teal">{fmtMonth(c.start_date)}</span>
                      <span className="font-display text-lg font-bold leading-none text-foreground">{fmtDay(c.start_date)}</span>
                    </div>
                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-bold text-foreground">{c.name}</h3>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <MapPin size={10} /> {c.venue_name ?? (c.location_type === "online" ? "Online" : "TBA")}
                      </p>
                      {!staffedCampIds.has(c.id) && c.status !== "ended" && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-500">
                          <AlertTriangle size={9} /> No coach assigned
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted-foreground">
                          {stats.count}/{c.capacity} spots
                        </span>
                        <span className="font-bold text-emerald-400">
                          ${(stats.revenue / 100).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-teal" style={{ width: pct + "%" }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <CalendarView camps={filtered} />
      )}
    </div>
  );
}

function CalendarView({ camps }: { camps: Camp[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();

  const cells: Array<{ day: number | null; camps: Camp[] }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, camps: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({
      day: d,
      camps: camps.filter(
        (c) => c.start_date && c.end_date && dateStr >= c.start_date && dateStr <= c.end_date,
      ),
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 font-display text-sm font-bold text-foreground">
        {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={
              "min-h-[44px] rounded-md border p-1 text-[10px] " +
              (cell.day ? "border-border/40 bg-surface" : "border-transparent")
            }
          >
            {cell.day && <div className="text-muted-foreground">{cell.day}</div>}
            {cell.camps.slice(0, 2).map((c) => (
              <Link
                key={c.id}
                to="/coach/camps/$campId"
                params={{ campId: c.id }}
                className="mt-0.5 block truncate rounded bg-teal/20 px-1 text-[8px] font-bold text-teal hover:bg-teal/30"
              >
                {c.name}
              </Link>
            ))}
          </div>
        ))}
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
              {upcoming.map((event) => <TeamEventCard key={`up-${event.id}`} event={event} showSource />)}
            </div>
          </section>

          {groups.map(([key, group]) => (
            <section key={key}>
              <h3 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">{group.label}</h3>
              <div className="mt-2 space-y-2">
                {group.items.slice(0, 3).map((event) => <TeamEventCard key={`${key}-${event.id}`} event={event} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function TeamEventCard({ event, showSource }: { event: FeedEvent; showSource?: boolean }) {
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
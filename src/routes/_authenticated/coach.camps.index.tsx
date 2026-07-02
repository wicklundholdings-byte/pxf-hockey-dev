import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, ChevronLeft, ChevronRight, X, Star, Calendar as CalIcon,
} from "lucide-react";
import { BlockForStaff } from "@/components/block-for-staff";

export const Route = createFileRoute("/_authenticated/coach/camps/")({
  component: () => (
    <BlockForStaff>
      <EventsCalendar />
    </BlockForStaff>
  ),
});

// ---------- Types ----------
type EntityKind = "team" | "camp" | "private";
type EventKind = "game" | "practice" | "tournament" | "camp" | "private";

type Entity = {
  id: string;         // filter chip id
  name: string;
  color: string;      // hex
  kind: EntityKind;
};

type CalEvent = {
  id: string;
  entityId: string;
  kind: EventKind;
  title: string;
  location: string | null;
  date: string;       // YYYY-MM-DD
  start: string;      // HH:mm
  durationMin: number;
  rsvp?: { yes: number; maybe: number; no: number };
  href?: string;
};

// ---------- Color palette ----------
const PALETTE = ["#00BFA5", "#3B82F6", "#F59E0B", "#F43F5E", "#8B5CF6", "#22C55E", "#EAB308", "#EC4899"];

// ---------- Time helpers ----------
const DAY_MS = 86_400_000;
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDateKey(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function startOfWeek(d: Date) { const c = new Date(d); const day = (c.getDay() + 6) % 7; c.setDate(c.getDate() - day); return c; }
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${ap}` : `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}
function longDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
function isSameDay(a: Date, b: Date) { return toDateKey(a) === toDateKey(b); }

// ---------- Mock seed (fallback / demo) ----------
function useMockSeed(): { entities: Entity[]; events: CalEvent[] } {
  return useMemo(() => {
    const entities: Entity[] = [
      { id: "elite", name: "Elite Demo Team", color: "#00BFA5", kind: "team" },
      { id: "atom",  name: "Atom Rep",        color: "#3B82F6", kind: "team" },
      { id: "camp",  name: "Summer Power Camp", color: "#F59E0B", kind: "camp" },
      { id: "priv",  name: "Private Sessions", color: "#F43F5E", kind: "private" },
    ];
    // Anchor mock data to "this week" so Day/Week/Month all show something.
    const today = new Date();
    const mon = startOfWeek(today);
    const day = (i: number) => toDateKey(addDays(mon, i));
    const events: CalEvent[] = [
      { id: "e1", entityId: "elite", kind: "practice", title: "Elite Demo Team Practice", location: "Burnaby 8 Rinks · Rink 2", date: day(0), start: "16:00", durationMin: 90, rsvp: { yes: 11, maybe: 1, no: 2 } },
      { id: "e2", entityId: "priv",  kind: "private",  title: "Private · Jake Andersson", location: "Burnaby 8 Rinks · Rink 4", date: day(1), start: "06:00", durationMin: 60 },
      { id: "e3", entityId: "camp",  kind: "camp",     title: "Summer Power Camp — Day 1", location: "Dev Ice Center", date: day(1), start: "09:00", durationMin: 360 },
      { id: "e4", entityId: "priv",  kind: "private",  title: "Private · Jake Andersson", location: "Burnaby 8 Rinks · Rink 4", date: day(3), start: "06:00", durationMin: 60 },
      { id: "e5", entityId: "elite", kind: "practice", title: "Elite Demo Team Practice", location: "Burnaby 8 Rinks · Rink 2", date: day(3), start: "16:00", durationMin: 90, rsvp: { yes: 11, maybe: 1, no: 2 } },
      { id: "e6", entityId: "atom",  kind: "practice", title: "Atom Rep Practice",        location: "Burnaby 8 Rinks · Rink 1", date: day(3), start: "19:30", durationMin: 60, rsvp: { yes: 8, maybe: 2, no: 0 } },
      { id: "e7", entityId: "elite", kind: "game",     title: "Elite Demo Team vs Wolves", location: "Dev Arena · Rink A", date: day(5), start: "10:00", durationMin: 90 },
      { id: "e8", entityId: "atom",  kind: "game",     title: "Atom Rep vs Bears",         location: "Northside Ice Plex", date: day(5), start: "14:00", durationMin: 90 },
    ];
    return { entities, events };
  }, []);
}

// ---------- Live loader (best-effort; falls back to mock) ----------
function useLiveData(): { entities: Entity[]; events: CalEvent[]; loading: boolean } {
  const mock = useMockSeed();
  const [state, setState] = useState<{ entities: Entity[]; events: CalEvent[]; loading: boolean }>(
    { entities: mock.entities, events: mock.events, loading: true },
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState({ ...mock, loading: false }); return; }

      const [teamsRes, campsRes, privRes] = await Promise.all([
        supabase.from("teams").select("id,name").eq("coach_id", user.id),
        supabase.from("camps").select("id,name,start_date,end_date,venue_name").eq("owner_id", user.id),
        (supabase as any).from("private_sessions")
          .select("id,athlete_name,session_date,start_time,duration_minutes,location")
          .eq("owner_id", user.id),
      ]);
      const teams = (teamsRes.data ?? []) as Array<{ id: string; name: string }>;
      const camps = (campsRes.data ?? []) as Array<{ id: string; name: string; start_date: string | null; end_date: string | null; venue_name: string | null }>;
      const privates = ((privRes as any).data ?? []) as Array<{ id: string; athlete_name: string | null; session_date: string; start_time: string | null; duration_minutes: number | null; location: string | null }>;

      if (teams.length === 0 && camps.length === 0 && privates.length === 0) {
        if (!cancelled) setState({ ...mock, loading: false });
        return;
      }

      const entities: Entity[] = [];
      let ci = 0;
      teams.forEach((t) => { entities.push({ id: `team:${t.id}`, name: t.name, color: PALETTE[ci++ % PALETTE.length], kind: "team" }); });
      camps.forEach((c) => { entities.push({ id: `camp:${c.id}`, name: c.name, color: PALETTE[ci++ % PALETTE.length], kind: "camp" }); });
      if (privates.length > 0) entities.push({ id: "private", name: "Private Sessions", color: "#F43F5E", kind: "private" });

      const events: CalEvent[] = [];
      if (teams.length > 0) {
        const { data: te } = await supabase.from("team_events")
          .select("id,team_id,event_type,title,opponent_name,venue,event_date,start_time,end_time")
          .in("team_id", teams.map((t) => t.id));
        (te ?? []).forEach((e: any) => {
          const start = (e.start_time ?? "00:00").slice(0, 5);
          const end = (e.end_time ?? e.start_time ?? "01:00").slice(0, 5);
          const dur = diffMin(start, end) || 60;
          const team = teams.find((t) => t.id === e.team_id);
          events.push({
            id: `te:${e.id}`, entityId: `team:${e.team_id}`,
            kind: e.event_type === "game" ? "game" : "practice",
            title: e.event_type === "game"
              ? `${team?.name ?? "Team"} vs ${e.opponent_name ?? "Opponent"}`
              : (e.title ?? `${team?.name ?? "Team"} Practice`),
            location: e.venue, date: e.event_date, start, durationMin: dur,
            href: `/coach/teams/${e.team_id}/schedule/${e.id}`,
          });
        });
      }
      camps.forEach((c) => {
        if (!c.start_date) return;
        events.push({
          id: `camp:${c.id}`, entityId: `camp:${c.id}`, kind: "camp",
          title: c.name, location: c.venue_name, date: c.start_date, start: "09:00", durationMin: 360,
          href: `/coach/camps/${c.id}`,
        });
      });
      privates.forEach((p) => {
        events.push({
          id: `pr:${p.id}`, entityId: "private", kind: "private",
          title: `Private · ${p.athlete_name ?? "Athlete"}`,
          location: p.location, date: p.session_date,
          start: (p.start_time ?? "06:00").slice(0, 5),
          durationMin: p.duration_minutes ?? 60,
        });
      });

      if (!cancelled) setState({ entities, events, loading: false });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function diffMin(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
}

// ---------- Default filter persistence ----------
const DEFAULT_KEY = "events.defaultFilter";

// ---------- Main ----------
function EventsCalendar() {
  const { entities, events, loading } = useLiveData();
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [filter, setFilter] = useState<string>("all");
  const [defaultFilter, setDefaultFilter] = useState<string>("all");
  const [longPressFor, setLongPressFor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createAt, setCreateAt] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(DEFAULT_KEY) : null;
    if (saved) { setDefaultFilter(saved); setFilter(saved); }
  }, []);

  const visibleEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.entityId === filter);
  }, [events, filter]);

  const entityById = useMemo(() => {
    const m = new Map<string, Entity>();
    entities.forEach((e) => m.set(e.id, e));
    return m;
  }, [entities]);

  function setAsDefault(id: string) {
    localStorage.setItem(DEFAULT_KEY, id);
    setDefaultFilter(id);
    setLongPressFor(null);
  }
  function removeDefault() {
    localStorage.removeItem(DEFAULT_KEY);
    setDefaultFilter("all");
    setLongPressFor(null);
  }

  return (
    <div className="-mx-5 -mt-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3">
        <h1 className="font-display text-2xl font-bold">Events</h1>
        <button
          onClick={() => { setCreateAt(null); setCreateOpen(true); }}
          className="grid h-9 w-9 place-items-center rounded-full bg-teal text-background shadow"
          aria-label="Create event"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* View toggle */}
      <div className="mt-3 px-5">
        <div className="grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-full py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors " +
                (view === v ? "bg-teal text-background" : "text-muted-foreground")
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          label="All" active={filter === "all"} isDefault={defaultFilter === "all"}
          onClick={() => setFilter("all")}
          onLongPress={() => setLongPressFor("all")}
        />
        {entities.map((e) => (
          <FilterChip
            key={e.id} label={e.name} color={e.color}
            active={filter === e.id} isDefault={defaultFilter === e.id}
            onClick={() => setFilter(e.id)}
            onLongPress={() => setLongPressFor(e.id)}
          />
        ))}
      </div>

      {/* Long-press default sheet */}
      {longPressFor && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={() => setLongPressFor(null)}>
          <div className="w-full rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-xs text-muted-foreground">
              Filter: <span className="font-semibold text-foreground">
                {longPressFor === "all" ? "All" : entityById.get(longPressFor)?.name}
              </span>
            </p>
            {defaultFilter === longPressFor ? (
              <button onClick={removeDefault} className="w-full rounded-xl border border-border p-3 text-sm font-semibold">
                Remove Default
              </button>
            ) : (
              <button onClick={() => setAsDefault(longPressFor)} className="w-full rounded-xl bg-teal p-3 text-sm font-bold text-background">
                Set as Default
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <div className="px-5 pt-6 text-xs text-muted-foreground">Loading calendar…</div>}

      {/* Views */}
      {!loading && view === "day" && (
        <DayView
          cursor={cursor} setCursor={setCursor}
          events={visibleEvents} entityById={entityById}
          onCreateAt={(t) => { setCreateAt(t); setCreateOpen(true); }}
        />
      )}
      {!loading && view === "week" && (
        <WeekView
          cursor={cursor} setCursor={setCursor}
          events={visibleEvents} entityById={entityById}
          onCreateAt={(d, t) => { setCursor(d); setCreateAt(t); setCreateOpen(true); }}
          onSwitchDay={(d) => { setCursor(d); setView("day"); }}
        />
      )}
      {!loading && view === "month" && (
        <MonthView
          cursor={cursor} setCursor={setCursor}
          events={visibleEvents} entityById={entityById}
          onPickDay={(d) => { setCursor(d); setView("day"); }}
        />
      )}

      {createOpen && (
        <CreateSheet
          initialTime={createAt}
          onClose={() => setCreateOpen(false)}
          entities={entities}
        />
      )}
    </div>
  );
}

// ---------- Filter chip with long-press ----------
function FilterChip({
  label, color, active, isDefault, onClick, onLongPress,
}: {
  label: string; color?: string; active: boolean; isDefault: boolean;
  onClick: () => void; onLongPress: () => void;
}) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function start() {
    timer.current = setTimeout(() => { onLongPress(); timer.current = null; }, 500);
  }
  function end() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }
  return (
    <button
      onClick={onClick}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      className={
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap " +
        (active ? "border-teal bg-teal/15 text-foreground" : "border-border bg-surface text-muted-foreground")
      }
    >
      {color && <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
      {isDefault && <Star size={10} className="text-amber-400" fill="currentColor" />}
    </button>
  );
}

// ---------- DAY VIEW ----------
const HOUR_START = 5;
const HOUR_END = 23;
const SLOT_MIN = 30;
const PX_PER_MIN = 1.1;

function DayView({
  cursor, setCursor, events, entityById, onCreateAt,
}: {
  cursor: Date; setCursor: (d: Date) => void;
  events: CalEvent[]; entityById: Map<string, Entity>;
  onCreateAt: (time: string) => void;
}) {
  const key = toDateKey(cursor);
  const dayEvents = events.filter((e) => e.date === key);
  const isToday = isSameDay(cursor, new Date());

  const slots: string[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== HOUR_END) slots.push(`${String(h).padStart(2, "0")}:30`);
  }

  return (
    <div className="mt-4">
      {/* Date header */}
      <div className="flex items-center justify-between px-5">
        <button onClick={() => setCursor(addDays(cursor, -1))} className="grid h-8 w-8 place-items-center rounded-full border border-border">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">{longDate(cursor)}</p>
          {!isToday && (
            <button onClick={() => setCursor(new Date())} className="mt-1 rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold text-background">
              Today
            </button>
          )}
        </div>
        <button onClick={() => setCursor(addDays(cursor, 1))} className="grid h-8 w-8 place-items-center rounded-full border border-border">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Time slots */}
      <div className="relative mt-4 px-5">
        <div className="relative">
          {slots.map((t, i) => (
            <div
              key={t}
              onClick={() => onCreateAt(t)}
              className={"flex items-start gap-3 border-t border-border/40 " + (i === 0 ? "border-t-0" : "")}
              style={{ height: SLOT_MIN * PX_PER_MIN }}
            >
              <div className="w-12 shrink-0 pt-1 text-[10px] font-semibold text-muted-foreground">
                {t.endsWith(":00") ? fmtTime(t) : ""}
              </div>
              <div className="flex-1" />
            </div>
          ))}

          {/* Event blocks absolutely positioned */}
          <div className="pointer-events-none absolute inset-0 pl-[60px]">
            {dayEvents.map((e) => {
              const [h, m] = e.start.split(":").map(Number);
              const offsetMin = (h - HOUR_START) * 60 + m;
              const top = offsetMin * PX_PER_MIN;
              const height = Math.max(28, e.durationMin * PX_PER_MIN - 4);
              const ent = entityById.get(e.entityId);
              const color = ent?.color ?? "#00BFA5";
              return (
                <EventBlockLink key={e.id} event={e}>
                  <div
                    className="pointer-events-auto absolute right-0 left-0 mr-1 overflow-hidden rounded-xl border-l-4 px-3 py-2"
                    style={{
                      top, height, borderLeftColor: color,
                      background: color + "22",
                    }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>
                      {e.kind}
                    </p>
                    <p className="truncate text-xs font-bold text-foreground">{e.title}</p>
                    {e.location && <p className="truncate text-[10px] text-muted-foreground">{e.location} · {e.durationMin} min</p>}
                    {e.rsvp && (
                      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                        ✓{e.rsvp.yes} · ?{e.rsvp.maybe} · ✗{e.rsvp.no}
                      </p>
                    )}
                  </div>
                </EventBlockLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventBlockLink({ event, children }: { event: CalEvent; children: React.ReactNode }) {
  if (!event.href) return <>{children}</>;
  return (
    <Link to={event.href} className="block">{children}</Link>
  );
}

// ---------- WEEK VIEW ----------
function WeekView({
  cursor, setCursor, events, entityById, onCreateAt, onSwitchDay,
}: {
  cursor: Date; setCursor: (d: Date) => void;
  events: CalEvent[]; entityById: Map<string, Entity>;
  onCreateAt: (d: Date, t: string) => void;
  onSwitchDay: (d: Date) => void;
}) {
  const monday = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = new Date();

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-5">
        <button onClick={() => setCursor(addDays(cursor, -7))} className="grid h-8 w-8 place-items-center rounded-full border border-border">
          <ChevronLeft size={16} />
        </button>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {addDays(monday, 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        <button onClick={() => setCursor(addDays(cursor, 7))} className="grid h-8 w-8 place-items-center rounded-full border border-border">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 overflow-x-auto px-5">
        <div className="min-w-[640px]">
          {/* Column headers */}
          <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-1 pb-2">
            <div />
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              return (
                <button key={toDateKey(d)} onClick={() => onSwitchDay(d)} className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={"mx-auto mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs font-bold " +
                    (isToday ? "bg-teal text-background" : "text-foreground")}>
                    {d.getDate()}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div className="relative grid grid-cols-[40px_repeat(7,1fr)] gap-1">
            <div>
              {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                <div key={i} style={{ height: 60 * PX_PER_MIN }} className="pt-1 text-[9px] font-semibold text-muted-foreground">
                  {fmtTime(`${String(HOUR_START + i).padStart(2, "0")}:00`)}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const dk = toDateKey(d);
              const dayEvents = events.filter((e) => e.date === dk);
              return (
                <div key={dk} className="relative rounded-lg border border-border/40">
                  {Array.from({ length: (HOUR_END - HOUR_START) * 2 + 1 }, (_, i) => (
                    <div
                      key={i}
                      onClick={() => onCreateAt(d, `${String(HOUR_START + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`)}
                      className="border-t border-border/30 first:border-t-0"
                      style={{ height: SLOT_MIN * PX_PER_MIN }}
                    />
                  ))}
                  {dayEvents.map((e) => {
                    const [h, m] = e.start.split(":").map(Number);
                    const top = ((h - HOUR_START) * 60 + m) * PX_PER_MIN;
                    const height = Math.max(22, e.durationMin * PX_PER_MIN - 2);
                    const ent = entityById.get(e.entityId);
                    const color = ent?.color ?? "#00BFA5";
                    return (
                      <EventBlockLink key={e.id} event={e}>
                        <div
                          className="absolute inset-x-0.5 overflow-hidden rounded-md border-l-2 px-1 py-0.5"
                          style={{ top, height, borderLeftColor: color, background: color + "22" }}
                        >
                          <p className="truncate text-[9px] font-bold text-foreground">{e.title}</p>
                          <p className="text-[8px] text-muted-foreground">{fmtTime(e.start)}</p>
                        </div>
                      </EventBlockLink>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- MONTH VIEW ----------
function MonthView({
  cursor, setCursor, events, entityById, onPickDay,
}: {
  cursor: Date; setCursor: (d: Date) => void;
  events: CalEvent[]; entityById: Map<string, Entity>;
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div className="mt-4 px-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-full border border-border">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold">{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-full border border-border">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const dk = toDateKey(d);
          const dayEvents = events.filter((e) => e.date === dk);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          return (
            <button
              key={dk}
              onClick={() => onPickDay(d)}
              className={
                "aspect-square rounded-lg border p-1 text-left transition-colors " +
                (inMonth ? "border-border/60 bg-surface/50" : "border-transparent opacity-40") +
                (dayEvents.length > 0 ? " bg-surface" : "")
              }
            >
              <div className={
                "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold " +
                (isToday ? "bg-teal text-background" : "text-foreground")
              }>{d.getDate()}</div>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const ent = entityById.get(e.entityId);
                  return <span key={e.id} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: ent?.color ?? "#00BFA5" }} />;
                })}
              </div>
              {dayEvents.length > 3 && (
                <p className="mt-0.5 text-[8px] text-muted-foreground">+{dayEvents.length - 3} more</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- CREATE SHEET ----------
const TYPE_OPTIONS: Array<{ id: EventKind; label: string; icon: string }> = [
  { id: "game", label: "Game", icon: "🏒" },
  { id: "practice", label: "Practice", icon: "🏃" },
  { id: "tournament", label: "Tournament", icon: "🏆" },
  { id: "camp", label: "Camp", icon: "🏕" },
  { id: "private", label: "Private Session", icon: "👤" },
];

function CreateSheet({
  initialTime, onClose, entities,
}: {
  initialTime: string | null; onClose: () => void; entities: Entity[];
}) {
  const [type, setType] = useState<EventKind | null>(null);
  const [teamId, setTeamId] = useState<string>(entities.find((e) => e.kind === "team")?.id ?? "");
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [time, setTime] = useState(initialTime ?? "17:00");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [homeAway, setHomeAway] = useState<"home" | "away">("home");
  const [athlete, setAthlete] = useState("");
  const [rate, setRate] = useState("");
  const [privateType, setPrivateType] = useState("Skating");
  const [repeat, setRepeat] = useState(false);
  const [notify, setNotify] = useState(true);
  const [notes, setNotes] = useState("");

  const teams = entities.filter((e) => e.kind === "team");

  function save() {
    // Save is out of scope of visual rebuild — close and let existing flows persist.
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{type ? `New ${TYPE_OPTIONS.find((t) => t.id === type)?.label}` : "What type of event?"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-border"><X size={14} /></button>
        </div>

        {!type && (
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => setType(o.id)}
                className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-background p-4 hover:border-teal"
              >
                <span className="text-2xl">{o.icon}</span>
                <span className="text-xs font-semibold">{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {type && (
          <div className="space-y-3">
            {(type === "game" || type === "practice" || type === "tournament") && (
              <Field label="Team">
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm">
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}

            {type === "game" && (
              <>
                <Field label="Opponent"><TextInput value={opponent} onChange={setOpponent} /></Field>
                <Field label="Home / Away">
                  <div className="grid grid-cols-2 gap-1 rounded-full border border-border p-1">
                    {(["home", "away"] as const).map((h) => (
                      <button key={h} onClick={() => setHomeAway(h)} className={"rounded-full py-1 text-xs font-bold " + (homeAway === h ? "bg-teal text-background" : "text-muted-foreground")}>
                        {h.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {type === "private" && (
              <>
                <Field label="Athlete"><TextInput value={athlete} onChange={setAthlete} placeholder="Search roster or non-roster client" /></Field>
                <Field label="Session Type">
                  <select value={privateType} onChange={(e) => setPrivateType(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm">
                    {["Skating", "Shooting", "Goalie", "Strength", "Skills"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Rate ($) — optional"><TextInput value={rate} onChange={setRate} placeholder="e.g. 80" /></Field>
                <p className="rounded-lg bg-rose-500/10 p-2 text-[10px] text-rose-300">Invite-only · does not appear on public booking page.</p>
              </>
            )}

            {(type === "practice" || type === "camp") && (
              <Field label="Title"><TextInput value={title} onChange={setTitle} /></Field>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm" /></Field>
              <Field label="Time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm" /></Field>
            </div>

            <Field label="Duration (min)">
              <TextInput value={String(duration)} onChange={(v) => setDuration(parseInt(v) || 60)} />
            </Field>

            <Field label="Location / Rink"><TextInput value={location} onChange={setLocation} /></Field>

            <Field label="Notes"><TextInput value={notes} onChange={setNotes} /></Field>

            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span>Repeat</span>
              <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span>Notify Team</span>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            </label>

            <button onClick={save} className="mt-2 w-full rounded-xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow">
              Save
            </button>
            <button onClick={() => setType(null)} className="w-full py-2 text-xs text-muted-foreground">← Pick a different type</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-background p-2 text-sm"
    />
  );
}
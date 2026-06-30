import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createEvent } from "@/lib/teams.functions";
import { Plus, X, Disc, Dumbbell, ChevronDown } from "lucide-react";
import { maskName } from "@/lib/team-stats";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/")({
  component: Schedule,
});

type EventRow = { id: string; event_type: "game" | "practice" | "team_event"; title: string | null; opponent_name: string | null; home_away: string | null; venue: string | null; event_date: string; start_time: string | null };
type RsvpCounts = { yes: number; no: number; maybe: number; none: number };
type ResultRow = { team_score: number; opponent_score: number; result: string | null; leader: { name: string; g: number; a: number; pts: number } | null; shutout: { name: string; svpct: string } | null };
type FilterTab = "all" | "games" | "practices";

// Mock data shown alongside real events so empty demo teams still feel populated.
const MOCK_UPCOMING: Array<{
  id: string;
  kind: "game" | "practice";
  opponent?: string;
  date: string;
  time: string;
  venue: string;
  going?: number;
  pending?: number;
  out?: number;
}> = [
  { id: "mock-up-1", kind: "game", opponent: "Burnaby Winter Club", date: "Sat, Jul 5", time: "6:00 PM", venue: "Cloverdale Arena", going: 9, pending: 2, out: 1 },
  { id: "mock-up-2", kind: "practice", date: "Thu, Jul 9", time: "7:45 AM", venue: "Surrey Sport and Leisure" },
  { id: "mock-up-3", kind: "game", opponent: "Coquitlam Express", date: "Sat, Jul 12", time: "4:30 PM", venue: "Poirier Sport Centre", going: 11, pending: 1, out: 0 },
];
const MOCK_PAST: Array<{ id: string; opponent: string; date: string; teamScore: number; oppScore: number; result: "WIN" | "LOSS" | "OT" }> = [
  { id: "mock-past-1", opponent: "Langley Trappers", date: "Jun 22", teamScore: 4, oppScore: 2, result: "WIN" },
  { id: "mock-past-2", opponent: "North Delta Lightning", date: "Jun 18", teamScore: 1, oppScore: 3, result: "LOSS" },
  { id: "mock-past-3", opponent: "Richmond Sockeyes", date: "Jun 14", teamScore: 2, oppScore: 2, result: "OT" },
];

function fmtDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10); const ap = hr >= 12 ? "PM" : "AM"; const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function resultBadgeClass(r: string) {
  const up = r.toUpperCase();
  if (up === "WIN") return "bg-emerald-500/15 text-emerald-400";
  if (up === "LOSS") return "bg-red-500/15 text-red-400";
  return "bg-teal/15 text-teal";
}

function Dot({ className }: { className: string }) {
  return <span className={"inline-block h-1.5 w-1.5 rounded-full " + className} />;
}

function AvailabilityRow({ going, pending, out }: { going: number; pending: number; out: number }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1"><Dot className="bg-emerald-400" /> <span className="font-semibold text-foreground">{going}</span> going</span>
      <span className="inline-flex items-center gap-1"><Dot className="bg-amber-400" /> <span className="font-semibold text-foreground">{pending}</span> pending</span>
      <span className="inline-flex items-center gap-1"><Dot className="bg-red-400" /> <span className="font-semibold text-foreground">{out}</span> out</span>
    </div>
  );
}

function Schedule() {
  const { teamId } = Route.useParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [counts, setCounts] = useState<Record<string, RsvpCounts>>({});
  const [results, setResults] = useState<Record<string, ResultRow>>({});
  const [adding, setAdding] = useState<null | "game" | "practice">(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  async function refresh() {
    const { data } = await supabase
      .from("team_events")
      .select("id,event_type,title,opponent_name,home_away,venue,event_date,start_time")
      .eq("team_id", teamId)
      .order("event_date", { ascending: true });
    const evs = (data ?? []) as EventRow[];
    setEvents(evs);
    if (evs.length) {
      const eventIds = evs.map((e) => e.id);
      const [{ data: roster }, { data: rsvps }] = await Promise.all([
        supabase.from("team_players").select("id").eq("team_id", teamId),
        supabase.from("team_event_rsvps").select("event_id,response").in("event_id", eventIds),
      ]);
      const total = (roster ?? []).length;
      const map: Record<string, RsvpCounts> = {};
      for (const id of eventIds) map[id] = { yes: 0, no: 0, maybe: 0, none: total };
      for (const r of (rsvps ?? []) as { event_id: string; response: string }[]) {
        const c = map[r.event_id]; if (!c) continue;
        if (r.response === "yes") c.yes++;
        else if (r.response === "no") c.no++;
        else if (r.response === "maybe") c.maybe++;
        c.none = Math.max(0, c.none - 1);
      }
      setCounts(map);
      const gameIds = evs.filter((e) => e.event_type === "game").map((e) => e.id);
      if (gameIds.length) {
        const [{ data: gr }, { data: ps }, { data: gs }, { data: tp }] = await Promise.all([
          supabase.from("game_results").select("event_id,team_score,opponent_score,result").in("event_id", gameIds),
          supabase.from("game_player_stats").select("event_id,team_player_id,goals,assists,points").in("event_id", gameIds),
          supabase.from("game_goalie_stats").select("event_id,team_player_id,shutout,saves,goals_against").in("event_id", gameIds),
          supabase.from("team_players").select("id,display_name").eq("team_id", teamId),
        ]);
        const nameMap = new Map(((tp ?? []) as any[]).map((p) => [p.id, p.display_name as string]));
        const rmap: Record<string, ResultRow> = {};
        for (const r of (gr ?? []) as any[]) {
          rmap[r.event_id] = { team_score: r.team_score, opponent_score: r.opponent_score, result: r.result, leader: null, shutout: null };
        }
        // leaders
        const perGame: Record<string, any[]> = {};
        for (const s of (ps ?? []) as any[]) (perGame[s.event_id] ??= []).push(s);
        for (const [eid, rows] of Object.entries(perGame)) {
          if (!rmap[eid]) continue;
          const top = rows.sort((a: any, b: any) => (b.points ?? b.goals + b.assists) - (a.points ?? a.goals + a.assists))[0];
          if (top && (top.points ?? top.goals + top.assists) > 0) {
            const name = maskName(nameMap.get(top.team_player_id) ?? "");
            rmap[eid].leader = { name, g: top.goals, a: top.assists, pts: top.points ?? top.goals + top.assists };
          }
        }
        for (const g of (gs ?? []) as any[]) {
          if (!g.shutout || !rmap[g.event_id]) continue;
          const shots = (g.saves ?? 0) + (g.goals_against ?? 0);
          const pct = shots ? "." + Math.round((g.saves / shots) * 1000).toString().padStart(3, "0") : "—";
          rmap[g.event_id].shutout = { name: maskName(nameMap.get(g.team_player_id) ?? ""), svpct: pct };
        }
        setResults(rmap);
      } else {
        setResults({});
      }
    } else {
      setCounts({});
      setResults({});
    }
  }
  useEffect(() => { refresh(); }, [teamId]);

  const today = todayISO();
  const filterFn = (e: EventRow) => {
    if (filter === "games") return e.event_type === "game";
    if (filter === "practices") return e.event_type === "practice";
    return e.event_type === "game" || e.event_type === "practice";
  };
  const upcomingReal = events.filter((e) => e.event_date >= today && filterFn(e));
  const pastReal = events
    .filter((e) => e.event_date < today && e.event_type === "game" && filter !== "practices")
    .sort((a, b) => (a.event_date < b.event_date ? 1 : -1));

  const mockUpcomingFiltered = MOCK_UPCOMING.filter((m) =>
    filter === "all" ? true : filter === "games" ? m.kind === "game" : m.kind === "practice"
  );
  const mockPastFiltered = filter === "practices" ? [] : MOCK_PAST;
  const fallbackEventId = events[0]?.id ?? null;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {([
            { id: "all", label: "All" },
            { id: "games", label: "Games" },
            { id: "practices", label: "Practices" },
          ] as const).map((c) => {
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={
                  "shrink-0 border-b-2 px-2 py-1.5 text-[12px] font-bold transition-colors " +
                  (active ? "border-teal text-teal" : "border-transparent text-muted-foreground")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            <Plus size={12} /> Add <ChevronDown size={11} />
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                <button
                  onClick={() => { setPickerOpen(false); setAdding("game"); }}
                  className="block w-full px-3 py-2 text-left text-xs font-semibold hover:bg-surface-2"
                >
                  Add Game
                </button>
                <button
                  onClick={() => { setPickerOpen(false); setAdding("practice"); }}
                  className="block w-full border-t border-border px-3 py-2 text-left text-xs font-semibold hover:bg-surface-2"
                >
                  Add Practice
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Upcoming</h3>
        <div className="mt-2 space-y-2.5">
          {upcomingReal.map((e) => {
            const c = counts[e.id];
            const isGame = e.event_type === "game";
            const label = isGame
              ? `${e.home_away === "away" ? "@ " : "vs. "}${e.opponent_name || "TBD"}`
              : e.title || "Practice";
            const sub = `${fmtDate(e.event_date)}${e.start_time ? " · " + fmtTime(e.start_time) : ""}${e.venue ? " · " + e.venue : ""}`;
            return (
              <Link
                key={e.id}
                to="/coach/teams/$teamId/schedule/$eventId"
                params={{ teamId, eventId: e.id }}
                className="block rounded-2xl border border-border bg-surface p-3"
              >
                <div className="flex items-center gap-2">
                  {isGame ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-teal">
                      <Disc size={10} /> GAME
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-bold tracking-wider text-muted-foreground">
                      <Dumbbell size={10} /> PRACTICE
                    </span>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
                {isGame && c && <AvailabilityRow going={c.yes} pending={c.maybe} out={c.no} />}
              </Link>
            );
          })}
          {mockUpcomingFiltered.map((m) => {
            const card = (
              <>
              <div className="flex items-center gap-2">
                {m.kind === "game" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-teal">
                    <Disc size={10} /> GAME
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-bold tracking-wider text-muted-foreground">
                    <Dumbbell size={10} /> PRACTICE
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold">
                {m.kind === "game" ? `vs. ${m.opponent}` : "Practice"}
              </p>
              <p className="text-[11px] text-muted-foreground">{m.date} · {m.time} · {m.venue}</p>
              {m.kind === "game" && (
                <AvailabilityRow going={m.going ?? 0} pending={m.pending ?? 0} out={m.out ?? 0} />
              )}
              </>
            );
            const cls = "block w-full text-left rounded-2xl border border-border bg-surface p-3 active:bg-surface-2";
            return fallbackEventId ? (
              <Link key={m.id} to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId: fallbackEventId }} className={cls}>
                {card}
              </Link>
            ) : (
              <button key={m.id} type="button" className={cls}>{card}</button>
            );
          })}
          {upcomingReal.length === 0 && mockUpcomingFiltered.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">No upcoming events.</p>
          )}
        </div>
      </div>

      {/* Past */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Past</h3>
        <div className="mt-2 space-y-2.5">
          {pastReal.map((e) => {
            const res = results[e.id];
            const opp = e.opponent_name || "Opponent";
            return (
              <Link
                key={e.id}
                to="/coach/teams/$teamId/schedule/$eventId"
                params={{ teamId, eventId: e.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">vs. {opp}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDate(e.event_date)}</p>
                </div>
                {res && (
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold leading-none">{res.team_score} — {res.opponent_score}</span>
                    {res.result && (
                      <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider " + resultBadgeClass(res.result === "win" ? "WIN" : res.result === "loss" ? "LOSS" : "OT")}>
                        {res.result === "win" ? "WIN" : res.result === "loss" ? "LOSS" : "OT"}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
          {mockPastFiltered.map((m) => {
            const card = (
              <>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">vs. {m.opponent}</p>
                <p className="text-[11px] text-muted-foreground">{m.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold leading-none">{m.teamScore} — {m.oppScore}</span>
                <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider " + resultBadgeClass(m.result)}>{m.result}</span>
              </div>
              </>
            );
            const cls = "flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-3 text-left active:bg-surface-2";
            return fallbackEventId ? (
              <Link key={m.id} to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId: fallbackEventId }} className={cls}>
                {card}
              </Link>
            ) : (
              <button key={m.id} type="button" className={cls}>{card}</button>
            );
          })}
          {pastReal.length === 0 && mockPastFiltered.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">No past games.</p>
          )}
        </div>
      </div>

      {adding && (
        <AddEventSheet
          teamId={teamId}
          defaultType={adding}
          onClose={() => setAdding(null)}
          onSaved={() => { setAdding(null); refresh(); }}
        />
      )}
    </div>
  );
}

function AddEventSheet({ teamId, defaultType, onClose, onSaved }: { teamId: string; defaultType: "game" | "practice"; onClose: () => void; onSaved: () => void }) {
  const create = useServerFn(createEvent);
  const [form, setForm] = useState({
    eventType: defaultType as "game" | "practice" | "team_event",
    title: "", opponentName: "", homeAway: "home" as "home" | "away" | "neutral",
    venue: "", eventDate: new Date().toISOString().slice(0, 10), startTime: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await create({ data: { teamId, ...form } });
      onSaved();
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{defaultType === "game" ? "Add Game" : "Add Practice"}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="mt-3 space-y-3">
          {form.eventType === "game" && (
            <>
              <Field label="Opponent" value={form.opponentName} onChange={(v) => setForm({ ...form, opponentName: v })} />
              <div className="grid grid-cols-3 gap-1 rounded-full bg-background p-1">
                {(["home", "away", "neutral"] as const).map((h) => (
                  <button key={h} type="button" onClick={() => setForm({ ...form, homeAway: h })}
                    className={"rounded-full py-1.5 text-[11px] font-bold " + (form.homeAway === h ? "bg-teal text-background" : "text-muted-foreground")}>
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
          <Field label="Venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date" type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} />
            <Field label="Start time" type="time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} />
          </div>
          <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <button disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
    </label>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createEvent } from "@/lib/teams.functions";
import { loadTeamSeasonStats, type TeamRecord, type SkaterAgg } from "@/lib/team-stats";
import { Swords, Dumbbell, MapPin, Users, Plus, Flame, Medal, ChevronRight, AlertTriangle, X, Film } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/")({
  component: TeamDashboard,
});

type EventRow = {
  id: string;
  event_type: "game" | "practice" | "team_event";
  title: string | null;
  opponent_name: string | null;
  home_away: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
};
type RsvpRow = { event_id: string; response: "yes" | "no" | "maybe" };
type AttRow = { event_id: string; status: string };
type MediaRow = { id: string; thumbnail_url: string | null; url: string; caption: string | null; athlete_tags: any; created_at: string };
type DLRow = { athlete_id: string; full_name: string; sessions_in_window: number; current_streak_weeks: number };

function fmtDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ap = hr >= 12 ? "PM" : "AM";
  const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}

function TeamDashboard() {
  const { teamId } = Route.useParams();

  // Section 1: Season record
  const [record, setRecord] = useState<TeamRecord | null>(null);
  const [skaters, setSkaters] = useState<SkaterAgg[]>([]);

  // Section 2/3: Upcoming events
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [rosterSize, setRosterSize] = useState(0);
  const [rsvpByEvent, setRsvpByEvent] = useState<Record<string, { yes: number }>>({});

  // Section 6: Dryland
  const [dryland, setDryland] = useState<DLRow[]>([]);

  // Section 7: Attendance
  const [attendance, setAttendance] = useState<{ avg: number | null; prev: number | null }>({ avg: null, prev: null });

  // Section 9: Recent film
  const [film, setFilm] = useState<MediaRow[]>([]);

  // Create practice sheet
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadTeamSeasonStats(teamId, "all");
      setRecord(s.record); setSkaters(s.skaters);
    })();
  }, [teamId]);

  async function refreshEvents() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: evs } = await supabase
      .from("team_events")
      .select("id,event_type,title,opponent_name,home_away,venue,event_date,start_time")
      .eq("team_id", teamId)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(10);
    const list = (evs ?? []) as EventRow[];
    setUpcoming(list);
    const { data: roster } = await supabase.from("team_players").select("id").eq("team_id", teamId);
    setRosterSize((roster ?? []).length);
    if (list.length) {
      const ids = list.map((e) => e.id);
      const { data: rsvps } = await supabase.from("team_event_rsvps").select("event_id,response").in("event_id", ids);
      const map: Record<string, { yes: number }> = {};
      for (const id of ids) map[id] = { yes: 0 };
      for (const r of ((rsvps ?? []) as RsvpRow[])) {
        if (r.response === "yes") map[r.event_id].yes++;
      }
      setRsvpByEvent(map);
    } else {
      setRsvpByEvent({});
    }
  }

  useEffect(() => { refreshEvents(); }, [teamId]);

  // Dryland top-3 this month
  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(1); since.setHours(0, 0, 0, 0);
      const { data } = await (supabase as any).rpc("get_team_dryland_leaderboard", {
        _team_id: teamId, _since: since.toISOString(),
      });
      const rows = ((data ?? []) as DLRow[])
        .filter((r) => r.sessions_in_window > 0)
        .sort((a, b) => b.sessions_in_window - a.sessions_in_window)
        .slice(0, 3);
      setDryland(rows);
    })();
  }, [teamId]);

  // Attendance trend: last 5 practices vs prior 5
  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: pracs } = await supabase
        .from("team_events")
        .select("id,event_date")
        .eq("team_id", teamId)
        .eq("event_type", "practice")
        .lte("event_date", today)
        .order("event_date", { ascending: false })
        .limit(10);
      const list = (pracs ?? []) as { id: string; event_date: string }[];
      const { data: roster } = await supabase.from("team_players").select("id").eq("team_id", teamId);
      const total = (roster ?? []).length;
      if (!list.length || !total) { setAttendance({ avg: null, prev: null }); return; }
      const ids = list.map((e) => e.id);
      const { data: att } = await supabase
        .from("team_event_attendance")
        .select("event_id,status")
        .in("event_id", ids);
      const presentByEvent = new Map<string, number>();
      for (const a of ((att ?? []) as AttRow[])) {
        if (a.status === "present" || a.status === "late") {
          presentByEvent.set(a.event_id, (presentByEvent.get(a.event_id) ?? 0) + 1);
        }
      }
      const pct = (id: string) => Math.round(((presentByEvent.get(id) ?? 0) / total) * 100);
      const recent = list.slice(0, 5).map((e) => pct(e.id));
      const prior = list.slice(5, 10).map((e) => pct(e.id));
      const avg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : null;
      const prev = prior.length ? Math.round(prior.reduce((a, b) => a + b, 0) / prior.length) : null;
      setAttendance({ avg, prev });
    })();
  }, [teamId]);

  // Recent film (last 3 videos)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("game_media")
        .select("id,thumbnail_url,url,caption,athlete_tags,created_at")
        .eq("team_id", teamId)
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(3);
      setFilm((data ?? []) as MediaRow[]);
    })();
  }, [teamId]);

  const nextEvent = upcoming[0] ?? null;

  const gamePlanEvent = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 48 * 60 * 60 * 1000;
    for (const e of upcoming) {
      if (e.event_type !== "game") continue;
      const ts = new Date(e.event_date + "T" + (e.start_time || "23:59")).getTime();
      if (ts >= now && ts <= cutoff) return e;
    }
    return null;
  }, [upcoming]);

  // Leaderboards: top 3 by goals, assists, points
  const goalsTop3 = useMemo(() => [...skaters].sort((a, b) => b.g - a.g || b.pts - a.pts).slice(0, 3), [skaters]);
  const assistsTop3 = useMemo(() => [...skaters].sort((a, b) => b.a - a.a || b.pts - a.pts).slice(0, 3), [skaters]);
  const pointsTop3 = useMemo(() => [...skaters].sort((a, b) => b.pts - a.pts || b.g - a.g).slice(0, 3), [skaters]);

  const dropPct = attendance.avg != null && attendance.prev != null ? attendance.prev - attendance.avg : 0;
  const showAttendanceWarning = dropPct > 15;

  return (
    <div className="space-y-5 pb-10">
      {/* 1. Season Record */}
      <section>
        <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">SEASON RECORD</p>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-4">
          <RecordStat label="Wins" value={record?.w ?? 0} accent="text-emerald-400" />
          <RecordStat label="Losses" value={record?.l ?? 0} accent="text-red-400" />
          <RecordStat label="OT" value={(record?.otl ?? 0) + (record?.sol ?? 0) + (record?.otw ?? 0) + (record?.sow ?? 0)} accent="text-teal" />
        </div>
      </section>

      {/* 2. Next Event */}
      {nextEvent && (
        <NextEventCard
          teamId={teamId}
          event={nextEvent}
          yesCount={rsvpByEvent[nextEvent.id]?.yes ?? 0}
          rosterSize={rosterSize}
        />
      )}

      {/* 3. Game Plan (only if within 48h) */}
      {gamePlanEvent && (
        <section className="rounded-2xl border border-teal/40 bg-teal/5 p-4">
          <p className="text-[10px] font-bold tracking-[0.25em] text-teal">GAME PLAN</p>
          <p className="mt-1 text-sm font-bold">
            {gamePlanEvent.home_away === "away" ? "@ " : "vs "}{gamePlanEvent.opponent_name || "TBD"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {fmtDate(gamePlanEvent.event_date)}{gamePlanEvent.start_time ? " · " + fmtTime(gamePlanEvent.start_time) : ""}
          </p>
          <Link
            to="/coach/teams/$teamId/schedule/$eventId/game-prep"
            params={{ teamId, eventId: gamePlanEvent.id }}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-brand py-2 text-xs font-bold text-primary-foreground"
          >
            Open Game Plan
          </Link>
        </section>
      )}

      {/* 4. Create Practice */}
      <button
        onClick={() => setCreateOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-teal py-3 text-sm font-bold text-teal"
      >
        <Plus size={16} /> Create Practice
      </button>

      {/* 5. Team Stats Snapshot */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">TEAM STATS</p>
          <Link to="/coach/teams/$teamId/stats" params={{ teamId }} className="text-[11px] font-bold text-teal">View Full Stats ›</Link>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <LeaderboardColumn title="GOALS" rows={goalsTop3} statKey="g" />
          <LeaderboardColumn title="ASSISTS" rows={assistsTop3} statKey="a" />
          <LeaderboardColumn title="POINTS" rows={pointsTop3} statKey="pts" />
        </div>
      </section>

      {/* 6. Dryland Leaderboard */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">DRYLAND LEADERBOARD</p>
          <Link to="/coach/teams/$teamId/dryland" params={{ teamId }} className="text-[11px] font-bold text-teal">See All ›</Link>
        </div>
        <div className="mt-2 space-y-1.5">
          {dryland.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface p-3 text-center text-[11px] text-muted-foreground">No dryland activity this month.</p>
          )}
          {dryland.map((r, i) => {
            const medal = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-orange-400";
            return (
              <div key={r.athlete_id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2">
                  <Medal size={16} className={medal} />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{r.full_name}</p>
                <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                  <Flame size={11} /> {r.sessions_in_window}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Attendance Trend */}
      {attendance.avg != null && (
        <Link
          to="/coach/teams/$teamId/roster"
          params={{ teamId }}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15">
            <Users size={18} className="text-teal" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">AVG ATTENDANCE — LAST 5</p>
            <p className="text-sm font-bold">{attendance.avg}%</p>
          </div>
          {showAttendanceWarning && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              <AlertTriangle size={11} /> Down {dropPct}%
            </span>
          )}
          <ChevronRight size={14} className="text-muted-foreground" />
        </Link>
      )}

      {/* 8. Unpaid Fees — hidden until fee system exists */}

      {/* 9. Recent Film */}
      {film.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">RECENT FILM</p>
            <Link to="/coach/teams/$teamId/playbook" params={{ teamId }} className="text-[11px] font-bold text-teal">See All ›</Link>
          </div>
          <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto px-1">
            {film.map((m) => {
              const tags = Array.isArray(m.athlete_tags) ? m.athlete_tags : [];
              const tagLabel = tags[0]?.display_name || tags[0]?.name || null;
              return (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block h-28 w-44 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2"
                >
                  {m.thumbnail_url ? (
                    <img src={m.thumbnail_url} alt={m.caption || "Clip"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <Film size={20} />
                    </div>
                  )}
                  {tagLabel && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-bold text-foreground">
                      {tagLabel}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      )}

      {createOpen && (
        <CreatePracticeSheet
          teamId={teamId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => { setCreateOpen(false); refreshEvents(); }}
        />
      )}
    </div>
  );
}

function RecordStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center">
      <p className={"font-display text-3xl font-bold " + accent}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
    </div>
  );
}

function StatChip({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={"rounded-xl border border-border bg-surface px-2 py-2 text-center"}>
      <p className={"font-display text-lg font-bold " + (highlight ? "text-teal" : "")}>{value}</p>
      <p className="text-[9px] font-bold tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function NextEventCard({ teamId, event, yesCount, rosterSize }: { teamId: string; event: EventRow; yesCount: number; rosterSize: number }) {
  const navigate = useNavigate();
  const isGame = event.event_type === "game";
  const Icon = isGame ? Swords : Dumbbell;
  const badgeBg = isGame ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400";
  const label = isGame
    ? `${event.home_away === "away" ? "@" : "vs"} ${event.opponent_name || "TBD"}`
    : event.title || (event.event_type === "practice" ? "Practice" : "Event");

  return (
    <section>
      <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">NEXT EVENT</p>
      <Link
        to="/coach/teams/$teamId/schedule/$eventId"
        params={{ teamId, eventId: event.id }}
        className="mt-2 block rounded-2xl border border-border bg-surface p-3"
      >
        <div className="flex items-start gap-3">
          <div className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl " + badgeBg}>
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className={"inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider " + badgeBg}>
              {isGame ? "GAME" : event.event_type === "practice" ? "PRACTICE" : "EVENT"}
            </span>
            <p className="mt-1 truncate text-sm font-bold">{label}</p>
            <p className="text-[11px] text-muted-foreground">
              {fmtDate(event.event_date)}{event.start_time ? " · " + fmtTime(event.start_time) : ""}
            </p>
            {event.venue && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <MapPin size={11} /> {event.venue}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            navigate({ to: "/coach/teams/$teamId/schedule/$eventId", params: { teamId, eventId: event.id }, hash: "rsvps" });
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-1.5 text-[11px] font-bold text-foreground"
        >
          <Users size={12} className="text-teal" />
          {yesCount} of {rosterSize} attending
        </button>
      </Link>
    </section>
  );
}

function CreatePracticeSheet({ teamId, onClose, onSaved }: { teamId: string; onClose: () => void; onSaved: () => void }) {
  const create = useServerFn(createEvent);
  const [form, setForm] = useState({
    eventDate: new Date().toISOString().slice(0, 10),
    startTime: "",
    venue: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await create({
        data: {
          teamId,
          eventType: "practice",
          title: "",
          opponentName: "",
          homeAway: "home",
          venue: form.venue,
          eventDate: form.eventDate,
          startTime: form.startTime,
          notes: form.notes,
        } as any,
      });
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
          <h3 className="font-bold">Create Practice</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <Field label="Venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} placeholder="Rink name" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date" type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} />
            <Field label="Start time" type="time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} />
          </div>
          <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <button disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Create Practice"}
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
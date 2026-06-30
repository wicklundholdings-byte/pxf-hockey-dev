import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createEvent } from "@/lib/teams.functions";
import { loadTeamSeasonStats, type TeamRecord, type SkaterAgg } from "@/lib/team-stats";
import { mockRecord, mockSkaters } from "@/lib/mock-team-stats";
import {
  MapPin,
  Plus,
  Flame,
  Medal,
  X,
  AlertTriangle,
  Trophy,
  ChevronRight,
  PlayCircle,
} from "lucide-react";

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

function fmtDateShort(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return d; }
}
function fmtDateLong(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ap = hr >= 12 ? "PM" : "AM";
  const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}

// Demo fallback data used when the team has no real records yet
const DEMO_NEXT = {
  opponent: "Burnaby Winter Club",
  dateLabel: "Sat, Jul 5 · 6:00 PM",
  venue: "Cloverdale Arena, Rink 2",
  going: 9,
  pending: 2,
  out: 1,
};
const DEMO_LAST = {
  dateLabel: "Jun 22",
  teamScore: 4,
  oppName: "Langley Trappers",
  oppScore: 2,
  result: "WIN" as const,
};
const DEMO_UPCOMING = [
  { date: "Jul 5", title: "Burnaby Winter Club", time: "6:00 PM", venue: "Cloverdale Arena" },
  { date: "Jul 9", title: "Practice", time: "7:45 AM", venue: "Surrey Sport and Leisure" },
  { date: "Jul 12", title: "Coquitlam Express", time: "4:30 PM", venue: "Poirier Sport Centre" },
];
const DEMO_DRYLAND = [
  { name: "Carter", pts: 1240 },
  { name: "Brooks", pts: 980 },
  { name: "Reilly", pts: 710 },
];
const DEMO_FILM = [
  {
    title: "Practice Highlights",
    date: "Jun 20",
    img: "https://images.unsplash.com/photo-1515703407324-5f51c2ec3e3a?auto=format&fit=crop&w=600&q=70",
  },
  {
    title: "Game vs Langley",
    date: "Jun 22",
    img: "https://images.unsplash.com/photo-1580745294621-26f971f15f1d?auto=format&fit=crop&w=600&q=70",
  },
];
const DEMO_OWING = [
  { name: "Everest Wicklund", amount: 350 },
  { name: "Braxton Wicklund", amount: 350 },
];

function TeamDashboard() {
  const { teamId } = Route.useParams();

  const [record, setRecord] = useState<TeamRecord | null>(null);
  const [skaters, setSkaters] = useState<SkaterAgg[]>([]);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadTeamSeasonStats(teamId, "all");
      if (s.skaters && s.skaters.length > 0) {
        setRecord(s.record);
        setSkaters(s.skaters);
      } else {
        setRecord(mockRecord);
        setSkaters(mockSkaters);
      }
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
    setUpcoming((evs ?? []) as EventRow[]);
  }
  useEffect(() => { refreshEvents(); }, [teamId]);

  const nextEvent = upcoming[0] ?? null;

  const upcomingDisplay = useMemo(() => {
    if (upcoming.length >= 1) {
      return upcoming.slice(0, 3).map((e) => ({
        date: fmtDateShort(e.event_date),
        title: e.event_type === "game"
          ? (e.opponent_name || "TBD")
          : (e.title || (e.event_type === "practice" ? "Practice" : "Event")),
        time: fmtTime(e.start_time),
        venue: e.venue || "",
      }));
    }
    return DEMO_UPCOMING;
  }, [upcoming]);

  const goalsTop3 = useMemo(() => [...skaters].sort((a, b) => b.g - a.g || b.pts - a.pts).slice(0, 3), [skaters]);
  const assistsTop3 = useMemo(() => [...skaters].sort((a, b) => b.a - a.a || b.pts - a.pts).slice(0, 3), [skaters]);
  const pointsTop3 = useMemo(() => [...skaters].sort((a, b) => b.pts - a.pts || b.g - a.g).slice(0, 3), [skaters]);

  return (
    <div className="space-y-5 pb-10">
      {/* 2. NEXT GAME */}
      <section className="rounded-2xl border border-teal/30 bg-teal/10 p-4">
        <p className="text-[10px] font-bold tracking-[0.25em] text-teal">NEXT GAME</p>
        <p className="mt-1 font-display text-lg font-bold leading-tight">
          vs. {nextEvent?.opponent_name || DEMO_NEXT.opponent}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {nextEvent ? `${fmtDateLong(nextEvent.event_date)}${nextEvent.start_time ? " · " + fmtTime(nextEvent.start_time) : ""}` : DEMO_NEXT.dateLabel}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPin size={12} /> {nextEvent?.venue || DEMO_NEXT.venue}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1"><Dot color="bg-emerald-400" /> {DEMO_NEXT.going} going</span>
          <span className="flex items-center gap-1"><Dot color="bg-amber-400" /> {DEMO_NEXT.pending} pending</span>
          <span className="flex items-center gap-1"><Dot color="bg-red-400" /> {DEMO_NEXT.out} out</span>
        </div>
        {nextEvent ? (
          <Link
            to="/coach/teams/$teamId/schedule/$eventId"
            params={{ teamId, eventId: nextEvent.id }}
            className="mt-3 flex w-full items-center justify-center rounded-full border border-teal py-2 text-xs font-bold text-teal"
          >
            View Game
          </Link>
        ) : (
          <Link
            to="/coach/teams/$teamId/schedule"
            params={{ teamId }}
            className="mt-3 flex w-full items-center justify-center rounded-full border border-teal py-2 text-xs font-bold text-teal"
          >
            View Game
          </Link>
        )}
      </section>

      {/* 3. LAST RESULT */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">LAST RESULT · {DEMO_LAST.dateLabel}</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-[12px] text-muted-foreground">Elite Demo Team — {DEMO_LAST.oppName}</p>
            <p className="font-display text-2xl font-bold">{DEMO_LAST.teamScore} <span className="text-muted-foreground">—</span> {DEMO_LAST.oppScore}</p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400">{DEMO_LAST.result}</span>
        </div>
      </section>

      {/* 5. SEASON RECORD */}
      <section>
        <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">SEASON RECORD</p>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-4">
          <RecordStat label="Wins" value={record?.w ?? 0} accent="text-emerald-400" />
          <RecordStat label="Losses" value={record?.l ?? 0} accent="text-red-400" />
          <RecordStat label="OT" value={(record?.otl ?? 0) + (record?.sol ?? 0) + (record?.otw ?? 0) + (record?.sow ?? 0)} accent="text-teal" />
        </div>
      </section>

      {/* 6. UPCOMING SCHEDULE */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">UPCOMING SCHEDULE</p>
          <Link to="/coach/teams/$teamId/schedule" params={{ teamId }} className="text-[11px] font-bold text-teal">View full schedule ›</Link>
        </div>
        <div className="mt-2 space-y-1.5">
          {upcomingDisplay.map((u, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2">
              <div className="w-12 shrink-0 text-center">
                <p className="text-[10px] font-bold tracking-wider text-teal">{u.date}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{u.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{u.time}{u.venue ? " · " + u.venue : ""}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>

      {/* 7. TEAM STATS LEADERBOARD */}
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

      {/* 8. PAYMENT ALERT */}
      <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-100">{DEMO_OWING.length} players have outstanding balances</p>
            <p className="mt-1 text-[11px] text-amber-200/80">
              {DEMO_OWING.map((p) => `${p.name} — $${p.amount} owing`).join(" · ")}
            </p>
          </div>
        </div>
        <Link
          to="/coach/teams/$teamId/payments"
          params={{ teamId }}
          className="mt-3 flex w-full items-center justify-center rounded-full bg-gradient-brand py-2 text-xs font-bold text-background"
        >
          Send Reminders
        </Link>
      </section>

      {/* 9. DRYLAND LEADERBOARD */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">DRYLAND LEADERBOARD · This Month</p>
          <Link to="/coach/teams/$teamId/dryland" params={{ teamId }} className="text-[11px] font-bold text-teal">See All ›</Link>
        </div>
        <div className="mt-2 space-y-1.5">
          {DEMO_DRYLAND.map((r, i) => {
            const medal = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-orange-400";
            const max = DEMO_DRYLAND[0].pts;
            const pct = Math.round((r.pts / max) * 100);
            return (
              <div key={r.name} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2">
                  <Medal size={16} className={medal} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{r.name}</p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                  <Flame size={11} /> {r.pts.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. RECENT FILM */}
      <section>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">RECENT FILM</p>
          <Link to="/coach/teams/$teamId/playbook" params={{ teamId }} className="text-[11px] font-bold text-teal">See All ›</Link>
        </div>
        <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto px-1">
          {DEMO_FILM.map((f) => (
            <div key={f.title} className="relative h-32 w-56 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
              <img src={f.img} alt={f.title} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="truncate text-xs font-bold text-foreground">{f.title}</p>
                <p className="text-[10px] text-muted-foreground">{f.date}</p>
              </div>
              <PlayCircle size={28} className="absolute right-2 top-2 text-background/90 drop-shadow" />
            </div>
          ))}
        </div>
      </section>

      {/* Create Practice moved to More tab */}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className={"inline-block h-2 w-2 rounded-full " + color} />;
}

function RecordStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center">
      <p className={"font-display text-3xl font-bold " + accent}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
    </div>
  );
}

function LeaderboardColumn({ title, rows, statKey }: { title: string; rows: SkaterAgg[]; statKey: "g" | "a" | "pts" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-2">
      <p className="mb-1.5 text-center text-[9px] font-bold tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {rows.map((r, i) => {
          const isFirst = i === 0;
          const lastName = r.display_name.trim().split(/\s+/).pop() ?? r.display_name;
          return (
            <div
              key={r.team_player_id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] ${isFirst ? "bg-teal/10" : ""}`}
            >
              <span className={`w-4 text-center font-bold ${isFirst ? "text-teal" : "text-muted-foreground"}`}>#{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{lastName}</span>
              <span className="shrink-0 font-bold tabular-nums">{r[statKey]}</span>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-2 text-center text-[10px] text-muted-foreground">
            <Trophy size={12} className="mx-auto" />
          </p>
        )}
      </div>
    </div>
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
          <button disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-background disabled:opacity-50">
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
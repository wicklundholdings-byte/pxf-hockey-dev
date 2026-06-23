import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { markAttendance, recordGameStats } from "@/lib/teams.functions";
import { ArrowLeft, CheckCircle2, XCircle, Clock, ClipboardList, Users2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId")({
  component: EventDetail,
});

type Event = { id: string; event_type: string; title: string | null; opponent_name: string | null; venue: string | null; event_date: string; start_time: string | null; notes: string | null };
type Player = { id: string; display_name: string; jersey_number: string | null };
type Rsvp = { team_player_id: string; response: string };
type Att = { team_player_id: string; status: string };

function EventDetail() {
  const { teamId, eventId } = Route.useParams();
  const mark = useServerFn(markAttendance);
  const [event, setEvent] = useState<Event | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  async function load() {
    const [e, p, r, a] = await Promise.all([
      supabase.from("team_events").select("*").eq("id", eventId).maybeSingle(),
      supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId).order("display_name"),
      supabase.from("team_event_rsvps").select("team_player_id,response").eq("event_id", eventId),
      supabase.from("team_event_attendance").select("team_player_id,status").eq("event_id", eventId),
    ]);
    setEvent((e.data as Event) ?? null);
    setPlayers((p.data ?? []) as Player[]);
    const rmap: Record<string, string> = {}; (r.data ?? []).forEach((x: Rsvp) => { rmap[x.team_player_id] = x.response; });
    setRsvps(rmap);
    const amap: Record<string, string> = {}; (a.data ?? []).forEach((x: Att) => { amap[x.team_player_id] = x.status; });
    setAttendance(amap);
  }
  useEffect(() => { load(); }, [eventId, teamId]);

  const counts = { yes: 0, no: 0, maybe: 0, none: 0 };
  for (const p of players) {
    const r = rsvps[p.id]; if (r === "yes") counts.yes++; else if (r === "no") counts.no++; else if (r === "maybe") counts.maybe++; else counts.none++;
  }

  async function set(pid: string, status: "present" | "absent" | "late") {
    setAttendance({ ...attendance, [pid]: status });
    try { await mark({ data: { eventId, teamPlayerId: pid, status } }); } catch (e: any) { alert(e?.message); }
  }

  if (!event) return <p className="text-xs text-muted-foreground">Loading…</p>;

  return (
    <div>
      <Link to="/coach/teams/$teamId/schedule" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>
      <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{event.event_type.toUpperCase().replace("_", " ")}</p>
        <h3 className="mt-1 font-display text-lg font-bold">
          {event.event_type === "game" ? `vs ${event.opponent_name || "TBD"}` : (event.title || "Event")}
        </h3>
        <p className="text-xs text-muted-foreground">{event.event_date}{event.start_time ? ` · ${event.start_time}` : ""}{event.venue ? ` · ${event.venue}` : ""}</p>
        {event.notes && <p className="mt-2 text-xs">{event.notes}</p>}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="YES" value={counts.yes} tone="text-emerald-400" />
        <Stat label="NO" value={counts.no} tone="text-red-400" />
        <Stat label="MAYBE" value={counts.maybe} tone="text-amber-400" />
        <Stat label="NONE" value={counts.none} tone="text-muted-foreground" />
      </div>

      {(event.event_type === "practice" || event.event_type === "game") && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {event.event_type === "practice" && (
            <Link to="/coach/teams/$teamId/schedule/$eventId/practice-plan" params={{ teamId, eventId }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold">
              <ClipboardList size={14} /> Practice plan
            </Link>
          )}
          {event.event_type === "game" && (
            <Link to="/coach/teams/$teamId/schedule/$eventId/lineup" params={{ teamId, eventId }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold">
              <Users2 size={14} /> Lineup
            </Link>
          )}
        </div>
      )}

      <h4 className="mt-4 text-xs font-bold">Attendance</h4>
      <div className="mt-2 space-y-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[11px] font-bold">{p.jersey_number || "—"}</div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{p.display_name}</p>
              <p className="text-[10px] text-muted-foreground">RSVP: {rsvps[p.id] || "—"}</p>
            </div>
            {(["present", "late", "absent"] as const).map((s) => (
              <button key={s} onClick={() => set(p.id, s)} className={"rounded-full p-1.5 " + (attendance[p.id] === s ? "bg-teal text-background" : "bg-surface-2 text-muted-foreground")} aria-label={s}>
                {s === "present" && <CheckCircle2 size={14} />}
                {s === "late" && <Clock size={14} />}
                {s === "absent" && <XCircle size={14} />}
              </button>
            ))}
          </div>
        ))}
      </div>

      {event.event_type === "game" && <GameStats teamId={teamId} players={players} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2">
      <p className={"font-display text-lg font-bold " + tone}>{value}</p>
      <p className="text-[9px] font-bold tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function GameStats({ teamId, players }: { teamId: string; players: Player[] }) {
  const save = useServerFn(recordGameStats);
  const [stats, setStats] = useState<Record<string, { g: string; a: string; pim: string }>>({});
  function upd(pid: string, k: "g" | "a" | "pim", v: string) {
    setStats({ ...stats, [pid]: { ...(stats[pid] || { g: "", a: "", pim: "" }), [k]: v } });
  }
  async function commit(pid: string) {
    const s = stats[pid]; if (!s) return;
    try {
      await save({ data: { teamId, teamPlayerId: pid, goals: +s.g || 0, assists: +s.a || 0, penaltyMinutes: +s.pim || 0, gamesPlayed: 1 } });
    } catch (e: any) { alert(e?.message); }
  }
  return (
    <>
      <h4 className="mt-4 text-xs font-bold">Post-game stats</h4>
      <div className="mt-2 space-y-1.5">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-1 rounded-xl border border-border bg-surface p-2">
            <span className="flex-1 truncate text-xs font-semibold">{p.display_name}</span>
            {(["g", "a", "pim"] as const).map((k) => (
              <input key={k} type="number" min="0" placeholder={k.toUpperCase()} value={stats[p.id]?.[k] || ""} onChange={(e) => upd(p.id, k, e.target.value)} className="w-12 rounded-lg bg-background px-1.5 py-1 text-center text-xs" />
            ))}
            <button onClick={() => commit(p.id)} className="rounded-lg bg-teal px-2 py-1 text-[10px] font-bold text-background">Save</button>
          </div>
        ))}
      </div>
    </>
  );
}
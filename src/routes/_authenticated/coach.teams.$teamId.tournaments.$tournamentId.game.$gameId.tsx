import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Clock, ClipboardList, Trophy, BarChart3 } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/coach/teams/$teamId/tournaments/$tournamentId/game/$gameId",
)({
  component: TournamentGameDetail,
});

// Mock tournament metadata mirrors the parent tournament file.
const TOURNAMENTS: Record<string, { name: string }> = {
  "spring-classic": { name: "BC Minor AAA Spring Classic" },
  "winter-invitational": { name: "Lower Mainland Winter Invitational" },
};

type MockEvent = {
  id: string;
  event_type: "game";
  title: string | null;
  opponent_name: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
  notes: string | null;
};

const GAMES: Record<string, MockEvent> = {
  g1: {
    id: "g1", event_type: "game", title: null, opponent_name: "Burnaby Winter Club",
    venue: "Rink 1 · Langley Events Centre", event_date: "Jul 18, 2026", start_time: "9:00 AM",
    notes: "Round Robin · Result 3–1 WIN",
  },
  g2: {
    id: "g2", event_type: "game", title: null, opponent_name: "Coquitlam Express",
    venue: "Rink 3 · Langley Events Centre", event_date: "Jul 19, 2026", start_time: "2:00 PM",
    notes: "Round Robin",
  },
  g3: {
    id: "g3", event_type: "game", title: null, opponent_name: "North Delta Lightning",
    venue: "Rink 2 · Langley Events Centre", event_date: "Jul 20, 2026", start_time: "11:00 AM",
    notes: "Round Robin",
  },
  sk1: {
    id: "sk1", event_type: "game", title: "Optional Skate", opponent_name: null,
    venue: "Rink 3 · Langley Events Centre", event_date: "Jul 18, 2026", start_time: "5:30 PM",
    notes: null,
  },
  po2: {
    id: "po2", event_type: "game", title: "Playoff Games (if advancing)", opponent_name: null,
    venue: "Langley Events Centre", event_date: "Jul 21, 2026", start_time: "TBD",
    notes: null,
  },
};

type Player = { id: string; display_name: string; jersey_number: string | null };
const PLAYERS: Player[] = [
  { id: "p1", display_name: "Jake Andersson", jersey_number: "9" },
  { id: "p2", display_name: "Liam Carter", jersey_number: "14" },
  { id: "p3", display_name: "Owen Brooks", jersey_number: "21" },
  { id: "p4", display_name: "Ethan Park", jersey_number: "7" },
  { id: "p5", display_name: "Noah Jensen", jersey_number: "17" },
  { id: "p6", display_name: "Marco Vella", jersey_number: "11" },
];

const RSVP_SEED: Record<string, "yes" | "no" | "maybe"> = {
  p1: "yes", p2: "yes", p3: "yes", p4: "maybe", p5: "yes", p6: "no",
};

function TournamentGameDetail() {
  const { teamId, tournamentId, gameId } = Route.useParams();
  const navigate = useNavigate();
  const tournament = TOURNAMENTS[tournamentId] ?? { name: "Tournament" };
  const event = GAMES[gameId] ?? GAMES.g1;
  const players = PLAYERS;
  const rsvps = RSVP_SEED;
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "late">>({});

  const counts = { yes: 0, no: 0, maybe: 0, none: 0 };
  for (const p of players) {
    const r = rsvps[p.id];
    if (r === "yes") counts.yes++;
    else if (r === "no") counts.no++;
    else if (r === "maybe") counts.maybe++;
    else counts.none++;
  }

  function set(pid: string, status: "present" | "absent" | "late") {
    setAttendance({ ...attendance, [pid]: status });
  }

  return (
    <div>
      <Link
        to="/coach/teams/$teamId/tournaments/$tournamentId"
        params={{ teamId, tournamentId }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft size={14} /> Schedule
      </Link>
      <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
          {event.event_type.toUpperCase()}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold">
          {event.opponent_name ? `vs ${event.opponent_name}` : (event.title || "Event")}
        </h3>
        <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{tournament.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {event.event_date}{event.start_time ? ` · ${event.start_time}` : ""}{event.venue ? ` · ${event.venue}` : ""}
        </p>
        {event.notes && <p className="mt-2 text-xs">{event.notes}</p>}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="YES" value={counts.yes} tone="text-emerald-400" />
        <Stat label="NO" value={counts.no} tone="text-red-400" />
        <Stat label="MAYBE" value={counts.maybe} tone="text-amber-400" />
        <Stat label="NONE" value={counts.none} tone="text-muted-foreground" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() =>
            navigate({
              to: "/coach/teams/$teamId/schedule/$eventId/game-prep",
              params: { teamId, eventId: gameId },
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow-teal active:opacity-90"
        >
          <Trophy size={14} /> Game Prep
        </button>
        <button
          onClick={() =>
            navigate({
              to: "/coach/teams/$teamId/stats",
              params: { teamId },
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal/40 bg-teal/10 px-3 py-2 text-xs font-bold text-teal active:opacity-90"
        >
          <BarChart3 size={14} /> Stats
        </button>
      </div>

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
              <button
                key={s}
                onClick={() => set(p.id, s)}
                className={"rounded-full p-1.5 " + (attendance[p.id] === s ? "bg-teal text-background" : "bg-surface-2 text-muted-foreground")}
                aria-label={s}
              >
                {s === "present" && <CheckCircle2 size={14} />}
                {s === "late" && <Clock size={14} />}
                {s === "absent" && <XCircle size={14} />}
              </button>
            ))}
          </div>
        ))}
      </div>

      <GameStats players={players} />

      <h4 className="mt-4 text-xs font-bold">Media</h4>
      <div className="mt-2 rounded-xl border border-border bg-surface p-3 text-[11px] text-muted-foreground">
        <p className="flex items-center gap-2"><ClipboardList size={12} /> No media uploaded yet.</p>
      </div>
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

function GameStats({ players }: { players: Player[] }) {
  const [stats, setStats] = useState<Record<string, { g: string; a: string; pim: string }>>({});
  function upd(pid: string, k: "g" | "a" | "pim", v: string) {
    setStats({ ...stats, [pid]: { ...(stats[pid] || { g: "", a: "", pim: "" }), [k]: v } });
  }
  return (
    <>
      <h4 className="mt-4 text-xs font-bold">Post-game stats</h4>
      <div className="mt-2 space-y-1.5">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-1 rounded-xl border border-border bg-surface p-2">
            <span className="flex-1 truncate text-xs font-semibold">{p.display_name}</span>
            {(["g", "a", "pim"] as const).map((k) => (
              <input
                key={k}
                type="number"
                min="0"
                placeholder={k.toUpperCase()}
                value={stats[p.id]?.[k] || ""}
                onChange={(e) => upd(p.id, k, e.target.value)}
                className="w-12 rounded-lg bg-background px-1.5 py-1 text-center text-xs"
              />
            ))}
            <button className="rounded-lg bg-teal px-2 py-1 text-[10px] font-bold text-background">Save</button>
          </div>
        ))}
      </div>
    </>
  );
}
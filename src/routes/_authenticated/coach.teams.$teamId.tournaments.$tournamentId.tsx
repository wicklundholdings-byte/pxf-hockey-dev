import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, Hotel, Bus, ClipboardList,
  Paperclip, MapPin, Phone, Link2, ChevronUp, Pencil, Trash2, GripVertical,
  Calendar as CalendarIcon, X, AlertTriangle, BellRing, Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/tournaments/$tournamentId")({
  component: TournamentDetail,
});

const DATA: Record<string, { name: string; dates: string; city: string; status: string; readonly?: boolean }> = {
  "spring-classic": { name: "BC Minor AAA Spring Classic", dates: "Jul 18–21", city: "Langley, BC", status: "IN PROGRESS" },
  "winter-invitational": { name: "Lower Mainland Winter Invitational", dates: "Feb 14–16", city: "Burnaby, BC", status: "UPCOMING", readonly: true },
};

const TABS = ["Overview", "Games", "Roster", "Travel", "Payments"] as const;
type Tab = (typeof TABS)[number];

function TournamentDetail() {
  const { teamId, tournamentId } = Route.useParams();
  const t = DATA[tournamentId] ?? { name: "Tournament", dates: "", city: "", status: "" };
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-2 pt-3 backdrop-blur">
        <Link
          to="/coach/teams/$teamId/tournaments"
          params={{ teamId } as any}
          className="inline-flex items-center gap-1 text-xs font-bold text-teal"
        >
          <ChevronLeft size={14} /> Tournaments
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold leading-tight">{t.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t.dates} · {t.city}</p>
          </div>
          {t.status && (
            <span className="shrink-0 rounded-full bg-teal/20 px-2 py-1 text-[10px] font-bold text-teal">{t.status}</span>
          )}
        </div>

        <div className="mt-3 -mx-1 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
          {TABS.map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={
                "shrink-0 border-b-2 px-3 py-2 text-xs font-bold transition-colors " +
                (tab === x ? "border-teal text-teal" : "border-transparent text-muted-foreground")
              }
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4">
        {tab === "Overview" && <OverviewTab onJumpStandings={() => setTab("Games")} />}
        {tab === "Games" && <GamesTab readonly={t.readonly} />}
        {tab === "Roster" && <RosterTab />}
        {tab === "Travel" && <TravelTab />}
        {tab === "Payments" && <PaymentsTab />}
      </div>
    </div>
  );
}

/* =================== OVERVIEW =================== */

function OverviewTab({ onJumpStandings }: { onJumpStandings: () => void }) {
  const [calOpen, setCalOpen] = useState(false);
  const [outOfSync, setOutOfSync] = useState(true);
  return (
    <div className="space-y-4">
      {outOfSync && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-amber-300">Schedule updated since you last synced</p>
              <button onClick={() => { setCalOpen(true); setOutOfSync(false); }} className="mt-1 text-[11px] font-bold text-teal">Re-sync Calendar</button>
            </div>
          </div>
          <button onClick={() => setOutOfSync(false)} className="text-amber-300/70"><X size={14} /></button>
        </div>
      )}
      {/* Next Game */}
      <div className="rounded-2xl border border-teal/40 bg-teal/10 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Next Game</p>
        <p className="mt-1 text-base font-bold">vs. Coquitlam Express</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Jul 19 · 2:00 PM · Rink 3 · Langley Events Centre</p>
        <p className="mt-2 text-[11px] font-bold text-teal">Tomorrow · 18 hours away</p>
        <button className="mt-3 w-full rounded-full border border-teal py-2 text-xs font-bold text-teal">View Game</button>
      </div>

      {/* Record */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tournament Record</p>
        <div className="mt-2 flex items-end gap-4">
          <Stat label="W" value="1" tone="teal" />
          <Stat label="L" value="0" />
          <Stat label="OT" value="0" />
        </div>
      </div>

      {/* Pool standing */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">2nd in Pool A · 2 points</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {[
            { rank: 1, team: "Burnaby Winter Club", pts: 2 },
            { rank: 2, team: "Elite Demo Team", pts: 2, me: true },
            { rank: 3, team: "Coquitlam Express", pts: 0 },
          ].map((r) => (
            <div key={r.team} className={"flex items-center justify-between rounded-lg px-2 py-1.5 text-xs " + (r.me ? "bg-teal/15 font-bold text-teal" : "")}>
              <span>{r.rank}. {r.team}</span>
              <span>{r.pts} PTS</span>
            </div>
          ))}
        </div>
        <button onClick={onJumpStandings} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal">
          View full standings <ChevronRight size={12} />
        </button>
      </div>

      {/* Quick info grid */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard label="Arena" value="Langley Events Centre" />
        <InfoCard label="Format" value="Round Robin + Playoffs" />
        <InfoCard label="Hotel" value="Sandman Hotel Langley" />
        <InfoCard label="Bus" value="Departs 6:30 AM Jul 18" />
      </div>

      <button className="flex w-full items-center justify-center gap-2 rounded-full border border-teal py-2.5 text-xs font-bold text-teal">
        <Link2 size={14} /> Tournament Website
      </button>

      <button onClick={() => setCalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-background shadow-glow-teal active:opacity-90">
        <CalendarIcon size={14} /> Add to Calendar
      </button>

      {calOpen && <CalendarExportSheet onClose={() => setCalOpen(false)} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "teal" }) {
  return (
    <div>
      <p className={"text-2xl font-bold " + (tone === "teal" ? "text-teal" : "")}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}

/* =================== GAMES =================== */

type Game = {
  opp: string; date: string; time: string; rink: string;
  played?: boolean; us?: number; them?: number; result?: "WIN" | "LOSS" | "OT";
  jersey: "Home (Dark)" | "Away (White)";
  past?: boolean;
};

function GamesTab({ readonly: _readonly }: { readonly?: boolean }) {
  const [filter, setFilter] = useState<"Pool" | "Playoffs" | "All">("Pool");
  const pool: Game[] = [
    { opp: "Burnaby Winter Club", date: "Jul 18", time: "9:00 AM", rink: "Rink 1", played: true, us: 3, them: 1, result: "WIN", jersey: "Home (Dark)" },
    { opp: "Coquitlam Express", date: "Jul 19", time: "2:00 PM", rink: "Rink 3", jersey: "Away (White)" },
    { opp: "North Delta Lightning", date: "Jul 20", time: "11:00 AM", rink: "Rink 2", jersey: "Home (Dark)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["Pool", "Playoffs", "All"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3 py-1.5 text-[11px] font-bold " +
              (filter === f ? "bg-teal text-background" : "border border-border text-muted-foreground")
            }
          >
            {f === "Pool" ? "Pool Games" : f}
          </button>
        ))}
      </div>

      {(filter === "Pool" || filter === "All") && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pool Games</p>
          {pool.map((g, i) => <GameCard key={i} g={g} />)}
        </div>
      )}

      {(filter === "Playoffs" || filter === "All") && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Playoffs</p>
          <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            Playoff bracket TBD — advances after pool play
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pool Standings</p>
        <StandingsTable />
      </div>
    </div>
  );
}

function GameCard({ g }: { g: Game }) {
  const jerseyDot = g.jersey.startsWith("Home") ? "bg-teal" : "bg-zinc-300";
  const resultColor =
    g.result === "WIN" ? "bg-teal/20 text-teal" :
    g.result === "LOSS" ? "bg-red-500/20 text-red-400" :
    g.result === "OT" ? "bg-amber-500/20 text-amber-400" : "";

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">vs. {g.opp}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{g.date} · {g.time} · {g.rink}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={"h-2 w-2 rounded-full " + jerseyDot} /> {g.jersey}
          </p>
        </div>
        <div className="text-right">
          {g.played ? (
            <>
              <p className="text-base font-bold">{g.us}–{g.them}</p>
              <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + resultColor}>{g.result}</span>
            </>
          ) : g.past ? (
            <button className="rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-400">
              Enter Score
            </button>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground">Upcoming</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StandingsTable() {
  const rows = [
    { team: "Burnaby Winter Club", gp: 1, w: 1, l: 0, ot: 0, pts: 2, gf: 3, ga: 1 },
    { team: "Elite Demo Team", gp: 1, w: 1, l: 0, ot: 0, pts: 2, gf: 3, ga: 1, me: true },
    { team: "Coquitlam Express", gp: 0, w: 0, l: 0, ot: 0, pts: 0, gf: 0, ga: 0 },
    { team: "North Delta Lightning", gp: 0, w: 0, l: 0, ot: 0, pts: 0, gf: 0, ga: 0 },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2">Team</th>
            <th className="px-1 py-2">GP</th><th className="px-1 py-2">W</th><th className="px-1 py-2">L</th>
            <th className="px-1 py-2">OT</th><th className="px-1 py-2">PTS</th>
            <th className="px-1 py-2">GF</th><th className="px-1 py-2">GA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className={r.me ? "bg-teal/15 font-bold text-teal" : "border-t border-border"}>
              <td className="px-2 py-2">{r.team}</td>
              <td className="px-1 py-2">{r.gp}</td><td className="px-1 py-2">{r.w}</td><td className="px-1 py-2">{r.l}</td>
              <td className="px-1 py-2">{r.ot}</td><td className="px-1 py-2">{r.pts}</td>
              <td className="px-1 py-2">{r.gf}</td><td className="px-1 py-2">{r.ga}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =================== ROSTER =================== */

function RosterTab() {
  const attending = [
    { num: 9, name: "Jake Andersson", pos: "C", status: "CONFIRMED" as const },
    { num: 14, name: "Liam Carter", pos: "LW", status: "CONFIRMED" as const },
    { num: 22, name: "Owen Brooks", pos: "D", status: "PENDING" as const },
    { num: 31, name: "Ethan Park", pos: "G", status: "CONFIRMED" as const },
    { num: 7, name: "Noah Jensen", pos: "RW", status: "OUT" as const },
  ];
  const guests = [
    { num: 17, name: "Marco Vella", pos: "C", status: "CONFIRMED" as const },
  ];
  const staff = [
    { name: "Coach Mike Petersen", role: "Head Coach" },
    { name: "Coach Dave Chu", role: "Assistant" },
    { name: "Sarah Lin", role: "Manager" },
  ];

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Players Attending · {attending.length}
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {attending.map((p, i) => <PlayerRow key={p.num} p={p} divider={i > 0} />)}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Guest Players</p>
          <button className="inline-flex items-center gap-1 text-xs font-bold text-teal"><Plus size={12} /> Add Guest Player</button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {guests.map((p, i) => <PlayerRow key={p.num} p={p} divider={i > 0} guest />)}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Staff</p>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {staff.map((s, i) => (
            <div key={s.name} className={"flex items-center justify-between px-3 py-2.5 " + (i > 0 ? "border-t border-border" : "")}>
              <span className="text-sm">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">{s.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Jersey Colors</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <span className="h-4 w-4 rounded-full bg-teal" />
            <div className="flex-1">
              <p className="text-sm font-bold">Home jersey: Dark</p>
              <p className="text-[11px] text-muted-foreground">Set per game in Games tab</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <span className="h-4 w-4 rounded-full bg-zinc-300" />
            <div className="flex-1">
              <p className="text-sm font-bold">Away jersey: White</p>
              <p className="text-[11px] text-muted-foreground">Set per game in Games tab</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlayerRow({
  p, divider, guest,
}: { p: { num: number; name: string; pos: string; status: "CONFIRMED" | "PENDING" | "OUT" }; divider?: boolean; guest?: boolean }) {
  const statusCls =
    p.status === "CONFIRMED" ? "bg-teal/20 text-teal" :
    p.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
    "bg-red-500/20 text-red-400";
  return (
    <div className={"flex items-center gap-3 px-3 py-2.5 " + (divider ? "border-t border-border" : "")}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-teal/15 text-[12px] font-bold text-teal">{p.num}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{p.name}</p>
        <p className="text-[10px] text-muted-foreground">{p.pos}</p>
      </div>
      {guest && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">GUEST</span>}
      <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + statusCls}>{p.status}</span>
    </div>
  );
}

/* =================== TRAVEL =================== */

type ItineraryItem = { time: string; icon: string; text: string };
const ITINERARY: { day: string; items: ItineraryItem[] }[] = [
  { day: "JUL 18 — FRIDAY", items: [
    { time: "6:30 AM", icon: "🚌", text: "Bus departs Surrey Sport & Leisure" },
    { time: "9:00 AM", icon: "🏒", text: "GAME 1 vs. Burnaby Winter Club · Rink 1" },
    { time: "12:00 PM", icon: "🍽", text: "Team lunch · Boston Pizza Langley" },
    { time: "2:00 PM", icon: "🏨", text: "Hotel check-in · Sandman Hotel Langley" },
    { time: "5:30 PM", icon: "🏒", text: "Optional team skate · Rink 3" },
    { time: "7:00 PM", icon: "🍽", text: "Team dinner · Cactus Club · families welcome" },
    { time: "10:00 PM", icon: "🔒", text: "Curfew — players in rooms" },
  ]},
  { day: "JUL 19 — SATURDAY", items: [
    { time: "8:00 AM", icon: "🍽", text: "Team breakfast · hotel lobby" },
    { time: "9:30 AM", icon: "🚌", text: "Bus to rink" },
    { time: "2:00 PM", icon: "🏒", text: "GAME 2 vs. Coquitlam Express · Rink 3" },
    { time: "5:00 PM", icon: "🎳", text: "Team activity · Langley Bowl & Entertainment" },
    { time: "8:00 PM", icon: "🍽", text: "Team dinner · The Keg" },
    { time: "10:00 PM", icon: "🔒", text: "Curfew" },
  ]},
  { day: "JUL 20 — SUNDAY", items: [
    { time: "8:30 AM", icon: "🍽", text: "Team breakfast" },
    { time: "11:00 AM", icon: "🏒", text: "GAME 3 vs. North Delta Lightning · Rink 2" },
    { time: "2:30 PM", icon: "·", text: "TBD based on standings · Playoff or free time" },
    { time: "6:00 PM", icon: "🍽", text: "Team dinner · TBD" },
  ]},
  { day: "JUL 21 — MONDAY", items: [
    { time: "TBD", icon: "🏒", text: "Playoff games or departure" },
    { time: "6:00 PM", icon: "🚌", text: "Bus departs for home" },
  ]},
];

function TravelTab() {
  const today = "JUL 18 — FRIDAY";
  const [openDay, setOpenDay] = useState<Record<string, boolean>>({ [today]: true });
  const [assignRooms, setAssignRooms] = useState(true);
  const [equipOpen, setEquipOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Hotel */}
      <section>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Hotel size={12} /> Hotel
        </p>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-bold">Sandman Hotel Langley</p>
          <p className="mt-1 text-xs text-muted-foreground">8765 202 St, Langley, BC</p>
          <p className="mt-1 text-xs text-muted-foreground">Check-in: Jul 17 · Check-out: Jul 21</p>
          <div className="mt-3 flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-full border border-teal px-3 py-1.5 text-[11px] font-bold text-teal">
              <MapPin size={12} /> Get Directions
            </button>
            <button className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-foreground">
              <Phone size={12} /> Call Hotel
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          <label className="flex items-center justify-between">
            <span className="text-sm font-semibold">Assign rooms</span>
            <button
              onClick={() => setAssignRooms((v) => !v)}
              className={"relative h-5 w-9 rounded-full transition-colors " + (assignRooms ? "bg-teal" : "bg-surface-2")}
              aria-pressed={assignRooms}
            >
              <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all " + (assignRooms ? "left-4" : "left-0.5")} />
            </button>
          </label>
          {assignRooms ? (
            <ul className="mt-3 space-y-1.5 text-xs">
              <li><span className="font-bold">Room 201:</span> Carter, Brooks</li>
              <li><span className="font-bold">Room 203:</span> Jensen, Petrov, Callahan</li>
              <li><span className="font-bold">Room 205:</span> Coaching Staff</li>
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Room assignments not set — coordinate with your team directly
            </p>
          )}
        </div>
      </section>

      {/* Transportation */}
      <section>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Bus size={12} /> Transportation
        </p>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-bold">🚌 Team Bus</p>
          <p className="mt-2 text-xs"><span className="text-muted-foreground">Departure:</span> Surrey Sport & Leisure parking lot · 6:30 AM · Jul 18</p>
          <p className="mt-1 text-xs"><span className="text-muted-foreground">Return:</span> Departs Langley Events Centre · 6:00 PM · Jul 21</p>
          <p className="mt-2 text-[11px] font-semibold text-teal">Seats: 14 players + 2 staff confirmed</p>
        </div>
      </section>

      {/* Itinerary */}
      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day-by-day Itinerary</p>
        <div className="space-y-2">
          {ITINERARY.map((d) => {
            const open = openDay[d.day] ?? false;
            return (
              <div key={d.day} className="overflow-hidden rounded-xl border border-border bg-surface">
                <button
                  onClick={() => setOpenDay((s) => ({ ...s, [d.day]: !open }))}
                  className="flex w-full items-center justify-between px-3 py-3 text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{d.day}</span>
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {open && (
                  <div className="space-y-2 border-t border-border px-3 py-3">
                    {d.items.map((it, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-16 shrink-0 text-[11px] font-semibold text-muted-foreground">{it.time}</span>
                        <span className="text-base leading-none">{it.icon}</span>
                        <span className="flex-1 text-xs leading-snug">{it.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Equipment checklist */}
      <section>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <button
            onClick={() => setEquipOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <ClipboardList size={14} className="text-teal" /> Equipment Checklist
            </span>
            {equipOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {equipOpen && <EquipmentChecklist />}
        </div>
      </section>

      {/* Notes */}
      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tournament Notes</p>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs leading-relaxed text-foreground">
            White jerseys for game 2. Dress sharp for team dinner Friday — no hoodies. Bring your own tape.
          </p>
          <button className="mt-3 text-[11px] font-bold text-teal">Edit notes</button>
        </div>
      </section>

      {/* Attachments */}
      <section className="space-y-2">
        <button className="flex w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-3 text-xs font-bold text-foreground">
          <Paperclip size={14} className="text-teal" /> Tournament Package
        </button>
        <button className="flex w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-3 text-xs font-bold text-foreground">
          <Paperclip size={14} className="text-teal" /> Rules & Regulations
        </button>
      </section>
    </div>
  );
}

function EquipmentChecklist() {
  const initial = [
    "Home jersey (dark)", "Away jersey (white)", "Helmet + cage", "Gloves",
    "Skates", "Stick(s)", "Hockey bag", "Water bottle", "Mouth guard",
    "Shin / elbow pads", "Cup",
  ];
  const [items, setItems] = useState(initial.map((label) => ({ label, done: false })));
  const [adding, setAdding] = useState("");

  return (
    <div className="border-t border-border px-3 py-3">
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i}>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={it.done}
                onChange={() => setItems((arr) => arr.map((x, j) => j === i ? { ...x, done: !x.done } : x))}
                className="h-4 w-4 rounded border-border accent-teal"
              />
              <span className={it.done ? "text-muted-foreground line-through" : ""}>{it.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding.trim()) return;
          setItems((arr) => [...arr, { label: adding.trim(), done: false }]);
          setAdding("");
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Add custom item…"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs"
        />
        <button className="rounded-lg bg-teal px-3 py-1.5 text-[11px] font-bold text-background">Add</button>
      </form>
    </div>
  );
}

/* =================== PAYMENTS =================== */

function PaymentsTab() {
  const players = [
    { name: "Jake Andersson", paid: true },
    { name: "Liam Carter", paid: false },
    { name: "Owen Brooks", paid: true },
    { name: "Ethan Park", paid: false },
    { name: "Noah Jensen", paid: true },
    { name: "Marco Vella", paid: false },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost Breakdown</p>
        <ul className="mt-3 space-y-1.5 text-xs">
          <li className="flex justify-between"><span>Tournament entry fee</span><span className="font-semibold">$1,200</span></li>
          <li className="flex justify-between"><span>Team bus (round trip)</span><span className="font-semibold">$400</span></li>
          <li className="flex justify-between"><span>Team meals (3 dinners)</span><span className="font-semibold">$600</span></li>
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm font-bold">
          <span>Total</span><span>$2,200</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Per player (14 players): $157.14</p>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Status</p>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {players.map((p, i) => (
            <div key={p.name} className={"flex items-center justify-between gap-3 px-3 py-2.5 " + (i > 0 ? "border-t border-border" : "")}>
              <div className="flex flex-1 items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-[10px] font-bold">
                  {p.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">$157.14</p>
                </div>
              </div>
              {p.paid ? (
                <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal">PAID</span>
              ) : (
                <>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">PENDING</span>
                  <button className="rounded-full border border-teal px-2.5 py-1 text-[10px] font-bold text-teal">Remind</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expense Tracker</p>
          <button className="inline-flex items-center gap-1 text-[11px] font-bold text-teal"><Plus size={12} /> Log Expense</button>
        </div>
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Logged to date</span><span className="font-semibold">$2,050</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-semibold">$2,200</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-teal" style={{ width: "93%" }} />
          </div>
        </div>
      </div>

      <button className="flex w-full items-center justify-center rounded-full bg-gradient-brand py-3 text-sm font-bold text-background shadow-glow-teal active:opacity-90">
        Send Reminders to All Unpaid
      </button>
    </div>
  );
}

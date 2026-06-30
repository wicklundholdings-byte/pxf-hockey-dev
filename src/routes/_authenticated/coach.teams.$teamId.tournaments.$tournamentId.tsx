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

type ItemType = "Game" | "Transport" | "Hotel" | "Meal" | "Activity" | "Curfew" | "Other";
const TYPE_ICON: Record<ItemType, string> = {
  Game: "🏒", Transport: "🚌", Hotel: "🏨", Meal: "🍽", Activity: "🎳", Curfew: "🔒", Other: "📋",
};
const RSVP_DEFAULTS: Record<ItemType, boolean> = {
  Transport: true, Meal: true, Activity: true, Hotel: true, Curfew: false, Game: false, Other: false,
};
function defaultOptions(type: ItemType): [string, string, string] {
  if (type === "Transport") return ["Taking bus", "Driving myself", "Not sure"];
  if (type === "Hotel") return ["Team hotel", "Own arrangements", "Not sure"];
  return ["Going", "Not going", "Not sure"];
}

type RsvpStatus = "yes" | "no" | "maybe" | "none";
type ItineraryItem = {
  id: string;
  type: ItemType;
  title: string;
  time: string;
  location: string;
  notes?: string;
  rsvp: boolean;
  options: [string, string, string];
  responses: Record<string, RsvpStatus>;
  busCapacity?: number;
};

const ROSTER = [
  "Carter", "Brooks", "Jensen", "Petrov", "Callahan", "Reilly",
  "MacDonald", "Nguyen", "Eriksson", "Yamamoto", "Thompson", "Marchetti",
  "Kowalski", "O'Sullivan",
];

const SEED: { day: string; items: ItineraryItem[] }[] = [
  { day: "JUL 18 — FRIDAY", items: [
    mkItem("bus1", "Transport", "Bus departs Surrey Sport & Leisure", "6:30 AM", "Surrey Sport & Leisure", { busCapacity: 14, mix: { yes: 9, no: 2, maybe: 1 } }),
    mkItem("g1", "Game", "GAME 1 vs. Burnaby Winter Club", "9:00 AM", "Rink 1 · Langley Events Centre"),
    mkItem("l1", "Meal", "Team lunch", "12:00 PM", "Boston Pizza Langley", { mix: { yes: 10, no: 1, maybe: 1 } }),
    mkItem("h1", "Hotel", "Hotel check-in", "2:00 PM", "Sandman Hotel Langley · 8765 202 St", { mix: { yes: 10, no: 2 } }),
    mkItem("c1", "Curfew", "Curfew — players in rooms", "10:00 PM", "Hotel"),
  ]},
  { day: "JUL 19 — SATURDAY", items: [
    mkItem("br2", "Meal", "Team breakfast", "8:00 AM", "Hotel lobby", { mix: { yes: 11, no: 0, maybe: 1 } }),
    mkItem("g2", "Game", "GAME 2 vs. Coquitlam Express", "2:00 PM", "Rink 3 · Langley Events Centre"),
    mkItem("a2", "Activity", "Team bowling", "5:00 PM", "Langley Bowl & Entertainment", { mix: { yes: 8, no: 2, maybe: 2 } }),
    mkItem("c2", "Curfew", "Curfew", "10:00 PM", "Hotel"),
  ]},
];

function mkItem(
  id: string, type: ItemType, title: string, time: string, location: string,
  extra?: { busCapacity?: number; mix?: { yes: number; no: number; maybe?: number } }
): ItineraryItem {
  const options = defaultOptions(type);
  const responses: Record<string, RsvpStatus> = {};
  if (extra?.mix) {
    let i = 0;
    for (let n = 0; n < extra.mix.yes; n++) responses[ROSTER[i++]] = "yes";
    for (let n = 0; n < extra.mix.no; n++) responses[ROSTER[i++]] = "no";
    for (let n = 0; n < (extra.mix.maybe ?? 0); n++) responses[ROSTER[i++]] = "maybe";
  }
  return {
    id, type, title, time, location,
    rsvp: RSVP_DEFAULTS[type], options, responses,
    busCapacity: extra?.busCapacity,
  };
}

function TravelTab() {
  const [days, setDays] = useState(SEED);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<{ dayIdx: number; itemIdx: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function updateItem(dayIdx: number, itemIdx: number, patch: Partial<ItineraryItem>) {
    setDays((d) => d.map((day, di) => di !== dayIdx ? day : {
      ...day, items: day.items.map((it, ii) => ii !== itemIdx ? it : { ...it, ...patch }),
    }));
    setDirty(true);
  }
  function deleteItem(dayIdx: number, itemIdx: number) {
    setDays((d) => d.map((day, di) => di !== dayIdx ? day : {
      ...day, items: day.items.filter((_, ii) => ii !== itemIdx),
    }));
    setDirty(true);
  }
  function addItem(dayIdx: number, atIdx?: number) {
    const newItem = mkItem(`new-${Date.now()}`, "Other", "New item", "12:00 PM", "");
    setDays((d) => d.map((day, di) => {
      if (di !== dayIdx) return day;
      const next = [...day.items];
      next.splice(atIdx ?? next.length, 0, newItem);
      return { ...day, items: next };
    }));
    setDirty(true);
  }

  return (
    <div className="space-y-4">
      {dirty && (
        <div className="sticky top-[140px] z-10 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 backdrop-blur">
          <p className="text-[11px] font-bold text-amber-300">Draft — changes not yet sent to team</p>
          <div className="flex gap-2">
            <button onClick={() => { setDays(SEED); setDirty(false); }} className="rounded-full border border-border px-3 py-1 text-[10px] font-bold">Discard</button>
            <button onClick={() => setConfirmOpen(true)} className="rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-bold text-background shadow-glow-teal">Notify Team →</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day-by-day Itinerary</p>
        <button
          onClick={() => setEditMode((v) => !v)}
          className={"rounded-full border px-3 py-1.5 text-[11px] font-bold " + (editMode ? "border-teal bg-teal text-background" : "border-teal text-teal")}
        >
          {editMode ? "Done" : <><Pencil size={12} className="mr-1 inline" /> Edit Itinerary</>}
        </button>
      </div>

      <div className="space-y-4">
        {days.map((d, dayIdx) => (
          <DaySection
            key={d.day}
            day={d}
            editMode={editMode}
            onEditItem={(itemIdx) => setEditing({ dayIdx, itemIdx })}
            onDeleteItem={(itemIdx) => deleteItem(dayIdx, itemIdx)}
            onAddItem={(atIdx) => addItem(dayIdx, atIdx)}
            onRsvp={(itemIdx, key, status) =>
              updateItem(dayIdx, itemIdx, {
                responses: { ...d.items[itemIdx].responses, [key]: status },
              })
            }
          />
        ))}
      </div>

      {editing && (
        <EditItemModal
          item={days[editing.dayIdx].items[editing.itemIdx]}
          dayLabels={days.map((x) => x.day)}
          currentDay={editing.dayIdx}
          onClose={() => setEditing(null)}
          onSave={(patch, moveToDay) => {
            const e = editing;
            if (moveToDay !== undefined && moveToDay !== e.dayIdx) {
              const item = { ...days[e.dayIdx].items[e.itemIdx], ...patch };
              setDays((d) => d.map((day, di) => {
                if (di === e.dayIdx) return { ...day, items: day.items.filter((_, ii) => ii !== e.itemIdx) };
                if (di === moveToDay) return { ...day, items: [...day.items, item] };
                return day;
              }));
              setDirty(true);
            } else {
              updateItem(e.dayIdx, e.itemIdx, patch);
            }
            setEditing(null);
          }}
        />
      )}

      {confirmOpen && (
        <NotifyConfirmSheet
          changeCount={3}
          onClose={() => setConfirmOpen(false)}
          onPublish={() => { setDirty(false); setEditMode(false); setConfirmOpen(false); }}
        />
      )}
    </div>
  );
}

function DaySection({
  day, editMode, onEditItem, onDeleteItem, onAddItem, onRsvp,
}: {
  day: { day: string; items: ItineraryItem[] };
  editMode: boolean;
  onEditItem: (i: number) => void;
  onDeleteItem: (i: number) => void;
  onAddItem: (atIdx?: number) => void;
  onRsvp: (itemIdx: number, key: string, status: RsvpStatus) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-3 text-left">
        <span className="text-xs font-bold uppercase tracking-wider">{day.day}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3">
          {day.items.map((it, i) => (
            <div key={it.id}>
              {editMode && i > 0 && (
                <button onClick={() => onAddItem(i)} className="my-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1 text-[10px] font-bold text-muted-foreground">
                  <Plus size={10} /> Add Item
                </button>
              )}
              <ItemRow
                item={it}
                editMode={editMode}
                onEdit={() => onEditItem(i)}
                onDelete={() => onDeleteItem(i)}
                onRsvp={(key, status) => onRsvp(i, key, status)}
              />
            </div>
          ))}
          {editMode && (
            <button onClick={() => onAddItem()} className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-teal/50 py-2 text-[11px] font-bold text-teal">
              <Plus size={12} /> Add Item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item, editMode, onEdit, onDelete, onRsvp,
}: {
  item: ItineraryItem;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRsvp: (key: string, status: RsvpStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const counts = useMemo(() => {
    const c = { yes: 0, no: 0, maybe: 0, none: 0 };
    for (const name of ROSTER) {
      const s = item.responses[name] ?? "none";
      c[s]++;
    }
    return c;
  }, [item.responses]);

  const seatsNeeded = item.type === "Transport" ? counts.yes : 0;
  const overCapacity = item.busCapacity && seatsNeeded > item.busCapacity;

  return (
    <div className="group relative my-1 rounded-lg border border-border bg-surface-2/40">
      <div className="flex items-center gap-2 px-2 py-2">
        {editMode && <GripVertical size={14} className="shrink-0 text-muted-foreground" />}
        <button
          onClick={() => editMode ? onEdit() : item.rsvp && setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="w-14 shrink-0 text-[10px] font-semibold text-muted-foreground">{item.time}</span>
          <span className="text-base leading-none">{TYPE_ICON[item.type]}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{item.title}</p>
            {item.rsvp && !editMode && (
              <p className="mt-0.5 flex gap-2 text-[10px]">
                <span className="text-teal">✓ {counts.yes}</span>
                <span className="text-amber-400">~ {counts.maybe}</span>
                <span className="text-red-400">✗ {counts.no}</span>
                <span className="text-muted-foreground">? {counts.none}</span>
              </p>
            )}
          </div>
        </button>
        {editMode ? (
          <button onClick={() => setShowDelete((v) => !v)} className="rounded p-1 text-muted-foreground">
            <Trash2 size={14} />
          </button>
        ) : item.rsvp ? (
          expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />
        ) : null}
        {showDelete && (
          <button onClick={onDelete} className="rounded-md bg-red-500 px-2 py-1 text-[10px] font-bold text-white">Delete</button>
        )}
      </div>

      {!editMode && expanded && item.rsvp && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {item.location && <p className="text-[11px] text-muted-foreground">📍 {item.location}</p>}
          {item.notes && <p className="text-[11px] text-foreground/80">{item.notes}</p>}

          {item.type === "Transport" && item.busCapacity && (
            <div>
              <p className="text-[11px] font-bold text-teal">🚌 Seats needed: {seatsNeeded} / Bus capacity: {item.busCapacity}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className={"h-full " + (overCapacity ? "bg-amber-400" : "bg-teal")} style={{ width: `${Math.min(100, (seatsNeeded / item.busCapacity) * 100)}%` }} />
              </div>
              {overCapacity && (
                <p className="mt-1 text-[10px] font-bold text-amber-400">⚠ Over capacity — {seatsNeeded - item.busCapacity} unaccounted for</p>
              )}
            </div>
          )}

          {(["yes", "no", "maybe", "none"] as const).map((status) => {
            const list = ROSTER.filter((n) => (item.responses[n] ?? "none") === status);
            if (list.length === 0) return null;
            const label =
              status === "yes" ? item.options[0].toUpperCase() :
              status === "no" ? item.options[1].toUpperCase() :
              status === "maybe" ? item.options[2].toUpperCase() : "NO REPLY";
            return (
              <div key={status}>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label} ({list.length})</p>
                <p className="mt-1 text-[11px] leading-relaxed">{list.join(" · ")}</p>
                {status === "none" && (
                  <button className="mt-1 text-[10px] font-bold text-amber-400">Send Reminder to No Reply →</button>
                )}
              </div>
            );
          })}

          {/* parent-side quick toggle (demo) */}
          <div className="mt-2 rounded-md bg-surface px-2 py-2">
            <p className="text-[10px] font-bold text-muted-foreground">YOUR RSVP (demo)</p>
            <div className="mt-2 flex gap-2">
              {item.options.map((opt, idx) => {
                const status: RsvpStatus = idx === 0 ? "yes" : idx === 1 ? "no" : "maybe";
                const mine = item.responses["__me"] === status;
                return (
                  <button
                    key={opt}
                    onClick={() => onRsvp("__me", status)}
                    className={"rounded-full px-3 py-1 text-[10px] font-bold " + (mine ? "bg-teal text-background" : "border border-border text-foreground")}
                  >
                    {mine && <Check size={10} className="mr-1 inline" />}{opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditItemModal({
  item, dayLabels, currentDay, onClose, onSave,
}: {
  item: ItineraryItem; dayLabels: string[]; currentDay: number;
  onClose: () => void;
  onSave: (patch: Partial<ItineraryItem>, moveToDay?: number) => void;
}) {
  const [form, setForm] = useState(item);
  const [moveTo, setMoveTo] = useState(currentDay);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Edit item</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="mt-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(Object.keys(TYPE_ICON) as ItemType[]).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t, rsvp: RSVP_DEFAULTS[t], options: defaultOptions(t) })}
                className={"rounded-full px-2.5 py-1 text-[10px] font-bold " + (form.type === t ? "bg-teal text-background" : "border border-border")}
              >
                {TYPE_ICON[t]} {t}
              </button>
            ))}
          </div>
        </div>

        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Time">
            <input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs" />
          </Field>
          {form.type === "Transport" && (
            <Field label="Bus capacity">
              <input type="number" value={form.busCapacity ?? ""} onChange={(e) => setForm({ ...form, busCapacity: Number(e.target.value) || undefined })} className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs" />
            </Field>
          )}
        </div>
        <Field label="Location">
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs" />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs" />
        </Field>

        <label className="mt-3 flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
          <span className="text-xs font-semibold">Require RSVP for this event</span>
          <input type="checkbox" checked={form.rsvp} onChange={(e) => setForm({ ...form, rsvp: e.target.checked })} className="h-4 w-4 accent-teal" />
        </label>

        {form.rsvp && (
          <div className="mt-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">RSVP options</label>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {form.options.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => {
                    const next = [...form.options] as [string, string, string];
                    next[i] = e.target.value;
                    setForm({ ...form, options: next });
                  }}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px]"
                />
              ))}
            </div>
          </div>
        )}

        <Field label="Move to different day">
          <select value={moveTo} onChange={(e) => setMoveTo(Number(e.target.value))} className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs">
            {dayLabels.map((l, i) => <option key={l} value={i}>{l}</option>)}
          </select>
        </Field>

        <button onClick={() => onSave(form, moveTo)} className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-background shadow-glow-teal">Save</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function NotifyConfirmSheet({
  changeCount, onClose, onPublish,
}: { changeCount: number; onClose: () => void; onPublish: () => void }) {
  const [sendPush, setSendPush] = useState(true);
  const [urgent, setUrgent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Notify team</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{changeCount} events updated</p>

        <label className="mt-3 flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
          <span className="text-xs font-semibold">Send push notification to all members</span>
          <input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} className="h-4 w-4 accent-teal" />
        </label>

        <label className="mt-2 flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
          <span className="text-xs font-semibold">Urgent update</span>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="h-4 w-4 accent-amber-400" />
        </label>

        <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notification preview</p>
          <p className="mt-1 flex items-start gap-2 text-xs">
            <BellRing size={14} className="mt-0.5 text-teal" />
            {urgent ? "⚠ URGENT: Tournament schedule changed" : "Coach updated the tournament schedule — tap to view"}
          </p>
        </div>

        <button onClick={onPublish} className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-background shadow-glow-teal">
          {sendPush ? "Publish & Notify" : "Publish"}
        </button>
        <button onClick={onPublish} className="mt-2 w-full rounded-full border border-border bg-surface-2 py-2.5 text-xs font-bold">
          Publish Silently
        </button>
      </div>
    </div>
  );
}

/* =================== CALENDAR EXPORT =================== */

function CalendarExportSheet({ onClose }: { onClose: () => void }) {
  const events = [
    { id: "g1", title: "GAME 1 vs. Burnaby Winter Club", when: "Jul 18 · 9:00 AM", loc: "Rink 1 · Langley Events Centre", locked: true, checked: true, rsvpNote: undefined as string | undefined },
    { id: "bus1", title: "🚌 Team bus departs", when: "Jul 18 · 6:30 AM", loc: "Surrey Sport & Leisure", locked: false, checked: false, rsvpNote: "You RSVPed Driving Myself" },
    { id: "h1", title: "🏨 Hotel check-in", when: "Jul 18 · 2:00 PM", loc: "Sandman Hotel Langley", locked: false, checked: false, rsvpNote: "You RSVPed Own Arrangements" },
    { id: "l1", title: "🍽 Team lunch", when: "Jul 18 · 12:00 PM", loc: "Boston Pizza Langley", locked: false, checked: true, rsvpNote: undefined },
    { id: "g2", title: "GAME 2 vs. Coquitlam Express", when: "Jul 19 · 2:00 PM", loc: "Rink 3 · Langley Events Centre", locked: true, checked: true, rsvpNote: undefined },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(events.map((e) => [e.id, e.checked])),
  );
  const count = Object.values(checked).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-bold">Add to Calendar</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3">
          {events.map((e) => (
            <label key={e.id} className="flex gap-2 rounded-md border border-border bg-surface-2 p-2">
              <input
                type="checkbox"
                checked={!!checked[e.id]}
                disabled={e.locked}
                onChange={() => setChecked((s) => ({ ...s, [e.id]: !s[e.id] }))}
                className="mt-0.5 h-4 w-4 accent-teal disabled:opacity-50"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{e.title}</p>
                <p className="text-[10px] text-muted-foreground">{e.when}</p>
                <p className="text-[10px] text-muted-foreground">📍 {e.loc}</p>
                {e.rsvpNote && <p className="text-[10px] text-amber-400">{e.rsvpNote}</p>}
                {e.locked && <p className="text-[10px] font-bold text-teal">Required</p>}
              </div>
            </label>
          ))}
        </div>
        <div className="space-y-2 border-t border-border px-5 py-4">
          <p className="text-[10px] text-muted-foreground">{count} of {events.length} events will be added</p>
          <button className="w-full rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-background shadow-glow-teal">Add to Apple Calendar</button>
          <button className="w-full rounded-full border border-border bg-surface-2 py-2.5 text-xs font-bold">Add to Google Calendar</button>
        </div>
      </div>
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

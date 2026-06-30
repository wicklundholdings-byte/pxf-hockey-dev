import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Hotel, Bus, ClipboardList, Paperclip } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/tournaments/$tournamentId")({
  component: TournamentDetail,
});

const DATA: Record<string, { name: string; dates: string; location: string; readonly?: boolean }> = {
  "spring-classic": { name: "BC Minor AAA Spring Classic", dates: "Jul 18–21, 2026", location: "Langley Events Centre" },
  "winter-invitational": { name: "Lower Mainland Winter Invitational", dates: "Feb 14–16, 2026", location: "Burnaby 8 Rinks", readonly: true },
};

const TABS = ["Games", "Standings", "Roster", "Logistics", "Payments"] as const;
type Tab = (typeof TABS)[number];

function TournamentDetail() {
  const { teamId, tournamentId } = Route.useParams();
  const t = DATA[tournamentId] ?? { name: "Tournament", dates: "", location: "" };
  const [tab, setTab] = useState<Tab>("Games");

  return (
    <div className="space-y-4 pb-10">
      <Link to="/coach/teams/$teamId/tournaments" params={{ teamId } as any} className="inline-flex items-center gap-1 text-xs font-bold text-teal">
        <ChevronLeft size={14} /> Tournaments
      </Link>
      <div>
        <h2 className="font-display text-xl font-bold leading-tight">{t.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t.dates} · {t.location}</p>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
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

      {tab === "Games" && <GamesTab readonly={t.readonly} />}
      {tab === "Standings" && <StandingsTab />}
      {tab === "Roster" && <RosterTab />}
      {tab === "Logistics" && <LogisticsTab />}
      {tab === "Payments" && <PaymentsTab />}
    </div>
  );
}

function GamesTab({ readonly }: { readonly?: boolean }) {
  const games = [
    { opp: "Burnaby Winter Club", date: "Jul 18", time: "9:00 AM", rink: "Rink 1", result: "3–1 WIN", win: true },
    { opp: "Coquitlam Express", date: "Jul 19", time: "2:00 PM", rink: "Rink 3", result: "Upcoming" },
    { opp: "North Delta Lightning", date: "Jul 20", time: "11:00 AM", rink: "Rink 2", result: "Upcoming" },
  ];
  return (
    <div className="space-y-3">
      {!readonly && (
        <div className="flex justify-end">
          <button className="flex items-center gap-1 text-xs font-bold text-teal"><Plus size={12} /> Add Game</button>
        </div>
      )}
      <div className="space-y-2">
        {games.map((g, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">vs. {g.opp}</p>
              <span className={"text-[11px] font-bold " + (g.win ? "text-teal" : "text-muted-foreground")}>{g.result}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{g.date} · {g.time} · {g.rink}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StandingsTab() {
  const rows = [
    { team: "Elite Demo Team", gp: 3, w: 2, l: 0, ot: 1, pts: 5, gf: 8, ga: 4, me: true },
    { team: "Burnaby Winter Club", gp: 3, w: 2, l: 1, ot: 0, pts: 4, gf: 7, ga: 5 },
    { team: "Coquitlam Express", gp: 3, w: 1, l: 1, ot: 1, pts: 3, gf: 6, ga: 7 },
    { team: "North Delta", gp: 3, w: 0, l: 2, ot: 1, pts: 1, gf: 3, ga: 8 },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2">Team</th><th className="px-1 py-2">GP</th><th className="px-1 py-2">W</th><th className="px-1 py-2">L</th><th className="px-1 py-2">OT</th><th className="px-1 py-2">PTS</th><th className="px-1 py-2">GF</th><th className="px-1 py-2">GA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className={r.me ? "bg-teal/15 font-bold text-teal" : "border-t border-border"}>
              <td className="px-2 py-2">{r.team}</td>
              <td className="px-1 py-2">{r.gp}</td><td className="px-1 py-2">{r.w}</td><td className="px-1 py-2">{r.l}</td><td className="px-1 py-2">{r.ot}</td><td className="px-1 py-2">{r.pts}</td><td className="px-1 py-2">{r.gf}</td><td className="px-1 py-2">{r.ga}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RosterTab() {
  const players = [
    { name: "Jake Andersson", num: 9 },
    { name: "Liam Carter", num: 14 },
    { name: "Owen Brooks", num: 22 },
    { name: "Marco Vella", num: 17, guest: true },
  ];
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="flex items-center gap-1 text-xs font-bold text-teal"><Plus size={12} /> Add Guest Player</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {players.map((p, i) => (
          <div key={p.name} className={"flex items-center gap-3 px-3 py-2.5 " + (i > 0 ? "border-t border-border" : "")}>
            <span className="grid h-7 w-7 place-items-center rounded-md bg-surface-2 text-[11px] font-bold">{p.num}</span>
            <span className="flex-1 text-sm">{p.name}</span>
            {p.guest && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">GUEST</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogisticsTab() {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="flex items-center gap-2 text-sm font-bold"><Hotel size={14} className="text-teal" /> Hotel</p>
        <p className="mt-1 text-xs text-muted-foreground">Sandman Hotel Langley · 8765 202 St · Check-in Jul 17</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="flex items-center gap-2 text-sm font-bold"><Bus size={14} className="text-teal" /> Team Bus</p>
        <p className="mt-1 text-xs text-muted-foreground">Departs Surrey Sport 7:00 AM Jul 18</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="flex items-center gap-2 text-sm font-bold"><ClipboardList size={14} className="text-teal" /> Tournament Notes</p>
        <textarea
          placeholder="Add coach notes…"
          className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-2 py-2 text-xs text-foreground"
          rows={3}
        />
      </div>
      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-2 py-3 text-xs font-bold text-foreground">
        <Paperclip size={14} /> Attach Tournament Package
      </button>
    </div>
  );
}

function PaymentsTab() {
  const players = [
    { name: "Jake Andersson", paid: true },
    { name: "Liam Carter", paid: false },
    { name: "Owen Brooks", paid: true },
    { name: "Ethan Park", paid: false },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Tournament Entry Fee</p>
        <p className="mt-1 text-lg font-bold">$1,200 total <span className="text-xs font-normal text-muted-foreground">· $85.71 per player</span></p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {players.map((p, i) => (
          <div key={p.name} className={"flex items-center justify-between px-3 py-2.5 " + (i > 0 ? "border-t border-border" : "")}>
            <span className="text-sm">{p.name}</span>
            <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + (p.paid ? "bg-teal/15 text-teal" : "bg-amber-500/20 text-amber-400")}>{p.paid ? "PAID" : "UNPAID"}</span>
          </div>
        ))}
      </div>
      <button className="flex w-full items-center justify-center rounded-full bg-gradient-brand py-3 text-sm font-bold text-background shadow-glow-teal active:opacity-90">
        Send Reminders
      </button>
    </div>
  );
}

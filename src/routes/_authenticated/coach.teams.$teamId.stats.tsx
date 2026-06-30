import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { loadTeamSeasonStats, gaa, svpct, type SkaterAgg, type GoalieAgg, type TeamRecord, type GameFilter } from "@/lib/team-stats";
import { ChevronLeft, Camera, Pencil, X, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/stats")({
  component: TeamStats,
});

type SortKey = "gp" | "g" | "a" | "pts" | "ppg" | "pm" | "pim";

type MockSkater = { id: string; name: string; gp: number; g: number; a: number; pts: number; ppg: number; pm: number; pim: number };
type MockGoalie = { id: string; name: string; gp: number; w: number; l: number; gaa: string; svp: string; so: number };

const mockSkaters: MockSkater[] = [
  { id: "p-carter", name: "Carter", gp: 14, g: 12, a: 14, pts: 26, ppg: 1.86, pm: 8, pim: 4 },
  { id: "p-brooks", name: "Brooks", gp: 14, g: 9, a: 11, pts: 20, ppg: 1.43, pm: 5, pim: 6 },
  { id: "p-jensen", name: "Jensen", gp: 13, g: 5, a: 6, pts: 11, ppg: 0.85, pm: 2, pim: 2 },
  { id: "p-petrov", name: "Petrov", gp: 14, g: 4, a: 5, pts: 9, ppg: 0.64, pm: -1, pim: 8 },
  { id: "p-callahan", name: "Callahan", gp: 12, g: 3, a: 4, pts: 7, ppg: 0.58, pm: 1, pim: 4 },
  { id: "p-reilly", name: "Reilly", gp: 14, g: 3, a: 4, pts: 7, ppg: 0.50, pm: 3, pim: 12 },
  { id: "p-macdonald", name: "MacDonald", gp: 11, g: 2, a: 3, pts: 5, ppg: 0.45, pm: -2, pim: 6 },
  { id: "p-nguyen", name: "Nguyen", gp: 14, g: 1, a: 2, pts: 3, ppg: 0.21, pm: 1, pim: 2 },
  { id: "p-marchetti", name: "Marchetti", gp: 14, g: 1, a: 1, pts: 2, ppg: 0.14, pm: 4, pim: 14 },
  { id: "p-kowalski", name: "Kowalski", gp: 14, g: 0, a: 3, pts: 3, ppg: 0.21, pm: 6, pim: 10 },
  { id: "p-thompson", name: "Thompson", gp: 14, g: 0, a: 2, pts: 2, ppg: 0.14, pm: 3, pim: 8 },
];

const mockGoalies: MockGoalie[] = [
  { id: "g-eriksson", name: "Eriksson", gp: 11, w: 6, l: 3, gaa: "2.81", svp: ".908", so: 1 },
  { id: "g-yamamoto", name: "Yamamoto", gp: 4, w: 1, l: 2, gaa: "3.40", svp: ".881", so: 0 },
];

const mockPendingGames = [
  { id: "pg-1", opponent: "Langley Trappers", date: "Jun 22" },
  { id: "pg-2", opponent: "North Delta Lightning", date: "Jun 18" },
  { id: "pg-3", opponent: "Richmond Sockeyes", date: "Jun 14" },
];

function genGameLogSkater(s: MockSkater) {
  // Distribute totals across GP games deterministically.
  const rows: { opp: string; g: number; a: number; pm: number; pim: number }[] = [];
  const opps = ["vs Trappers","@ Lightning","vs Sockeyes","@ Warriors","vs Hawks","@ Wolves","vs Bruins","@ Kings","vs Stars","@ Jets","vs Flames","@ Ducks","vs Sharks","@ Oilers"];
  let gL = s.g, aL = s.a, pmL = s.pm, pimL = s.pim;
  for (let i = 0; i < s.gp; i++) {
    const last = i === s.gp - 1;
    const g = last ? gL : Math.min(gL, i % 3 === 0 ? 1 : 0);
    const a = last ? aL : Math.min(aL, i % 2 === 0 ? 1 : 0);
    const pim = last ? pimL : Math.min(pimL, i % 4 === 0 ? 2 : 0);
    const pm = last ? pmL : Math.sign(s.pm) * (i % 5 === 0 ? 1 : 0);
    rows.push({ opp: opps[i % opps.length], g, a, pm, pim });
    gL -= g; aL -= a; pimL -= pim; pmL -= pm;
  }
  return rows;
}

function genGameLogGoalie(g: MockGoalie) {
  const rows: { opp: string; result: string; ga: number; sv: number; sa: number }[] = [];
  const opps = ["vs Trappers","@ Lightning","vs Sockeyes","@ Warriors","vs Hawks","@ Wolves","vs Bruins","@ Kings","vs Stars","@ Jets","vs Flames"];
  for (let i = 0; i < g.gp; i++) {
    const win = i < g.w;
    rows.push({ opp: opps[i % opps.length], result: win ? "W" : (i < g.w + g.l ? "L" : "OT"), ga: 2 + (i % 3), sv: 22 + (i % 8), sa: 25 + (i % 8) });
  }
  return rows;
}

function TeamStats() {
  const { teamId } = Route.useParams();
  const [filter, setFilter] = useState<GameFilter>("all");
  const [sort, setSort] = useState<SortKey>("pts");
  const [openSkater, setOpenSkater] = useState<MockSkater | null>(null);
  const [openGoalie, setOpenGoalie] = useState<MockGoalie | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickedGame, setPickedGame] = useState<{ id: string; opponent: string; date: string } | null>(null);
  const [mode, setMode] = useState<"choose" | "manual" | "upload">("choose");

  // Suppress unused-warning helpers (kept imports for future wiring)
  void teamId; void loadTeamSeasonStats; void gaa; void svpct;
  type _Unused = SkaterAgg | GoalieAgg | TeamRecord;

  const sortedSkaters = useMemo(() => {
    const key = sort as keyof MockSkater;
    return [...mockSkaters].sort((a, b) => (b[key] as number) - (a[key] as number));
  }, [sort]);

  return (
    <div>
      <h3 className="text-sm font-bold">Team Stats</h3>

      {/* Enter Game Stats CTA */}
      <button
        onClick={() => { setShowPicker(true); setMode("choose"); setPickedGame(null); }}
        className="mt-3 w-full rounded-full border border-teal py-2.5 text-[12px] font-bold text-teal"
      >
        Enter Game Stats
      </button>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1 text-[10px] font-bold">
        {(["all","home","away"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={"rounded-full py-1.5 " + (filter === f ? "bg-teal text-background" : "text-muted-foreground")}>
            {f === "all" ? "All Games" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">SEASON RECORD</p>
        <p className="mt-1 font-display text-2xl font-bold">7W · 5L · 2OT</p>
        <p className="text-[11px] text-muted-foreground">14 PTS · 14 GP · GF 48 · GA 39 · DIFF +9</p>
      </div>

      <h4 className="mt-4 text-xs font-bold">Skaters</h4>
      <div className="mt-2 flex gap-2">
        {(["pts","g","a","ppg"] as const).map((k) => (
          <button key={k} onClick={() => setSort(k)} className={"rounded-full px-3 py-1 text-[10px] font-bold " + (sort === k ? "bg-teal text-background" : "bg-surface text-muted-foreground")}>
            {k.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[480px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Player</th>
              {(["gp","g","a","pts","ppg","pm","pim"] as SortKey[]).map((k) => (
                <th key={k} className="p-2 cursor-pointer" onClick={() => setSort(k)}>
                  <span className={sort === k ? "text-teal" : ""}>{k === "pm" ? "+/-" : k.toUpperCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSkaters.map((s) => (
              <tr key={s.id} onClick={() => setOpenSkater(s)} className="cursor-pointer border-t border-border hover:bg-surface-2/50">
                <td className="p-2 font-semibold">{s.name}</td>
                <td className="p-2 text-center">{s.gp}</td>
                <td className="p-2 text-center">{s.g}</td>
                <td className="p-2 text-center">{s.a}</td>
                <td className="p-2 text-center font-bold text-teal">{s.pts}</td>
                <td className="p-2 text-center">{s.ppg.toFixed(2)}</td>
                <td className="p-2 text-center">{s.pm > 0 ? "+" : ""}{s.pm}</td>
                <td className="p-2 text-center">{s.pim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mt-4 text-xs font-bold">Goalies</h4>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[440px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2 text-left">Goalie</th><th>GP</th><th>W</th><th>L</th><th>GAA</th><th>SV%</th><th>SO</th></tr>
          </thead>
          <tbody>
            {mockGoalies.map((g) => (
              <tr key={g.id} onClick={() => setOpenGoalie(g)} className="cursor-pointer border-t border-border hover:bg-surface-2/50">
                <td className="p-2 font-semibold">{g.name}</td>
                <td className="p-2 text-center">{g.gp}</td>
                <td className="p-2 text-center">{g.w}</td>
                <td className="p-2 text-center">{g.l}</td>
                <td className="p-2 text-center">{g.gaa}</td>
                <td className="p-2 text-center">{g.svp}</td>
                <td className="p-2 text-center">{g.so}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openSkater && <SkaterGameLogSheet skater={openSkater} onClose={() => setOpenSkater(null)} />}
      {openGoalie && <GoalieGameLogSheet goalie={openGoalie} onClose={() => setOpenGoalie(null)} />}
      {showPicker && (
        <EnterStatsFlow
          mode={mode}
          pickedGame={pickedGame}
          onClose={() => { setShowPicker(false); setPickedGame(null); setMode("choose"); }}
          onPickGame={(g) => { setPickedGame(g); setMode("choose"); }}
          onChooseMode={(m) => setMode(m)}
        />
      )}
    </div>
  );
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[480px] max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <ChevronLeft size={14} /> Back
          </button>
          {title && <h3 className="text-sm font-bold">{title}</h3>}
          <span className="w-10" />
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function SkaterGameLogSheet({ skater, onClose }: { skater: MockSkater; onClose: () => void }) {
  const rows = useMemo(() => genGameLogSkater(skater), [skater]);
  return (
    <Sheet title={skater.name} onClose={onClose}>
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">GAME-BY-GAME</p>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full min-w-[420px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2 text-left">Game</th><th>G</th><th>A</th><th>+/-</th><th>PIM</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2 font-semibold">{r.opp}</td>
                <td className="p-2 text-center">{r.g}</td>
                <td className="p-2 text-center">{r.a}</td>
                <td className="p-2 text-center">{r.pm > 0 ? "+" : ""}{r.pm}</td>
                <td className="p-2 text-center">{r.pim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}

function GoalieGameLogSheet({ goalie, onClose }: { goalie: MockGoalie; onClose: () => void }) {
  const rows = useMemo(() => genGameLogGoalie(goalie), [goalie]);
  return (
    <Sheet title={goalie.name} onClose={onClose}>
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">GAME-BY-GAME</p>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full min-w-[380px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2 text-left">Game</th><th>Result</th><th>GA</th><th>SV</th><th>SA</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2 font-semibold">{r.opp}</td>
                <td className="p-2 text-center">{r.result}</td>
                <td className="p-2 text-center">{r.ga}</td>
                <td className="p-2 text-center">{r.sv}</td>
                <td className="p-2 text-center">{r.sa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}

function EnterStatsFlow({
  mode,
  pickedGame,
  onClose,
  onPickGame,
  onChooseMode,
}: {
  mode: "choose" | "manual" | "upload";
  pickedGame: { id: string; opponent: string; date: string } | null;
  onClose: () => void;
  onPickGame: (g: { id: string; opponent: string; date: string }) => void;
  onChooseMode: (m: "manual" | "upload") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[480px] max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">
            {!pickedGame ? "Select a game" : pickedGame ? `vs. ${pickedGame.opponent} · ${pickedGame.date}` : ""}
          </h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        {!pickedGame && (
          <div className="mt-3 space-y-2">
            {mockPendingGames.map((g) => (
              <button
                key={g.id}
                onClick={() => onPickGame(g)}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-background p-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">vs. {g.opponent}</p>
                  <p className="text-[11px] text-muted-foreground">{g.date} · No stats entered</p>
                </div>
                <span className="text-[10px] font-bold tracking-wider text-teal">ENTER →</span>
              </button>
            ))}
          </div>
        )}

        {pickedGame && mode === "choose" && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => onChooseMode("upload")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
            >
              <Camera size={14} /> Upload Game Sheet
            </button>
            <button
              onClick={() => onChooseMode("manual")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-teal py-3 text-sm font-bold text-teal"
            >
              <Pencil size={14} /> Enter Manually
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Photo upload uses AI to pre-fill stats. You review and confirm.
            </p>
          </div>
        )}

        {pickedGame && mode === "manual" && <ManualEntry onClose={onClose} />}
        {pickedGame && mode === "upload" && <UploadReview onClose={onClose} />}
      </div>
    </div>
  );
}

function ManualEntry({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState(() =>
    mockSkaters.map((s) => ({ id: s.id, name: s.name, g: 0, a: 0, pm: 0, pim: 0, sog: 0 }))
  );
  function upd(id: string, k: "g"|"a"|"pm"|"pim"|"sog", v: string) {
    const n = parseInt(v) || 0;
    setRows((r) => r.map((row) => row.id === id ? { ...row, [k]: n } : row));
  }
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">MANUAL ENTRY</p>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full min-w-[420px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2 text-left">Player</th><th>G</th><th>A</th><th>+/-</th><th>PIM</th><th>SOG</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2 font-semibold">{r.name}</td>
                {(["g","a","pm","pim","sog"] as const).map((k) => (
                  <td key={k} className="p-1 text-center">
                    <input
                      type="number"
                      value={r[k]}
                      onChange={(e) => upd(r.id, k, e.target.value)}
                      className="w-10 rounded-md border border-border bg-surface px-1 py-1 text-center text-[11px]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={onClose}
        className="mt-3 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground"
      >
        Save
      </button>
    </div>
  );
}

function UploadReview({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  // Mock AI-extracted rows; some with low confidence flagged
  const [rows, setRows] = useState(() => [
    { id: "p-carter", name: "Carter", g: 1, a: 2, pm: 1, pim: 0, sog: 6, low: false },
    { id: "p-brooks", name: "Brooks", g: 1, a: 0, pm: 1, pim: 2, sog: 5, low: false },
    { id: "p-jensen", name: "Jensen", g: 0, a: 1, pm: 0, pim: 0, sog: 3, low: true },
    { id: "p-petrov", name: "Petrov", g: 0, a: 0, pm: -1, pim: 0, sog: 2, low: false },
    { id: "p-reilly", name: "Reilly", g: 1, a: 0, pm: 2, pim: 2, sog: 3, low: true },
    { id: "p-kowalski", name: "Kowalski", g: 0, a: 1, pm: 1, pim: 0, sog: 1, low: false },
  ]);
  function upd(id: string, k: "g"|"a"|"pm"|"pim"|"sog", v: string) {
    const n = parseInt(v) || 0;
    setRows((r) => r.map((row) => row.id === id ? { ...row, [k]: n, low: false } : row));
  }
  if (step === "upload") {
    return (
      <div className="mt-3">
        <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background">
          <Camera size={24} className="text-teal" />
          <p className="text-[12px] font-semibold">Tap to take photo or upload</p>
          <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF</p>
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={() => setStep("review")}
          />
        </label>
        <button
          onClick={() => setStep("review")}
          className="mt-3 w-full rounded-full border border-teal py-2.5 text-[12px] font-bold text-teal"
        >
          Skip · Use demo extraction
        </button>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">REVIEW EXTRACTED STATS</p>
        <span className="rounded-full bg-soon/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-soon">AMBER = LOW CONFIDENCE</span>
      </div>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full min-w-[420px] text-[11px]">
          <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2 text-left">Player</th><th>G</th><th>A</th><th>+/-</th><th>PIM</th><th>SOG</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2 font-semibold">{r.name}</td>
                {(["g","a","pm","pim","sog"] as const).map((k) => (
                  <td key={k} className="p-1 text-center">
                    <input
                      type="number"
                      value={r[k]}
                      onChange={(e) => upd(r.id, k, e.target.value)}
                      className={
                        "w-10 rounded-md border px-1 py-1 text-center text-[11px] " +
                        (r.low ? "border-soon bg-soon/10 text-soon" : "border-border bg-surface")
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={onClose}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground"
      >
        <Check size={14} /> Confirm & Save
      </button>
    </div>
  );
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Share2, ChevronDown } from "lucide-react";

type LiveKind = "team" | "camp" | "private";

type LiveSearch = {
  kind?: LiveKind;
  name?: string;
  rink?: string;
  campDay?: number;
  campTotal?: number;
  returnTo?: string;
};

export const Route = createFileRoute("/_authenticated/coach/live")({
  validateSearch: (s: Record<string, unknown>): LiveSearch => ({
    kind: (["team", "camp", "private"] as const).includes(s.kind as LiveKind) ? (s.kind as LiveKind) : "team",
    name: typeof s.name === "string" ? s.name : undefined,
    rink: typeof s.rink === "string" ? s.rink : undefined,
    campDay: typeof s.campDay === "number" ? s.campDay : s.campDay ? Number(s.campDay) : undefined,
    campTotal: typeof s.campTotal === "number" ? s.campTotal : s.campTotal ? Number(s.campTotal) : undefined,
    returnTo: typeof s.returnTo === "string" ? s.returnTo : undefined,
  }),
  component: LiveSessionScreen,
});

// ---------------- Demo data ----------------
type Drill = {
  id: string;
  category: string;
  name: string;
  minutes: number;
  notes: string;
  progressions?: string[];
};

const DEMO_DRILLS: Drill[] = [
  {
    id: "d1",
    category: "SKATING",
    name: "Edge Mastery Series",
    minutes: 8,
    notes: "Deep knee bend. Inside edge → outside edge. Small circles both directions.",
    progressions: ["Two-foot glide", "One-foot pivots", "Full-lap edge work"],
  },
  {
    id: "d2",
    category: "SKATING",
    name: "Crossover Power",
    minutes: 10,
    notes: "Push through the crossover — full extension. Head up, eyes on the target.",
    progressions: ["Stationary", "Around circle", "Figure-8 pattern"],
  },
  {
    id: "d3",
    category: "COMPETE",
    name: "Battle Drills",
    minutes: 15,
    notes: "1-on-1 in the corner. Body position wins pucks. Short shifts, high compete.",
  },
  {
    id: "d4",
    category: "COMPETE",
    name: "Rush Series",
    minutes: 12,
    notes: "2-on-1 and 3-on-2 rushes. Attack with speed. Support the puck carrier.",
    progressions: ["2-on-0", "2-on-1", "3-on-2 with backcheck"],
  },
  {
    id: "d5",
    category: "SYSTEMS",
    name: "Breakout Patterns",
    minutes: 20,
    notes: "D-to-D reads. Wingers on the wall. Center swings low. Full-ice reps.",
    progressions: ["Walk-through", "Half speed", "Full speed with pressure"],
  },
  {
    id: "d6",
    category: "COOLDOWN",
    name: "Cooldown Edges",
    minutes: 3,
    notes: "Easy glides. Long strides. Slow the heart rate. Debrief on ice.",
  },
];

type Player = { id: string; name: string; number: string; position: string };

const DEMO_ROSTER: Player[] = [
  { id: "p1", name: "Jake Andersson", number: "9", position: "C" },
  { id: "p2", name: "Liam Carter", number: "11", position: "RW" },
  { id: "p3", name: "Ethan Park", number: "7", position: "C" },
  { id: "p4", name: "Marco Vella", number: "23", position: "LW" },
  { id: "p5", name: "Noah Kim", number: "17", position: "RW" },
  { id: "p6", name: "Owen Zhao", number: "4", position: "D" },
  { id: "p7", name: "Ryan Miller", number: "31", position: "G" },
  { id: "p8", name: "Tyler Brooks", number: "27", position: "D" },
  { id: "p9", name: "Cole Nguyen", number: "14", position: "C" },
  { id: "p10", name: "Dylan Reed", number: "22", position: "LW" },
  { id: "p11", name: "Aiden Voss", number: "8", position: "D" },
  { id: "p12", name: "Blake Ortiz", number: "19", position: "RW" },
  { id: "p13", name: "Cameron Fox", number: "6", position: "D" },
  { id: "p14", name: "Diego Silva", number: "12", position: "C" },
  { id: "p15", name: "Emma Walsh", number: "88", position: "LW" },
];

type Attend = "here" | "late" | "absent" | null;

// ---------------- Screen ----------------
function LiveSessionScreen() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const kind = search.kind ?? "team";
  const sessionName =
    search.name ??
    (kind === "camp"
      ? `Elite Dev Camp · Day ${search.campDay ?? 1}${search.campTotal ? ` of ${search.campTotal}` : ""}`
      : kind === "private"
      ? "Private Session"
      : "Elite Demo Team · Practice");
  const returnTo = search.returnTo ?? "/coach";

  const needsAttendance = kind !== "private";
  const [step, setStep] = useState<"attendance" | "overview" | "live" | "complete">(
    needsAttendance ? "attendance" : "overview",
  );

  const [attendance, setAttendance] = useState<Record<string, Attend>>({});
  const startedAtRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [drillIdx, setDrillIdx] = useState(0);
  const [progIdx, setProgIdx] = useState(0);
  const [notes, setNotes] = useState("");

  // timer runs during live step
  useEffect(() => {
    if (step !== "live") return;
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const id = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(id);
  }, [step]);

  function goHome() {
    navigate({ to: returnTo as any });
  }

  if (step === "attendance") {
    return (
      <AttendanceStep
        sessionName={sessionName}
        rink={search.rink}
        attendance={attendance}
        setAttendance={setAttendance}
        onCancel={goHome}
        onStart={() => setStep("overview")}
      />
    );
  }

  if (step === "overview") {
    return (
      <OverviewStep
        sessionName={sessionName}
        rink={search.rink}
        onBack={() => (needsAttendance ? setStep("attendance") : goHome())}
        onBegin={() => setStep("live")}
      />
    );
  }

  if (step === "live") {
    return (
      <LiveStep
        sessionName={sessionName}
        elapsedSec={elapsedSec}
        drillIdx={drillIdx}
        setDrillIdx={(n) => {
          setDrillIdx(n);
          setProgIdx(0);
        }}
        progIdx={progIdx}
        setProgIdx={setProgIdx}
        onEndConfirm={goHome}
        onFinish={() => setStep("complete")}
      />
    );
  }

  return (
    <CompleteStep
      sessionName={sessionName}
      elapsedSec={elapsedSec}
      attendance={attendance}
      notes={notes}
      setNotes={setNotes}
      kind={kind}
      campDay={search.campDay}
      campTotal={search.campTotal}
      onDone={goHome}
    />
  );
}

// ---------------- Attendance ----------------
function AttendanceStep({
  sessionName,
  rink,
  attendance,
  setAttendance,
  onCancel,
  onStart,
}: {
  sessionName: string;
  rink?: string;
  attendance: Record<string, Attend>;
  setAttendance: (a: Record<string, Attend>) => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const counts = useMemo(() => {
    let here = 0, late = 0, absent = 0;
    for (const p of DEMO_ROSTER) {
      const s = attendance[p.id];
      if (s === "here") here++;
      else if (s === "late") late++;
      else if (s === "absent") absent++;
    }
    return { here, late, absent };
  }, [attendance]);

  function toggle(pid: string, s: Attend) {
    setAttendance({ ...attendance, [pid]: s });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <div className="border-b border-border px-4 pt-5 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">
          Attendance · {sessionName}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {today}
          {rink ? ` · ${rink}` : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2">
          {DEMO_ROSTER.map((p) => {
            const state = attendance[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-surface font-mono text-[11px] font-bold">
                  #{p.number}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.position}</p>
                </div>
                <div className="flex gap-1">
                  <AttendBtn label="✓ HERE" active={state === "here"} tone="teal" onClick={() => toggle(p.id, "here")} />
                  <AttendBtn label="? LATE" active={state === "late"} tone="orange" onClick={() => toggle(p.id, "late")} />
                  <AttendBtn label="✗ ABSENT" active={state === "absent"} tone="red" onClick={() => toggle(p.id, "absent")} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 pt-3 pb-5">
        <p className="text-center text-xs font-bold">
          <span className="text-teal">{counts.here} here</span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-orange-400">{counts.late} late</span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-red-400">{counts.absent} absent</span>
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-3 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="flex-1 rounded-xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal"
          >
            Start Session →
          </button>
        </div>
      </div>
    </div>
  );
}

function AttendBtn({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "teal" | "orange" | "red";
  onClick: () => void;
}) {
  const activeCls =
    tone === "teal"
      ? "bg-teal text-background"
      : tone === "orange"
      ? "bg-orange-500 text-white"
      : "bg-red-500 text-white";
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
        active ? activeCls : "bg-surface text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------- Live ----------------
function LiveStep({
  sessionName,
  elapsedSec,
  drillIdx,
  setDrillIdx,
  progIdx,
  setProgIdx,
  onEndConfirm,
  onFinish,
}: {
  sessionName: string;
  elapsedSec: number;
  drillIdx: number;
  setDrillIdx: (n: number) => void;
  progIdx: number;
  setProgIdx: (n: number) => void;
  onEndConfirm: () => void;
  onFinish: () => void;
}) {
  const drill = DEMO_DRILLS[drillIdx];
  const total = DEMO_DRILLS.length;
  const isLast = drillIdx === total - 1;
  const [confirmEnd, setConfirmEnd] = useState(false);

  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50) {
      if (dx < 0) next();
      else prev();
    }
    touch.current = null;
  }

  function prev() {
    if (drillIdx > 0) setDrillIdx(drillIdx - 1);
  }
  function next() {
    if (!isLast) setDrillIdx(drillIdx + 1);
    else onFinish();
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(1, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  const pct = ((drillIdx + 1) / total) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={() => setConfirmEnd(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <X size={16} /> End
        </button>
        <p className="mx-2 flex-1 truncate text-center text-[11px] text-muted-foreground">
          {sessionName}
        </p>
        <p className="font-mono text-sm font-bold text-teal tabular-nums">
          {mm}:{ss}
        </p>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal/80">
          Drill {drillIdx + 1} of {total}
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Drill card */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[3px] text-teal">
            {drill.category}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight">
            {drill.name}
          </h1>
          <span className="mt-3 inline-block rounded-full bg-teal/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal">
            {drill.minutes} min
          </span>

          {/* Rink diagram (schematic) */}
          <div className="mt-4">
            <RinkDiagram drillId={drill.id} />
          </div>

          <p className="mt-4 text-base leading-snug text-foreground">{drill.notes}</p>

          {drill.progressions && drill.progressions.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
                  Progression {progIdx + 1} of {drill.progressions.length}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setProgIdx(Math.max(0, progIdx - 1))}
                    disabled={progIdx === 0}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-teal disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setProgIdx(Math.min(drill.progressions!.length - 1, progIdx + 1))
                    }
                    disabled={progIdx === drill.progressions.length - 1}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-teal disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold">{drill.progressions[progIdx]}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="grid grid-cols-2 gap-2 border-t border-border bg-card px-4 pt-3 pb-5">
        <button
          onClick={prev}
          disabled={drillIdx === 0}
          className="inline-flex items-center justify-center gap-1 rounded-2xl border border-border py-4 text-sm font-bold disabled:opacity-30"
        >
          <ChevronLeft size={18} /> PREV
        </button>
        <button
          onClick={next}
          className="inline-flex items-center justify-center gap-1 rounded-2xl bg-gradient-brand py-4 text-sm font-bold text-primary-foreground shadow-glow-teal"
        >
          {isLast ? "FINISH SESSION" : "NEXT DRILL"} <ChevronRight size={18} />
        </button>
      </div>

      {confirmEnd && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-bold">End session?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Progress will not be saved.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold"
              >
                Keep going
              </button>
              <button
                onClick={onEndConfirm}
                className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-bold text-white"
              >
                End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RinkDiagram({ drillId }: { drillId: string }) {
  // simple schematic — the rink outline with drill-specific colored routes
  return (
    <svg
      viewBox="0 0 320 160"
      className="w-full rounded-xl border border-border bg-surface"
    >
      <rect x="4" y="4" width="312" height="152" rx="60" fill="#0b1416" stroke="#1f2a2c" strokeWidth="1.5" />
      <line x1="160" y1="6" x2="160" y2="154" stroke="#c9302c" strokeWidth="1" opacity="0.5" />
      <line x1="110" y1="6" x2="110" y2="154" stroke="#1d4ed8" strokeWidth="1" opacity="0.4" />
      <line x1="210" y1="6" x2="210" y2="154" stroke="#1d4ed8" strokeWidth="1" opacity="0.4" />
      <circle cx="160" cy="80" r="16" fill="none" stroke="#1d4ed8" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="45" r="12" fill="none" stroke="#c9302c" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="115" r="12" fill="none" stroke="#c9302c" strokeWidth="1" opacity="0.5" />
      <circle cx="260" cy="45" r="12" fill="none" stroke="#c9302c" strokeWidth="1" opacity="0.5" />
      <circle cx="260" cy="115" r="12" fill="none" stroke="#c9302c" strokeWidth="1" opacity="0.5" />
      {/* drill route */}
      {drillId === "d1" && (
        <path d="M60 45 Q90 25 120 45 T180 45 T240 45" fill="none" stroke="#00C4B4" strokeWidth="2.5" strokeDasharray="4 3" />
      )}
      {drillId === "d2" && (
        <path d="M60 115 C 100 60, 200 60, 260 115" fill="none" stroke="#00C4B4" strokeWidth="2.5" />
      )}
      {drillId === "d3" && (
        <>
          <path d="M40 45 L280 45" stroke="#00C4B4" strokeWidth="2" strokeDasharray="6 4" />
          <path d="M40 115 L280 115" stroke="#00C4B4" strokeWidth="2" strokeDasharray="6 4" />
        </>
      )}
      {drillId === "d4" && (
        <>
          <path d="M60 45 Q160 100 260 45" fill="none" stroke="#00C4B4" strokeWidth="2.5" />
          <path d="M60 115 Q160 60 260 115" fill="none" stroke="#00C4B4" strokeWidth="2.5" />
        </>
      )}
      {drillId === "d5" && (
        <circle cx="60" cy="45" r="20" fill="none" stroke="#00C4B4" strokeWidth="2.5" />
      )}
      {drillId === "d6" && (
        <ellipse cx="160" cy="80" rx="120" ry="55" fill="none" stroke="#00C4B4" strokeWidth="2" strokeDasharray="6 4" />
      )}
    </svg>
  );
}

// ---------------- Complete ----------------
function CompleteStep({
  sessionName,
  elapsedSec,
  attendance,
  notes,
  setNotes,
  kind,
  campDay,
  campTotal,
  onDone,
}: {
  sessionName: string;
  elapsedSec: number;
  attendance: Record<string, Attend>;
  notes: string;
  setNotes: (v: string) => void;
  kind: LiveKind;
  campDay?: number;
  campTotal?: number;
  onDone: () => void;
}) {
  const minutes = Math.max(1, Math.round(elapsedSec / 60));
  const counts = { here: 0, late: 0, absent: 0 };
  for (const p of DEMO_ROSTER) {
    const s = attendance[p.id];
    if (s === "here") counts.here++;
    else if (s === "late") counts.late++;
    else if (s === "absent") counts.absent++;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10 pb-8">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-teal/15">
          <Check size={44} className="text-teal" strokeWidth={3} />
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-bold">Session Complete</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{sessionName}</p>
        <p className="mt-3 text-center font-mono text-lg font-bold text-teal">
          {minutes} {minutes === 1 ? "minute" : "minutes"}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <SummaryCard label="Drills completed" value={`${DEMO_DRILLS.length} of ${DEMO_DRILLS.length}`} />
          <SummaryCard
            label="Attendance"
            value={
              kind === "private"
                ? "1 athlete"
                : `${counts.here} · ${counts.late} · ${counts.absent}`
            }
            hint={kind === "private" ? undefined : "here · late · absent"}
          />
        </div>

        {kind === "camp" && (
          <div className="mt-4 rounded-2xl border border-teal/40 bg-teal/10 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">
              Day {campDay ?? 1} Complete
            </p>
            {campTotal && campDay && campDay < campTotal && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Day {campDay + 1} unlocks tomorrow
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <label className="block text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
            Session notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add session notes…"
            className="mt-2 w-full rounded-xl border border-border bg-card p-3 text-sm"
          />
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => {
              const text = `${sessionName} — ${minutes} min · ${DEMO_DRILLS.length} drills${
                kind !== "private" ? ` · ${counts.here} here / ${counts.late} late / ${counts.absent} absent` : ""
              }`;
              if ((navigator as any).share) {
                (navigator as any).share({ title: sessionName, text }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(text);
                alert("Summary copied");
              }
            }}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border py-3 text-xs font-bold"
          >
            <Share2 size={14} /> Share Summary
          </button>
          <button
            onClick={onDone}
            className="flex-1 rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
      {hint && <p className="text-[9px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Play, Pause, SkipForward, CheckCircle2, X, RotateCcw,
  Clock, Megaphone, ListChecks, Tag, Film, Plus, Minus, Trophy,
} from "lucide-react";
import { DRILLS, type Drill } from "@/data/pxf";
import { useWakeLock } from "@/lib/coach-runtime";

const SESSIONS_KEY = "pxf:sessions:v2";
const EVT = "pxf:sessions-changed";

type Block = { uid: string; drillId: string; mins: number; notes?: string };
type Session = {
  id: string;
  name: string;
  date: string;
  age: string;
  level: string;
  totalMins: number;
  notes: string;
  focus?: string;
  blocks: Block[];
  completed?: boolean;
  completedAt?: string;
};

function readAll(): Session[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]"); } catch { return []; }
}
function writeAll(list: Session[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export const Route = createFileRoute("/coach/$sessionId")({
  component: CoachRun,
});

type Phase = "preflight" | "active" | "summary";
type DrillLog = { completed: boolean; skipped: boolean; actualSeconds: number; notes: string };

function CoachRun() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("preflight");
  const [idx, setIdx] = useState(0);
  const [log, setLog] = useState<Record<string, DrillLog>>({});

  useEffect(() => {
    const sync = () => setSession(readAll().find((s) => s.id === sessionId) ?? null);
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [sessionId]);

  useWakeLock(phase === "active");

  if (!session) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-muted-foreground">Session not found.</p>
        <Link to="/coach" className="mt-3 inline-flex text-sm font-semibold text-teal">Back to Coach</Link>
      </div>
    );
  }

  const drillBlocks = session.blocks
    .map((b) => ({ block: b, drill: DRILLS.find((d) => d.id === b.drillId) }))
    .filter((x): x is { block: Block; drill: Drill } => !!x.drill);

  if (drillBlocks.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-muted-foreground">This session has no drills yet.</p>
        <Link
          to="/session-detail/$sessionId"
          params={{ sessionId }}
          className="mt-3 inline-flex text-sm font-semibold text-teal"
        >Add drills</Link>
      </div>
    );
  }

  function updateLog(uid: string, patch: Partial<DrillLog>) {
    setLog((prev) => {
      const cur = prev[uid] ?? { completed: false, skipped: false, actualSeconds: 0, notes: "" };
      return { ...prev, [uid]: { ...cur, ...patch } };
    });
  }

  function exitToHub() {
    navigate({ to: "/coach" });
  }

  function finish() {
    setPhase("summary");
  }

  function markComplete() {
    const all = readAll();
    const updated = all.map((s) =>
      s.id === session!.id ? { ...s, completed: true, completedAt: new Date().toISOString() } : s,
    );
    writeAll(updated);
    navigate({ to: "/coach" });
  }

  if (phase === "preflight") {
    return <Preflight session={session} drillBlocks={drillBlocks} onStart={() => { setIdx(0); setPhase("active"); }} onExit={exitToHub} />;
  }

  if (phase === "summary") {
    return <Summary session={session} drillBlocks={drillBlocks} log={log} onClose={exitToHub} onComplete={markComplete} />;
  }

  return (
    <ActiveDrill
      session={session}
      drillBlocks={drillBlocks}
      idx={idx}
      total={drillBlocks.length}
      log={log}
      updateLog={updateLog}
      onExit={exitToHub}
      onPrev={() => setIdx((i) => Math.max(0, i - 1))}
      onNext={() => {
        if (idx >= drillBlocks.length - 1) finish();
        else setIdx((i) => i + 1);
      }}
    />
  );
}

/* ============================== Preflight ============================== */

function Preflight({
  session, drillBlocks, onStart, onExit,
}: {
  session: Session;
  drillBlocks: { block: Block; drill: Drill }[];
  onStart: () => void;
  onExit: () => void;
}) {
  const total = drillBlocks.reduce((t, b) => t + b.block.mins, 0);
  return (
    <div className="px-5 pt-4 pb-32">
      <button onClick={onExit} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ArrowLeft size={14} /> BACK TO COACH
      </button>

      <div className="mt-3">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-volt">READY TO RUN</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{session.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {drillBlocks.length} drills · {total} min · {session.age} · {session.level}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {drillBlocks.map((b, i) => (
          <div key={b.block.uid} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-[12px] font-bold text-teal">{i + 1}</div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-foreground">{b.drill.name}</h3>
              <p className="text-[11px] text-muted-foreground">{b.drill.category} · {b.block.mins} min</p>
            </div>
            {b.drill.videoUrl ? <Film size={14} className="text-volt" /> : <Film size={14} className="text-muted-foreground/40" />}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border/60 bg-background/95 p-3 backdrop-blur-xl">
        <button
          onClick={onStart}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-4 text-sm font-bold tracking-wide text-primary-foreground shadow-glow-teal"
        >
          <Play size={16} /> START PRACTICE
        </button>
      </div>
    </div>
  );
}

/* ============================== Active drill ============================== */

function ActiveDrill({
  session, drillBlocks, idx, total, log, updateLog, onExit, onPrev, onNext,
}: {
  session: Session;
  drillBlocks: { block: Block; drill: Drill }[];
  idx: number;
  total: number;
  log: Record<string, DrillLog>;
  updateLog: (uid: string, patch: Partial<DrillLog>) => void;
  onExit: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { block, drill } = drillBlocks[idx];
  const [seconds, setSeconds] = useState(block.mins * 60);
  const [running, setRunning] = useState(true);
  const [confirmExit, setConfirmExit] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const accumulatedRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset state when drill changes
  useEffect(() => {
    setSeconds(block.mins * 60);
    setRunning(true);
    startedAtRef.current = Date.now();
    accumulatedRef.current = 0;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [block.uid, block.mins]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
      accumulatedRef.current += 1;
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const overtime = seconds === 0;

  const note = log[block.uid]?.notes ?? "";

  function commitActual() {
    updateLog(block.uid, { actualSeconds: accumulatedRef.current });
  }

  function handleComplete() {
    commitActual();
    updateLog(block.uid, { completed: true, skipped: false });
    onNext();
  }
  function handleSkip() {
    commitActual();
    updateLog(block.uid, { skipped: true, completed: false });
    onNext();
  }

  return (
    <div className="px-5 pt-4 pb-40">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setConfirmExit(true)}
          aria-label="Exit practice"
          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground"
        >
          <X size={16} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-teal">DRILL {idx + 1} / {total}</p>
          <p className="truncate text-[11px] text-muted-foreground">{session.name}</p>
        </div>
        <div className="h-9 w-9" />
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-gradient-brand" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      {/* Coach video */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-black">
        {drill.videoUrl ? (
          <video
            ref={videoRef}
            key={block.uid}
            src={drill.videoUrl}
            poster={drill.posterUrl}
            playsInline
            controls
            muted
            preload="metadata"
            className="aspect-video w-full bg-black"
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-surface text-center">
            <Film size={24} className="text-muted-foreground/60" />
            <p className="text-xs font-semibold text-muted-foreground">Coach video coming soon</p>
            <p className="px-6 text-[11px] text-muted-foreground/70">Run the drill from the coaching points below.</p>
          </div>
        )}
      </div>

      {/* Drill info */}
      <div className="mt-4">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold tracking-wider text-foreground/70">
          <Tag size={9} className="-mt-0.5 mr-1 inline text-teal" />{drill.category.toUpperCase()}
        </span>
        <h2 className="mt-2 text-xl font-bold text-foreground">{drill.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{drill.blurb}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {drill.equipment.map((e) => (
            <span key={e} className="rounded-full border border-border/60 bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{e}</span>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">TIMER</p>
            <p className={"mt-1 font-display text-5xl font-bold tabular-nums " + (overtime ? "text-volt" : "text-foreground")}>
              {mm}:{ss}
            </p>
          </div>
          <button
            onClick={() => setRunning((r) => !r)}
            className="grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal"
            aria-label={running ? "Pause timer" : "Resume timer"}
          >
            {running ? <Pause size={22} /> : <Play size={22} />}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={() => setSeconds((s) => Math.max(0, s - 30))} className="flex items-center justify-center gap-1 rounded-xl bg-surface-2 py-2 text-[11px] font-bold text-foreground">
            <Minus size={12} /> 30s
          </button>
          <button onClick={() => { setSeconds(block.mins * 60); accumulatedRef.current = 0; }} className="flex items-center justify-center gap-1 rounded-xl bg-surface-2 py-2 text-[11px] font-bold text-foreground">
            <RotateCcw size={12} /> RESET
          </button>
          <button onClick={() => setSeconds((s) => s + 30)} className="flex items-center justify-center gap-1 rounded-xl bg-surface-2 py-2 text-[11px] font-bold text-foreground">
            <Plus size={12} /> 30s
          </button>
        </div>
      </div>

      {/* Coaching points */}
      {drill.notes.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border/60 bg-surface p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.3em] text-teal">
            <ListChecks size={12} /> COACHING POINTS
          </p>
          <ul className="mt-2 space-y-1.5">
            {drill.notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-foreground/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      <div className="mt-4">
        <label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">YOUR NOTES</label>
        <textarea
          value={note}
          onChange={(e) => updateLog(block.uid, { notes: e.target.value })}
          rows={2}
          placeholder="Quick observations…"
          className="mt-1.5 w-full resize-none rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal/60"
        />
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border/60 bg-background/95 p-3 backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleSkip}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-surface py-3 text-[11px] font-bold tracking-wide text-muted-foreground"
          >
            <SkipForward size={14} /> SKIP
          </button>
          <button
            onClick={handleComplete}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-volt/15 py-3 text-[11px] font-bold tracking-wide text-volt"
          >
            <CheckCircle2 size={14} /> DONE
          </button>
          <button
            onClick={() => { commitActual(); onNext(); }}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-brand py-3 text-[11px] font-bold tracking-wide text-primary-foreground shadow-glow-teal"
          >
            {idx >= total - 1 ? <>FINISH</> : <>NEXT <SkipForward size={14} /></>}
          </button>
        </div>
        {idx > 0 && (
          <button onClick={onPrev} className="mt-2 w-full text-center text-[11px] font-semibold text-muted-foreground">
            ← Previous drill
          </button>
        )}
      </div>

      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur" onClick={() => setConfirmExit(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground">Exit practice?</h3>
            <p className="mt-1 text-xs text-muted-foreground">Your progress this session won't be saved.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmExit(false)} className="flex-1 rounded-xl border border-border/60 bg-surface-2 py-2.5 text-xs font-bold text-foreground">STAY</button>
              <button onClick={onExit} className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground">EXIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== Summary ============================== */

function Summary({
  session, drillBlocks, log, onClose, onComplete,
}: {
  session: Session;
  drillBlocks: { block: Block; drill: Drill }[];
  log: Record<string, DrillLog>;
  onClose: () => void;
  onComplete: () => void;
}) {
  const totalActual = Object.values(log).reduce((t, l) => t + (l?.actualSeconds ?? 0), 0);
  const completedCount = drillBlocks.filter((b) => log[b.block.uid]?.completed).length;
  const skippedCount = drillBlocks.filter((b) => log[b.block.uid]?.skipped).length;

  return (
    <div className="px-5 pt-4 pb-10">
      <button onClick={onClose} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ArrowLeft size={14} /> BACK TO COACH
      </button>

      <div className="mt-3 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-volt/15 text-volt">
          <Trophy size={28} />
        </div>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.3em] text-volt">PRACTICE COMPLETE</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{session.name}</h1>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Total" value={`${Math.round(totalActual / 60)}m`} icon={<Clock size={14} className="text-teal" />} />
        <Stat label="Done" value={String(completedCount)} icon={<CheckCircle2 size={14} className="text-volt" />} />
        <Stat label="Skipped" value={String(skippedCount)} icon={<SkipForward size={14} className="text-muted-foreground" />} />
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-bold tracking-[0.3em] text-teal">DRILL BREAKDOWN</p>
        <div className="mt-2 space-y-2">
          {drillBlocks.map((b, i) => {
            const l = log[b.block.uid];
            const status = l?.completed ? "DONE" : l?.skipped ? "SKIPPED" : "—";
            const color = l?.completed ? "text-volt" : l?.skipped ? "text-muted-foreground" : "text-muted-foreground";
            return (
              <div key={b.block.uid} className="rounded-2xl border border-border/60 bg-surface p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground">#{i + 1}</span>
                  <h3 className="flex-1 truncate text-sm font-bold text-foreground">{b.drill.name}</h3>
                  <span className={"text-[10px] font-bold tracking-wider " + color}>{status}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Planned {b.block.mins}m · Actual {Math.round((l?.actualSeconds ?? 0) / 60)}m
                </p>
                {l?.notes?.trim() && (
                  <p className="mt-1.5 rounded-lg border border-border/40 bg-surface-2 px-2.5 py-1.5 text-[11px] italic text-muted-foreground">
                    <ListChecks size={10} className="-mt-0.5 mr-1 inline text-volt" />
                    {l.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-2xl border border-border/60 bg-surface py-3.5 text-[12px] font-bold tracking-wide text-foreground">
          BACK TO COACH
        </button>
        <button onClick={onComplete} className="flex-[1.4] rounded-2xl bg-gradient-brand py-3.5 text-[12px] font-bold tracking-wide text-primary-foreground shadow-glow-teal">
          <Megaphone size={14} className="-mt-0.5 mr-1 inline" /> MARK SESSION COMPLETE
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
        {icon} {label.toUpperCase()}
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
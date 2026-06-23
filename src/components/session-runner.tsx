import { useEffect, useState } from "react";
import { CheckCircle2, Pause, Play, RotateCcw, SkipForward, Video, Image as ImageIcon, X, VideoIcon as RecordIcon } from "lucide-react";
import { findDrill } from "@/data/pxf";
import { InSessionRecorder } from "@/components/in-session-recorder";

export type RunnerBlock = { uid: string; drillId: string; mins: number; notes?: string };
export type RunnerSummary = { drillsCompleted: number; totalDrills: number; totalSeconds: number; completedAt: string };

export function SessionRunner({
  title,
  blocks,
  onClose,
  onComplete,
  roster,
  sessionId,
}: {
  title: string;
  blocks: RunnerBlock[];
  onClose: () => void;
  onComplete: (summary: RunnerSummary) => void;
  roster?: { id: string; full_name: string }[];
  sessionId?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0); // total elapsed across all drills
  const [showVideo, setShowVideo] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  const block = blocks[idx];
  const drill = block ? findDrill(block.drillId) : null;

  const [seconds, setSeconds] = useState((block?.mins ?? 0) * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    setSeconds((block?.mins ?? 0) * 60);
    setRunning(true);
    setShowVideo(false);
    setShowDiagram(false);
  }, [idx, block?.mins]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!block || !drill) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">No drills assigned to this session.</p>
          <button onClick={onClose} className="mt-3 rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground">Close</button>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const total = blocks.length;
  const isLast = idx >= total - 1;

  function completeDrill() {
    const next = new Set(done);
    next.add(block!.uid);
    setDone(next);
    if (!isLast) {
      setIdx(idx + 1);
    } else {
      onComplete({
        drillsCompleted: next.size,
        totalDrills: total,
        totalSeconds: elapsed,
        completedAt: new Date().toISOString(),
      });
    }
  }

  function nextDrill() {
    if (!isLast) setIdx(idx + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <button onClick={onClose} aria-label="Close run mode" className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground">
          <X size={16} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-volt">{title.toUpperCase()}</p>
          <p className="text-[11px] text-muted-foreground">Drill {idx + 1} of {total}</p>
        </div>
        <button
          onClick={() => setRecordOpen(true)}
          aria-label="Record clip"
          className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white"
        >
          <RecordIcon size={14} />
        </button>
      </div>
      {recordOpen && (
        <InSessionRecorder
          roster={roster ?? []}
          sessionId={sessionId}
          onClose={() => setRecordOpen(false)}
        />
      )}

      <div className="flex gap-1 px-4 pt-3">
        {blocks.map((b, i) => (
          <div
            key={b.uid}
            className={
              "h-1.5 flex-1 rounded-full " +
              (done.has(b.uid) ? "bg-volt" : i === idx ? "bg-teal" : "bg-surface-2")
            }
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-32">
        <p className="text-[10px] font-bold tracking-wider text-teal">{drill.category.toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">{drill.name}</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">{drill.difficulty} · {drill.ageGroup}</p>
        {drill.blurb && <p className="mt-2 text-sm text-muted-foreground">{drill.blurb}</p>}

        <div className="mt-5 rounded-3xl border border-teal/40 bg-gradient-to-br from-teal/10 to-volt/10 p-6 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-teal">TIMER</p>
          <p className="mt-2 font-mono text-6xl font-bold text-foreground tabular-nums">{mm}:{ss}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-5 py-2 text-[12px] font-bold text-primary-foreground shadow-glow-teal"
            >
              {running ? <><Pause size={14} /> PAUSE</> : <><Play size={14} /> RESUME</>}
            </button>
            <button
              onClick={() => setSeconds(block.mins * 60)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface text-foreground"
              aria-label="Reset timer"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => { setShowVideo((v) => !v); setShowDiagram(false); }}
            className={"flex items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] font-bold tracking-wide " + (showVideo ? "bg-teal/20 text-teal" : "border border-border/60 bg-surface text-foreground")}
          >
            <Video size={14} /> VIDEO
          </button>
          <button
            onClick={() => { setShowDiagram((v) => !v); setShowVideo(false); }}
            className={"flex items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] font-bold tracking-wide " + (showDiagram ? "bg-volt/20 text-volt" : "border border-border/60 bg-surface text-foreground")}
          >
            <ImageIcon size={14} /> DIAGRAM
          </button>
        </div>

        {showVideo && (
          <div className="mt-3 grid aspect-video place-items-center rounded-2xl border border-border/60 bg-surface-2 text-muted-foreground">
            <div className="text-center">
              <Video size={28} className="mx-auto text-teal" />
              <p className="mt-2 text-[12px]">Video demonstration</p>
            </div>
          </div>
        )}
        {showDiagram && (
          <div className="mt-3 grid aspect-video place-items-center rounded-2xl border border-border/60 bg-surface-2 text-muted-foreground">
            <div className="text-center">
              <ImageIcon size={28} className="mx-auto text-volt" />
              <p className="mt-2 text-[12px]">Drill diagram</p>
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="text-[10px] font-bold tracking-[0.3em] text-volt">COACHING POINTS</p>
          <ul className="mt-2 space-y-2">
            {drill.notes.map((n, i) => (
              <li key={i} className="flex gap-2 rounded-xl border border-border/60 bg-surface p-3">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
                <span className="text-[13px] text-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </div>

        {block.notes && (
          <div className="mt-4 rounded-2xl border border-volt/30 bg-volt/10 p-3">
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">SESSION NOTES</p>
            <p className="mt-1 text-[13px] text-foreground">{block.notes}</p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2">
          <button
            onClick={nextDrill}
            disabled={isLast}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-surface py-3 text-[11px] font-bold tracking-wide text-foreground disabled:opacity-40"
          >
            <SkipForward size={14} /> NEXT
          </button>
          <button
            onClick={completeDrill}
            className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl bg-gradient-brand py-3 text-[11px] font-bold tracking-wide text-primary-foreground shadow-glow-teal"
          >
            <CheckCircle2 size={14} /> {isLast ? "COMPLETE SESSION" : "NEXT DRILL"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SessionSummary({
  title,
  summary,
  onDone,
}: {
  title: string;
  summary: RunnerSummary;
  onDone: () => void;
}) {
  const mins = Math.floor(summary.totalSeconds / 60);
  const secs = summary.totalSeconds % 60;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-brand text-primary-foreground">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal">Session complete</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">{title}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-display text-2xl font-bold text-foreground">{mins}:{String(secs).padStart(2, "0")}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total time</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-display text-2xl font-bold text-foreground">{summary.drillsCompleted}/{summary.totalDrills}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Drills done</p>
          </div>
        </div>
        <button
          onClick={onDone}
          className="w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export type SessionRunRecord = {
  completedAt: string;
  drillsCompleted: number;
  totalDrills: number;
  totalSeconds: number;
};

export function readCampCompletions(campId: string): Record<string, SessionRunRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`pxf:camp-completions:${campId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function writeCampCompletion(campId: string, sessionId: string, record: SessionRunRecord) {
  if (typeof window === "undefined") return;
  const cur = readCampCompletions(campId);
  cur[sessionId] = record;
  window.localStorage.setItem(`pxf:camp-completions:${campId}`, JSON.stringify(cur));
}
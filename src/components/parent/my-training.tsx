import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

export type TrainingSession = {
  idx: number;
  title: string;
  minutes: number;
};

export type TrainingProgram = {
  id: string;
  name: string;
  coach: string;
  team: string;
  totalSessions: number;
  completed: number;
  sessions: TrainingSession[];
  completedDate?: string;
};

export const MOCK_ACTIVE: TrainingProgram[] = [
  {
    id: "prog-shooting-foundations",
    name: "Shooting Foundations",
    coach: "Coach Davis",
    team: "Elite Demo Team",
    totalSessions: 4,
    completed: 2,
    sessions: [
      { idx: 1, title: "Grip & Stance", minutes: 20 },
      { idx: 2, title: "Wrist Shot Basics", minutes: 20 },
      { idx: 3, title: "Release Mechanics", minutes: 25 },
      { idx: 4, title: "Game-Speed Reps", minutes: 25 },
    ],
  },
  {
    id: "prog-stick-skills-starter",
    name: "Stick Skills Starter",
    coach: "Coach Davis",
    team: "Elite Demo Team",
    totalSessions: 4,
    completed: 1,
    sessions: [
      { idx: 1, title: "Puck Control", minutes: 20 },
      { idx: 2, title: "Deking Patterns", minutes: 20 },
      { idx: 3, title: "Toe Drags", minutes: 20 },
      { idx: 4, title: "Combo Sequences", minutes: 25 },
    ],
  },
];

export const MOCK_COMPLETED: TrainingProgram[] = [
  {
    id: "prog-edge-mastery",
    name: "Edge Mastery Series",
    coach: "Coach Davis",
    team: "Elite Demo Team",
    totalSessions: 4,
    completed: 4,
    sessions: [],
    completedDate: "Jun 28",
  },
];

const KEY = "pxf.training.progress.v1";

export function loadTrainingProgress(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch { return {}; }
}

export function setTrainingProgress(programId: string, completed: number) {
  if (typeof window === "undefined") return;
  const cur = loadTrainingProgress();
  cur[programId] = completed;
  window.localStorage.setItem(KEY, JSON.stringify(cur));
}

export function getProgram(programId: string): TrainingProgram | undefined {
  return [...MOCK_ACTIVE, ...MOCK_COMPLETED].find((p) => p.id === programId);
}

export function MyTraining() {
  const overrides = loadTrainingProgress();
  const active = MOCK_ACTIVE.map((p) => ({ ...p, completed: overrides[p.id] ?? p.completed }));
  const completed = MOCK_COMPLETED.map((p) => ({ ...p, completed: overrides[p.id] ?? p.completed }));
  // Move any active whose completed >= total into completed list dynamically
  const stillActive = active.filter((p) => p.completed < p.totalSessions);
  const finished = [
    ...completed,
    ...active.filter((p) => p.completed >= p.totalSessions).map((p) => ({ ...p, completedDate: "Today" })),
  ];
  const [showDone, setShowDone] = useState(false);

  return (
    <div className="pb-6">
      <h2 className="text-lg font-bold text-foreground">My Training</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Programs assigned by your coach</p>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Active</p>
      <div className="mt-2 space-y-3">
        {stillActive.map((p) => (
          <ActiveCard key={p.id} program={p} />
        ))}
        {stillActive.length === 0 && (
          <p className="rounded-2xl border border-border/60 bg-surface p-4 text-center text-xs text-muted-foreground">
            No active programs. Your coach will assign one soon.
          </p>
        )}
      </div>

      {finished.length > 0 && (
        <>
          <button
            onClick={() => setShowDone((s) => !s)}
            className="mt-6 flex w-full items-center justify-between text-left"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Completed
            </p>
            <span className="flex items-center gap-1 text-[11px] font-bold text-teal">
              {showDone ? "Hide" : `Show (${finished.length})`}
              {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </button>
          {showDone && (
            <div className="mt-2 space-y-3">
              {finished.map((p) => (
                <CompletedCard key={p.id} program={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActiveCard({ program }: { program: TrainingProgram }) {
  const next = program.sessions[program.completed];
  const pct = (program.completed / program.totalSessions) * 100;
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-4">
      <p className="text-sm font-bold text-foreground">{program.name}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {program.coach} · {program.team}
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
        {program.completed} of {program.totalSessions} sessions complete
      </p>

      {next && (
        <Link
          to="/parent/training-session/$programId/$sessionIdx"
          params={{ programId: program.id, sessionIdx: String(next.idx) }}
          className="mt-3 flex items-center gap-2 rounded-xl bg-background p-2.5"
        >
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal/15 text-teal">
            <Play size={13} fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">
              Session {next.idx} · {next.title}
            </p>
            <p className="text-[10px] text-muted-foreground">{next.minutes} min</p>
          </div>
        </Link>
      )}

      <div className="mt-3 flex gap-2">
        {next && (
          <Link
            to="/parent/training-session/$programId/$sessionIdx"
            params={{ programId: program.id, sessionIdx: String(next.idx) }}
            className="flex-1 rounded-full bg-gradient-brand py-2 text-center text-xs font-bold text-primary-foreground"
          >
            Continue →
          </Link>
        )}
        <button className="flex-1 rounded-full border border-border py-2 text-xs font-bold text-foreground">
          View Program
        </button>
      </div>
    </div>
  );
}

function CompletedCard({ program }: { program: TrainingProgram }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-4 opacity-90">
      <p className="text-sm font-bold text-foreground">{program.name}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {program.coach} · {program.team}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-teal">
        <CheckCircle2 size={13} /> Completed {program.completedDate ?? ""} · {program.totalSessions}/{program.totalSessions} sessions
      </p>
      <button className="mt-3 w-full rounded-full border border-border py-2 text-xs font-bold text-foreground">
        View Program
      </button>
    </div>
  );
}
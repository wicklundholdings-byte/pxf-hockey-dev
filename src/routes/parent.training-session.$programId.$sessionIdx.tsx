import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Play } from "lucide-react";
import {
  getProgram, loadTrainingProgress, setTrainingProgress,
} from "@/components/parent/my-training";

export const Route = createFileRoute("/parent/training-session/$programId/$sessionIdx")({
  head: () => ({
    meta: [
      { title: "Session — My Training" },
      { name: "description", content: "Complete your assigned training session." },
    ],
  }),
  component: SessionDetail,
});

const EXERCISES = [
  { id: "e1", name: "Wrist Shot Release", sets: 3, reps: 10 },
  { id: "e2", name: "Snap Shot Sequence", sets: 3, reps: 10 },
  { id: "e3", name: "One-Timer Setup", sets: 2, reps: 8 },
];

function SessionDetail() {
  const { programId, sessionIdx } = Route.useParams();
  const navigate = useNavigate();
  const program = getProgram(programId);
  const idx = Number(sessionIdx);
  const session = program?.sessions.find((s) => s.idx === idx);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  if (!program || !session) {
    return (
      <div className="min-h-screen bg-background p-5">
        <Link to="/parent/playbook" className="flex items-center gap-1 text-sm font-semibold text-teal">
          <ChevronLeft size={16} /> My Training
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  const allChecked = EXERCISES.every((e) => checked.has(e.id));
  const toggle = (id: string) => setChecked((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const markComplete = () => {
    const cur = loadTrainingProgress()[program.id] ?? program.completed;
    setTrainingProgress(program.id, Math.max(cur, idx));
    setDone(true);
  };

  if (done) {
    const completed = Math.max(loadTrainingProgress()[program.id] ?? 0, idx);
    const remaining = program.totalSessions - completed;
    return (
      <div className="min-h-screen bg-background px-5 pb-16 pt-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mt-16 grid h-20 w-20 place-items-center rounded-full bg-teal/15 text-4xl">
            🎉
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Session {idx} Complete!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {remaining === 0
              ? "Program complete — nice work!"
              : `${remaining} session${remaining === 1 ? "" : "s"} remaining in this program`}
          </p>
          <button
            onClick={() => navigate({ to: "/parent/playbook" })}
            className="mt-8 w-full rounded-full bg-teal py-3 text-sm font-bold text-background"
          >
            Back to My Training
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/parent/playbook" className="flex items-center gap-1 text-sm font-semibold text-teal">
          <ChevronLeft size={18} /> My Training
        </Link>
      </div>

      <div className="px-4 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {program.name} · Session {session.idx}
        </p>

        <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Play size={40} fill="currentColor" />
          </div>
        </div>

        <h1 className="mt-4 text-lg font-bold text-foreground">{session.title}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {session.minutes} min · Equipment: stick, puck, net
        </p>
        <p className="mt-3 text-sm text-foreground">
          Focus on quick, controlled reps. Reset between each set and lock in
          your release form before adding speed.
        </p>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Exercises
        </p>
        <div className="mt-2 space-y-2">
          {EXERCISES.map((e) => {
            const on = checked.has(e.id);
            return (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                className={
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left " +
                  (on ? "border-teal bg-teal/10" : "border-border bg-surface")
                }
              >
                <span
                  className={
                    "grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 " +
                    (on ? "border-teal bg-teal text-background" : "border-border")
                  }
                >
                  {on && "✓"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.sets} sets · {e.reps} reps
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-[480px]">
          <button
            onClick={markComplete}
            disabled={!allChecked}
            className="w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            Mark Session Complete
          </button>
        </div>
      </div>
    </div>
  );
}
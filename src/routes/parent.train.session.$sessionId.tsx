import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, CheckCircle2, ChevronRight, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { completeSession } from "@/lib/dryland.functions";

// TODO(future): replace per-drill videos with a single full-length session
// video that exposes chapter markers per drill. Keep this runner shape so the
// per-drill UI (sets/reps/instruction) can drive chapter jumps.

type Exercise = {
  id: string;
  display_order: number;
  name: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  instruction_text: string | null;
  video_url: string | null;
};
type SessionRow = { id: string; name: string; program_id: string };

export const Route = createFileRoute("/parent/train/session/$sessionId")({
  head: () => ({ meta: [{ title: "Session — PXF Hockey" }] }),
  component: SessionRunner,
});

function SessionRunner() {
  const { sessionId } = useParams({ from: "/parent/train/session/$sessionId" });
  const { user } = useAuth();
  const complete = useServerFn(completeSession);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [done, setDone] = useState(false);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const startRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("dryland_sessions").select("id, name, program_id").eq("id", sessionId).maybeSingle();
      setSession((s ?? null) as SessionRow | null);
      const { data: ex } = await supabase
        .from("dryland_exercises")
        .select("*")
        .eq("session_id", sessionId)
        .order("display_order");
      setExercises((ex ?? []) as Exercise[]);
      startRef.current = Date.now();
    })();
  }, [sessionId]);

  useEffect(() => {
    if (!user?.id || !session?.program_id) return;
    (async () => {
      const { data: kids } = await supabase.from("attendees").select("id").eq("owner_id", user.id);
      const ids = (kids ?? []).map((k) => k.id);
      if (!ids.length) return;
      const { data: enr } = await supabase
        .from("athlete_program_enrollments")
        .select("id, athlete_id")
        .in("athlete_id", ids)
        .eq("program_id", session.program_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      if (enr?.[0]) {
        setEnrollmentId(enr[0].id);
        setAthleteId(enr[0].athlete_id);
      } else if (ids[0]) {
        setAthleteId(ids[0]);
      }
    })();
  }, [user?.id, session?.program_id]);

  useEffect(() => {
    if (!resting) return;
    if (restLeft <= 0) {
      setResting(false);
      return;
    }
    const t = setTimeout(() => setRestLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, restLeft]);

  const current = exercises[idx];
  const total = exercises.length;

  const next = () => {
    if (idx + 1 >= total) {
      finish();
      return;
    }
    if (current?.rest_seconds && current.rest_seconds > 0) {
      setRestLeft(current.rest_seconds);
      setResting(true);
    }
    setIdx((i) => i + 1);
  };

  const finish = async () => {
    setDone(true);
    if (athleteId) {
      try {
        await complete({
          data: {
            athleteId,
            sessionId,
            enrollmentId: enrollmentId ?? undefined,
            durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
            notes: notes || undefined,
          },
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!session) return <div className="px-5 pt-6 text-sm text-muted-foreground">Loading…</div>;

  if (done) {
    const mins = Math.round((Date.now() - startRef.current) / 60000);
    return (
      <div className="px-5 pt-8 pb-32">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-brand">
          <CheckCircle2 size={28} className="text-primary-foreground" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-foreground">Session complete</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{total} drills · ~{mins} min</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes && athleteId) {
              complete({ data: { athleteId, sessionId, enrollmentId: enrollmentId ?? undefined, notes } }).catch(() => {});
            }
          }}
          placeholder="Add a note (optional)…"
          className="mt-6 h-24 w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
        />
        <Link to="/parent/train" className="mt-5 block w-full rounded-full bg-gradient-brand py-3 text-center text-sm font-bold text-primary-foreground">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="flex items-center gap-2 px-5 pt-5">
        <Link to="/parent/train" className="grid h-9 w-9 place-items-center rounded-full bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <p className="flex-1 truncate text-sm font-semibold text-foreground">{session.name}</p>
        <button onClick={() => setMuted((m) => !m)} className="grid h-9 w-9 place-items-center rounded-full bg-surface">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      <div className="px-5 pt-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>Drill {idx + 1} of {total}</span>
          <span>{Math.round(((idx) / Math.max(1, total)) * 100)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${(idx / Math.max(1, total)) * 100}%` }} />
        </div>
      </div>

      {resting ? (
        <div className="px-5 pt-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rest</p>
          <p className="mt-2 font-display text-6xl font-bold text-volt">{restLeft}s</p>
          <button onClick={() => setResting(false)} className="mt-6 rounded-full bg-surface px-5 py-2 text-xs font-bold text-foreground">
            Skip rest
          </button>
        </div>
      ) : current ? (
        <div className="px-5 pt-4">
          <div className="relative overflow-hidden rounded-3xl bg-surface-2" style={{ aspectRatio: "16/9" }}>
            {current.video_url ? (
              <video
                ref={videoRef}
                key={current.id}
                src={current.video_url}
                autoPlay
                loop
                muted={muted}
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">No demo video</div>
            )}
          </div>
          <button
            onClick={() => videoRef.current?.play()}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
          >
            <Repeat size={11} /> Re-watch
          </button>

          <h2 className="mt-4 text-xl font-bold text-foreground">{current.name}</h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-teal">
            {current.duration_seconds
              ? `${current.duration_seconds}s hold`
              : `${current.sets ?? 3} sets · ${current.reps ?? 10} reps`}
            {current.rest_seconds ? ` · ${current.rest_seconds}s rest` : ""}
          </p>
          {current.instruction_text && (
            <p className="mt-3 text-sm text-muted-foreground">{current.instruction_text}</p>
          )}
        </div>
      ) : null}

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background/95 p-4 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),1rem)]">
        <button
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
        >
          {idx + 1 >= total ? "Finish session" : "Complete & Next"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
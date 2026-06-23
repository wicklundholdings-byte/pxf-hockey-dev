import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Dumbbell, Play, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { enrollAthlete } from "@/lib/dryland.functions";

type Program = {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  age_group_min: number;
  age_group_max: number;
  description: string | null;
  session_count: number;
  avg_session_minutes: number;
};
type Session = { id: string; name: string; duration_minutes: number; display_order: number; week_number: number };
type Kid = { id: string; full_name: string };

const DAYS = [
  { n: 1, l: "Mon" },
  { n: 2, l: "Tue" },
  { n: 3, l: "Wed" },
  { n: 4, l: "Thu" },
  { n: 5, l: "Fri" },
  { n: 6, l: "Sat" },
  { n: 0, l: "Sun" },
];

export const Route = createFileRoute("/parent/train/$programId")({
  head: () => ({ meta: [{ title: "Program — PXF Hockey" }] }),
  component: ProgramDetail,
});

function ProgramDetail() {
  const { programId } = useParams({ from: "/parent/train/$programId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const enroll = useServerFn(enrollAthlete);

  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [sheet, setSheet] = useState(false);
  const [selectedKid, setSelectedKid] = useState<string>("");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("dryland_programs").select("*").eq("id", programId).maybeSingle();
      setProgram((p ?? null) as Program | null);
      const { data: s } = await supabase
        .from("dryland_sessions")
        .select("id, name, duration_minutes, display_order, week_number")
        .eq("program_id", programId)
        .order("display_order");
      setSessions((s ?? []) as Session[]);
    })();
  }, [programId]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("attendees").select("id, full_name").eq("owner_id", user.id);
      setKids((data ?? []) as Kid[]);
      if (data?.[0]) setSelectedKid(data[0].id);
    })();
  }, [user?.id]);

  const submit = async () => {
    if (!selectedKid || !program) return;
    setBusy(true);
    try {
      await enroll({ data: { athleteId: selectedKid, programId: program.id, startDate, trainingDays: days, role: "parent" } });
      const kidName = kids.find((k) => k.id === selectedKid)?.full_name ?? "your athlete";
      setDone(`${program.name} added to ${kidName}'s schedule starting ${new Date(startDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`);
      setSheet(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (!program) return <div className="px-5 pt-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="pb-32">
      <div className="flex items-center gap-2 px-5 pt-5">
        <Link to="/parent/train" className="grid h-9 w-9 place-items-center rounded-full bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PROGRAM</p>
      </div>

      <div className="px-5 pt-3">
        <div className="h-32 rounded-3xl bg-gradient-brand" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">{program.name}</h1>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-teal">{program.category.replace("_", " ")} · {program.difficulty}</p>
        <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Ages {program.age_group_min}-{program.age_group_max}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{program.avg_session_minutes}m / session</span>
          <span>{program.session_count} sessions</span>
        </p>
        {program.description && <p className="mt-3 text-sm text-muted-foreground">{program.description}</p>}

        {done ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-teal/40 bg-teal/10 p-4">
            <CheckCircle2 size={18} className="mt-0.5 text-teal" />
            <p className="text-sm text-foreground">{done}</p>
          </div>
        ) : (
          <button
            onClick={() => setSheet(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
          >
            <Play size={16} fill="currentColor" /> Start This Program
          </button>
        )}

        <h2 className="mt-7 text-sm font-bold text-foreground">Sessions</h2>
        <ol className="mt-2 space-y-2">
          {sessions.map((s, i) => (
            <li key={s.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface p-3">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-bold text-foreground">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">~{s.duration_minutes} min</p>
                </div>
              </div>
              <Link
                to="/parent/train/session/$sessionId"
                params={{ sessionId: s.id }}
                className="grid h-8 w-8 place-items-center rounded-full bg-teal text-background"
                aria-label="Preview session"
              >
                <Play size={12} fill="currentColor" />
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSheet(false)}>
          <div className="w-full max-w-[480px] rounded-t-3xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <h3 className="text-lg font-bold text-foreground">Start program</h3>

            {kids.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Add an athlete to your profile first.</p>
            ) : (
              <>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlete</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {kids.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setSelectedKid(k.id)}
                      className={"rounded-full px-3 py-1.5 text-xs font-bold " + (selectedKid === k.id ? "bg-teal text-background" : "bg-surface text-muted-foreground")}
                    >
                      {k.full_name}
                    </button>
                  ))}
                </div>

                <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Training days</label>
                <div className="mt-2 flex gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      key={d.n}
                      onClick={() => setDays((prev) => (prev.includes(d.n) ? prev.filter((x) => x !== d.n) : [...prev, d.n]))}
                      className={"h-9 flex-1 rounded-lg text-xs font-bold " + (days.includes(d.n) ? "bg-volt text-background" : "bg-surface text-muted-foreground")}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>

                <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                />

                <button
                  disabled={busy || !selectedKid || days.length === 0}
                  onClick={submit}
                  className="mt-5 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Adding…" : "Confirm"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
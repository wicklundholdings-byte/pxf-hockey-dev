import { useEffect, useState } from "react";
import { Dumbbell, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { recommendProgram } from "@/lib/dryland.functions";

type Program = { id: string; name: string; category: string; difficulty: string };
type Enrollment = { id: string; status: string; start_date: string; dryland_programs: { name: string } | null };

export function DrylandCoachPanel({ athleteId }: { athleteId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [completionCount, setCompletionCount] = useState(0);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [open, setOpen] = useState(false);
  const [pickProgram, setPickProgram] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const rec = useServerFn(recommendProgram);

  useEffect(() => {
    (async () => {
      const { data: enr } = await supabase
        .from("athlete_program_enrollments")
        .select("id, status, start_date, dryland_programs(name)")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });
      setEnrollments((enr ?? []) as unknown as Enrollment[]);
      const { count } = await supabase
        .from("athlete_session_completions")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", athleteId);
      setCompletionCount(count ?? 0);
    })();
  }, [athleteId]);

  const openSheet = async () => {
    if (!programs.length) {
      const { data } = await supabase.from("dryland_programs").select("id, name, category, difficulty").eq("is_published", true);
      setPrograms((data ?? []) as Program[]);
      if (data?.[0]) setPickProgram(data[0].id);
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!pickProgram) return;
    setBusy(true);
    try {
      await rec({ data: { athleteId, programId: pickProgram, message: message || undefined } });
      setSent(true);
      setTimeout(() => setOpen(false), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
        <Dumbbell size={11} /> Dryland
      </h3>
      {enrollments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No dryland programs enrolled yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {enrollments.slice(0, 3).map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-surface px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-foreground">{e.dryland_programs?.name ?? "Program"}</span>
              <span className="text-[9px] uppercase text-muted-foreground">{e.status}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Activity size={10} /> {completionCount} sessions completed
      </p>
      <button
        onClick={openSheet}
        className="mt-3 w-full rounded-full bg-gradient-brand py-1.5 text-[11px] font-bold text-primary-foreground"
      >
        Recommend a program
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[480px] rounded-t-3xl bg-background p-5" onClick={(ev) => ev.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <h3 className="text-lg font-bold text-foreground">Recommend a dryland program</h3>
            {sent ? (
              <p className="mt-4 text-sm text-teal">Sent. Parent will see this in their Train tab.</p>
            ) : (
              <>
                <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Program</label>
                <select
                  value={pickProgram}
                  onChange={(e) => setPickProgram(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.difficulty}</option>
                  ))}
                </select>
                <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Try this 4-session block to keep momentum going."
                  className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
                />
                <button
                  disabled={busy || !pickProgram}
                  onClick={submit}
                  className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send recommendation"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
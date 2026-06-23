import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, Target, Zap, Clock, ChevronRight, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Program = {
  id: string;
  name: string;
  category: "stick_skills" | "shooting" | "strength_explosiveness";
  difficulty: "beginner" | "intermediate" | "advanced";
  age_group_min: number;
  age_group_max: number;
  description: string | null;
  session_count: number;
  avg_session_minutes: number;
};
type Recommendation = { id: string; program_id: string; message: string | null; status: string };

const CATEGORIES = [
  { id: "all", label: "All", icon: Dumbbell },
  { id: "stick_skills", label: "Stick Skills", icon: Target },
  { id: "shooting", label: "Shooting", icon: Zap },
  { id: "strength_explosiveness", label: "Strength", icon: Dumbbell },
] as const;

const CAT_LABEL: Record<Program["category"], string> = {
  stick_skills: "Stick Skills",
  shooting: "Shooting",
  strength_explosiveness: "Strength & Explosiveness",
};

export const Route = createFileRoute("/parent/train")({
  head: () => ({ meta: [{ title: "Train — PXF Hockey" }] }),
  component: TrainLibrary,
});

function TrainLibrary() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [diff, setDiff] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [activeCount, setActiveCount] = useState(0);
  const [recs, setRecs] = useState<(Recommendation & { program: Program | null; athlete_id: string; athlete_name: string })[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("dryland_programs")
        .select("*")
        .eq("is_published", true)
        .order("created_at");
      setPrograms((data ?? []) as Program[]);
    })();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: kids } = await supabase.from("attendees").select("id, full_name").eq("owner_id", user.id);
      const kidIds = (kids ?? []).map((k) => k.id);
      if (!kidIds.length) return;
      const { count } = await supabase
        .from("athlete_program_enrollments")
        .select("id", { count: "exact", head: true })
        .in("athlete_id", kidIds)
        .eq("status", "active");
      setActiveCount(count ?? 0);
      const { data: recRows } = await supabase
        .from("program_recommendations")
        .select("id, program_id, message, status, athlete_id")
        .in("athlete_id", kidIds)
        .eq("status", "pending");
      if (recRows?.length) {
        const progIds = Array.from(new Set(recRows.map((r) => r.program_id)));
        const { data: progs } = await supabase.from("dryland_programs").select("*").in("id", progIds);
        const kidMap = new Map((kids ?? []).map((k) => [k.id, k.full_name]));
        setRecs(
          recRows.map((r) => ({
            ...r,
            program: (progs ?? []).find((p) => p.id === r.program_id) as Program | null,
            athlete_name: kidMap.get(r.athlete_id) ?? "Athlete",
          })),
        );
      }
    })();
  }, [user?.id]);

  const filtered = programs.filter((p) => (cat === "all" || p.category === cat) && (diff === "all" || p.difficulty === diff));

  return (
    <div className="px-5 pt-5">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DRYLAND LIBRARY</p>
      <h1 className="mt-1 text-3xl font-bold text-foreground">Train</h1>
      <p className="mt-1 text-sm text-muted-foreground">Year-round training between camps. Browse, enroll, train.</p>

      {activeCount === 0 && (
        <div className="mt-4 rounded-2xl border border-volt/40 bg-volt/10 p-4">
          <p className="text-sm font-semibold text-foreground">No training program scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">Pick a free dryland program below to start building habits between camps.</p>
        </div>
      )}

      {recs.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold tracking-wider text-volt">COACH RECOMMENDED</p>
          <div className="mt-2 space-y-2">
            {recs.map((r) => (
              <Link
                key={r.id}
                to="/parent/train/$programId"
                params={{ programId: r.program_id }}
                className="block rounded-2xl border border-volt/40 bg-surface p-3"
              >
                <p className="text-xs text-muted-foreground">Your coach recommended for {r.athlete_name}</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">{r.program?.name ?? "Program"}</p>
                {r.message && <p className="mt-1 text-xs text-muted-foreground">"{r.message}"</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={"flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold " + (cat === c.id ? "bg-teal text-background" : "bg-surface text-muted-foreground")}
            >
              <Icon size={13} /> {c.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <Filter size={12} className="text-muted-foreground" />
        {(["all", "beginner", "intermediate", "advanced"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDiff(d)}
            className={"rounded-full px-2 py-0.5 font-semibold " + (diff === d ? "bg-volt/20 text-volt" : "text-muted-foreground")}
          >
            {d === "all" ? "Any level" : d}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 pb-6">
        {filtered.map((p) => (
          <Link
            key={p.id}
            to="/parent/train/$programId"
            params={{ programId: p.id }}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-4"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand">
              <Dumbbell size={20} className="text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
              </div>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-teal">{CAT_LABEL[p.category]} · {p.difficulty}</p>
              <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>Ages {p.age_group_min}-{p.age_group_max}</span>
                <span className="flex items-center gap-1"><Clock size={11} />{p.avg_session_minutes}m</span>
                <span>{p.session_count} sessions</span>
              </p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No programs match those filters.</p>
        )}
      </div>
    </div>
  );
}
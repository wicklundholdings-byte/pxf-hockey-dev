import { useEffect, useState } from "react";
import { Dumbbell, Target, Zap, Clock, Filter, Check, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { bulkRecommendProgram } from "@/lib/dryland.functions";

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
type Athlete = { id: string; full_name: string; age_group: string | null };

const CATS = [
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

export function CoachDrylandLibrary() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [diff, setDiff] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [picked, setPicked] = useState<Program | null>(null);

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

  const filtered = programs.filter(
    (p) => (cat === "all" || p.category === cat) && (diff === "all" || p.difficulty === diff),
  );

  return (
    <div className="pb-6">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DRYLAND LIBRARY</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Browse programs and assign to multiple athletes in a few clicks.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold " +
                (cat === c.id ? "bg-teal text-background" : "bg-surface text-muted-foreground")
              }
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
            className={
              "rounded-full px-2 py-0.5 font-semibold " +
              (diff === d ? "bg-volt/20 text-volt" : "text-muted-foreground")
            }
          >
            {d === "all" ? "Any level" : d}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border/60 bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                <Dumbbell size={20} className="text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-teal">
                  {CAT_LABEL[p.category]} · {p.difficulty}
                </p>
                <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Ages {p.age_group_min}-{p.age_group_max}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{p.avg_session_minutes}m</span>
                  <span>{p.session_count} sessions</span>
                </p>
              </div>
            </div>
            {p.description && <p className="mt-2 text-[11px] text-muted-foreground">{p.description}</p>}
            <button
              onClick={() => setPicked(p)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-brand py-2 text-xs font-bold text-primary-foreground"
            >
              <Users size={13} /> Assign to athletes
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No programs match those filters.</p>
        )}
      </div>

      {picked && user?.id && (
        <AssignSheet program={picked} ownerId={user.id} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}

function AssignSheet({ program, ownerId, onClose }: { program: Program; ownerId: string; onClose: () => void }) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const bulk = useServerFn(bulkRecommendProgram);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("attendees")
        .select("id, full_name, age_group")
        .eq("owner_id", ownerId)
        .order("full_name");
      setAthletes((data ?? []) as Athlete[]);
    })();
  }, [ownerId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visible = athletes.filter((a) => a.full_name.toLowerCase().includes(query.toLowerCase()));
  const allVisibleSelected = visible.length > 0 && visible.every((a) => selected.has(a.id));

  const submit = async () => {
    if (!selected.size) return;
    setBusy(true);
    try {
      const res = await bulk({
        data: { athleteIds: Array.from(selected), programId: program.id, message: message || undefined },
      });
      setSentCount(res.count);
      setTimeout(onClose, 1400);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl bg-background p-5" onClick={(ev) => ev.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal">{CAT_LABEL[program.category]}</p>
        <h3 className="mt-1 text-lg font-bold text-foreground">Assign · {program.name}</h3>

        {sentCount !== null ? (
          <p className="mt-6 text-sm text-teal">
            Sent to {sentCount} athlete{sentCount === 1 ? "" : "s"}. Parents will see it in their Train tab.
          </p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
              <Search size={14} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roster"
                className="flex-1 bg-transparent text-sm text-foreground outline-none"
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {selected.size} selected
              </p>
              <button
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allVisibleSelected) visible.forEach((a) => next.delete(a.id));
                    else visible.forEach((a) => next.add(a.id));
                    return next;
                  });
                }}
                className="text-[11px] font-bold text-teal"
              >
                {allVisibleSelected ? "Clear shown" : "Select all shown"}
              </button>
            </div>

            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {visible.map((a) => {
                const on = selected.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    className={
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left " +
                      (on ? "border-teal bg-teal/10" : "border-border bg-surface")
                    }
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.full_name}</p>
                      {a.age_group && <p className="text-[10px] text-muted-foreground">{a.age_group}</p>}
                    </div>
                    {on && <Check size={16} className="text-teal" />}
                  </button>
                );
              })}
              {visible.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No athletes found.</p>
              )}
            </div>

            <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Try this block before next camp."
              className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
            />

            <button
              disabled={busy || !selected.size}
              onClick={submit}
              className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Sending…" : `Send to ${selected.size} athlete${selected.size === 1 ? "" : "s"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
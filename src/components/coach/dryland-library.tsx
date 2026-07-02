import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Dumbbell, Target, Zap, Clock, Filter, Check, Search, Users, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { bulkRecommendProgram } from "@/lib/dryland.functions";
import {
  MOCK_CAMPS, MOCK_TEAMS, MOCK_ROSTER, saveAssignment, loadAssignments,
  type StoredAssignment,
} from "@/lib/dryland-assignments";

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
type Athlete = { id: string; full_name: string };

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
  const [assignments, setAssignments] = useState<StoredAssignment[]>([]);

  useEffect(() => setAssignments(loadAssignments()), [picked]);

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

      {assignments.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your Assignments</p>
          <div className="mt-2 space-y-2">
            {assignments.slice(0, 5).map((a) => (
              <Link
                key={a.id}
                to="/dryland-progress/$assignmentId"
                params={{ assignmentId: a.id }}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                  <Dumbbell size={16} className="text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{a.programName}</p>
                  <p className="text-[11px] text-muted-foreground">{a.targetLabel} · {new Date(a.startDate).toLocaleDateString()}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

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
  const navigate = useNavigate();
  const bulk = useServerFn(bulkRecommendProgram);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [who, setWho] = useState<"camp" | "team" | "individual">("team");
  const [campId, setCampId] = useState<string>(MOCK_CAMPS[0].id);
  const [teamId, setTeamId] = useState<string>(MOCK_TEAMS[0].id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState(
    "Your coach has assigned you a new training program. Complete each session and track your progress in My Training.",
  );
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const visible = useMemo(
    () => MOCK_ROSTER.filter((a) => a.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const allVisibleSelected = visible.length > 0 && visible.every((a) => selected.has(a.id));
  const toggle = (id: string) => setSelected((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const targetLabel = () => {
    if (who === "camp") return MOCK_CAMPS.find((c) => c.id === campId)?.name ?? "Camp";
    if (who === "team") return MOCK_TEAMS.find((t) => t.id === teamId)?.name ?? "Team";
    return `${selected.size} athlete${selected.size === 1 ? "" : "s"}`;
  };

  const canNext = () => {
    if (step === 1) {
      if (who === "camp") return !!campId;
      if (who === "team") return !!teamId;
      return selected.size > 0;
    }
    return true;
  };

  const submit = async () => {
    setBusy(true);
    try {
      // Best-effort backend call for individual selections; ignore failures.
      if (who === "individual" && selected.size > 0) {
        try {
          await bulk({
            data: {
              athleteIds: Array.from(selected),
              programId: program.id,
              message: message || undefined,
            },
          });
        } catch (e) { console.warn("bulk assign failed", e); }
      }
      const athleteIds = who === "individual"
        ? Array.from(selected)
        : MOCK_ROSTER.map((a) => a.id);
      const assignment = saveAssignment({
        programId: program.id,
        programName: program.name,
        who,
        targetLabel: targetLabel(),
        startDate,
        message,
        athleteIds,
        sessionCount: program.session_count || 4,
      });
      setToast(`${program.name} assigned to ${targetLabel()} ✓`);
      setTimeout(() => {
        onClose();
        navigate({ to: "/dryland-progress/$assignmentId", params: { assignmentId: assignment.id } });
      }, 900);
    } finally {
      setBusy(false);
    }
    // ownerId reserved for future scoping
    void ownerId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-background p-5" onClick={(ev) => ev.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal">{CAT_LABEL[program.category]}</p>
        <h3 className="mt-1 text-lg font-bold text-foreground">Assign · {program.name}</h3>

        <div className="mt-3 flex items-center gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={"h-1 flex-1 rounded-full " + (n <= step ? "bg-teal" : "bg-border")}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Step {step} of 3
        </p>

        {toast ? (
          <p className="mt-6 rounded-xl bg-teal/10 p-4 text-sm font-semibold text-teal">{toast}</p>
        ) : step === 1 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-bold text-foreground">Assign to</p>
            <RadioRow label="All athletes at a camp" checked={who === "camp"} onSelect={() => setWho("camp")}>
              {who === "camp" && (
                <select
                  value={campId}
                  onChange={(e) => setCampId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface p-2 text-sm text-foreground"
                >
                  {MOCK_CAMPS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </RadioRow>
            <RadioRow label="Entire team" checked={who === "team"} onSelect={() => setWho("team")}>
              {who === "team" && (
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface p-2 text-sm text-foreground"
                >
                  {MOCK_TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </RadioRow>
            <RadioRow label="Individual athletes" checked={who === "individual"} onSelect={() => setWho("individual")}>
              {who === "individual" && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                    <Search size={14} className="text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search roster"
                      className="flex-1 bg-transparent text-sm text-foreground outline-none"
                    />
                    <button
                      onClick={() => setSelected((p) => {
                        const n = new Set(p);
                        if (allVisibleSelected) visible.forEach((a) => n.delete(a.id));
                        else visible.forEach((a) => n.add(a.id));
                        return n;
                      })}
                      className="text-[11px] font-bold text-teal"
                    >
                      {allVisibleSelected ? "Clear" : "Select All"}
                    </button>
                  </div>
                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
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
                          <span className="text-sm text-foreground">
                            <span className="mr-2 text-muted-foreground">#{a.jersey}</span>
                            {a.name}
                            <span className="ml-2 text-[10px] text-muted-foreground">— {a.team}</span>
                          </span>
                          {on && <Check size={16} className="text-teal" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </RadioRow>
          </div>
        ) : step === 2 ? (
          <div className="mt-4">
            <p className="text-sm font-bold text-foreground">Program starts</p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Athletes will see this program in My Training from this date.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-bold text-foreground">Note to athletes (optional)</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
            />
          </div>
        )}

        {!toast && (
          <div className="mt-5 flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold text-foreground"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                disabled={!canNext()}
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="flex-1 rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={submit}
                className="flex-1 rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Assigning…" : "Assign Program"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RadioRow({
  label, checked, onSelect, children,
}: { label: string; checked: boolean; onSelect: () => void; children?: React.ReactNode }) {
  return (
    <div
      className={
        "rounded-2xl border p-3 " +
        (checked ? "border-teal bg-teal/5" : "border-border bg-surface")
      }
    >
      <button onClick={onSelect} className="flex w-full items-center gap-3 text-left">
        <span
          className={
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 " +
            (checked ? "border-teal" : "border-border")
          }
        >
          {checked && <span className="h-2.5 w-2.5 rounded-full bg-teal" />}
        </span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </button>
      {children}
    </div>
  );
}
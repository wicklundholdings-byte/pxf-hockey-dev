import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, X, Calendar as CalendarIcon, Clock, Users, BarChart3, Disc3,
  ListChecks, Tag, ArrowUpRight, CheckCircle2, Circle, FileEdit,
} from "lucide-react";
import { CATEGORIES, DRILLS, type Category } from "@/data/pxf";

const SESSIONS_KEY = "pxf:sessions:v2";
const EVT = "pxf:sessions-changed";
const AGE_GROUPS = ["U9+", "U11+", "U13+", "U15+"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"] as const;

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

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions — PXF Hockey" },
      { name: "description", content: "Browse, create, and run training sessions." },
      { property: "og:title", content: "Sessions — PXF Hockey" },
      { property: "og:description", content: "Browse, create, and run training sessions." },
    ],
  }),
  component: Sessions,
});

function Sessions() {
  const navigate = useNavigate();
  const [list, setList] = useState<Session[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const sync = () => setList(readAll());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const sorted = useMemo(
    () => [...list].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)),
    [list],
  );

  function createSession(s: Session) {
    const all = readAll();
    writeAll([s, ...all].slice(0, 100));
    setCreateOpen(false);
    navigate({ to: "/session-detail/$sessionId", params: { sessionId: s.id } });
  }

  return (
    <div className="px-5 pt-4 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-volt">PLAYBOOK</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Sessions</h1>
          <p className="mt-1 text-xs text-muted-foreground">Plan, schedule, and run your practices.</p>
        </div>
      </div>

      <button
        onClick={() => setCreateOpen(true)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3.5 text-[12px] font-bold tracking-wide text-primary-foreground shadow-glow-teal"
      >
        <Plus size={16} /> CREATE SESSION
      </button>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.3em] text-teal">YOUR SESSIONS</p>
        <span className="text-[10px] font-semibold text-muted-foreground">{sorted.length} total</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {sorted.length === 0 && <EmptyState onCreate={() => setCreateOpen(true)} />}
        {sorted.map((s) => (
          <SessionCard key={s.id} s={s} todayISO={todayISO} />
        ))}
      </div>

      {createOpen && (
        <CreateSessionModal onClose={() => setCreateOpen(false)} onSave={createSession} todayISO={todayISO} />
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-surface p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal">
        <FileEdit size={22} />
      </div>
      <h2 className="mt-4 text-base font-bold text-foreground">No sessions yet</h2>
      <p className="mt-1 text-xs text-muted-foreground">Create your first session to start planning practices.</p>
      <button
        onClick={onCreate}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-xs font-bold tracking-wide text-primary-foreground shadow-glow-teal"
      >
        <Plus size={14} /> CREATE SESSION
      </button>
    </div>
  );
}

function SessionCard({ s, todayISO }: { s: Session; todayISO: string }) {
  const total = s.blocks.reduce((t, b) => t + b.mins, 0) || s.totalMins;
  const status = s.completed ? "COMPLETED" : s.blocks.length === 0 ? "DRAFT" : s.date >= todayISO ? "UPCOMING" : "PAST";
  const statusColor =
    status === "COMPLETED" ? "bg-volt/15 text-volt" :
    status === "UPCOMING" ? "bg-teal/15 text-teal" :
    status === "PAST" ? "bg-destructive/15 text-destructive" :
    "bg-surface-2 text-muted-foreground border border-border/60";
  const focus = s.focus || mainCategory(s.blocks) || "—";

  return (
    <Link
      to="/session-detail/$sessionId"
      params={{ sessionId: s.id }}
      className="block overflow-hidden rounded-2xl border border-border/60 bg-surface p-4 transition-colors hover:border-teal/40"
    >
      <div className="flex items-start gap-3">
        <div className={"grid h-10 w-10 shrink-0 place-items-center rounded-full " + (s.completed ? "bg-volt/15 text-volt" : "bg-teal/15 text-teal")}>
          {s.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider " + statusColor}>{status}</span>
            {focus !== "—" && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold tracking-wider text-foreground/70">
                <Tag size={9} className="-mt-0.5 mr-1 inline" />{focus.toUpperCase()}
              </span>
            )}
          </div>
          <h3 className={"mt-1.5 truncate text-base font-bold " + (s.completed ? "text-muted-foreground line-through" : "text-foreground")}>
            {s.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarIcon size={11} className="text-teal" /> {formatDate(s.date)}</span>
            <span className="flex items-center gap-1"><Users size={11} className="text-teal" /> {s.age}</span>
            <span className="flex items-center gap-1"><BarChart3 size={11} className="text-teal" /> {s.level}</span>
            <span className="flex items-center gap-1"><Clock size={11} className="text-volt" /> {total} min</span>
            <span className="flex items-center gap-1"><Disc3 size={11} className="text-volt" /> {s.blocks.length} drills</span>
          </div>
          {s.notes.trim() && (
            <p className="mt-2 line-clamp-2 rounded-lg border border-border/40 bg-surface-2 px-2.5 py-1.5 text-[11px] italic text-muted-foreground">
              <ListChecks size={10} className="-mt-0.5 mr-1 inline text-volt" />
              {s.notes}
            </p>
          )}
        </div>
        <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

function mainCategory(blocks: Block[]): Category | null {
  if (blocks.length === 0) return null;
  const counts = new Map<Category, number>();
  for (const b of blocks) {
    const d = DRILLS.find((x) => x.id === b.drillId);
    if (!d) continue;
    counts.set(d.category, (counts.get(d.category) ?? 0) + b.mins);
  }
  let best: Category | null = null;
  let max = 0;
  for (const [c, n] of counts) if (n > max) { max = n; best = c; }
  return best;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return iso; }
}

/* ============================== Create Session Modal ============================== */

function CreateSessionModal({
  onClose, onSave, todayISO,
}: {
  onClose: () => void;
  onSave: (s: Session) => void;
  todayISO: string;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO);
  const [age, setAge] = useState<string>("U13+");
  const [level, setLevel] = useState<string>("Intermediate");
  const [mins, setMins] = useState<number>(60);
  const [focus, setFocus] = useState<string>(CATEGORIES[0].name);
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const nameError = touched && !name.trim() ? "Session name is required" : null;

  function submit() {
    setTouched(true);
    if (!name.trim()) return;
    const s: Session = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      date,
      age,
      level,
      totalMins: Math.max(5, Number(mins) || 60),
      notes: notes.trim(),
      focus,
      blocks: [],
      completed: false,
    };
    onSave(s);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-screen-sm overflow-y-auto rounded-t-3xl border-t border-border/60 bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-surface px-4 py-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">NEW</p>
            <h2 className="mt-0.5 text-lg font-bold text-foreground">Create Session</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <Field label="Session Name" error={nameError}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday PEP Development"
              className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal/60"
            />
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/60"
            />
          </Field>

          <Field label="Age Group">
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUPS.map((a) => (
                <Chip key={a} active={age === a} onClick={() => setAge(a)}>{a}</Chip>
              ))}
            </div>
          </Field>

          <Field label="Skill Level">
            <div className="flex flex-wrap gap-1.5">
              {LEVELS.map((l) => (
                <Chip key={l} active={level === l} onClick={() => setLevel(l)} tint="volt">{l}</Chip>
              ))}
            </div>
          </Field>

          <Field label="Total Duration (minutes)">
            <input
              type="number"
              min={5}
              step={5}
              value={mins}
              onChange={(e) => setMins(Number(e.target.value))}
              className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/60"
            />
          </Field>

          <Field label="Main Focus">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <Chip key={c.name} active={focus === c.name} onClick={() => setFocus(c.name)} tint={c.tint}>{c.name}</Chip>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Session intent, key cues, equipment reminders…"
              className="w-full resize-none rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal/60"
            />
          </Field>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border/60 bg-surface p-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-border/60 bg-surface-2 py-3 text-[12px] font-bold tracking-wide text-foreground">
            CANCEL
          </button>
          <button
            onClick={submit}
            className="flex-[1.4] rounded-2xl bg-gradient-brand py-3 text-[12px] font-bold tracking-wide text-primary-foreground shadow-glow-teal"
          >
            SAVE SESSION
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">{label.toUpperCase()}</label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function Chip({
  active, onClick, children, tint = "teal",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tint?: "teal" | "volt";
}) {
  const on = tint === "teal" ? "border-teal bg-teal/15 text-teal" : "border-volt bg-volt/15 text-volt";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors " +
        (active ? on : "border-border/60 bg-surface-2 text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon, Clock, Disc3, Copy, Trash2, Pencil, CheckCircle2, Circle,
  FileEdit, ArrowUpRight, ListChecks, Plus, Tag,
} from "lucide-react";
import { DRILLS, type Drill, type Category } from "@/data/pxf";

export const Route = createFileRoute("/saved-sessions")({
  head: () => ({
    meta: [
      { title: "Saved Sessions — PXF Hockey" },
      { name: "description", content: "Upcoming, past, and draft training sessions." },
      { property: "og:title", content: "Saved Sessions — PXF Hockey" },
      { property: "og:description", content: "Upcoming, past, and draft training sessions." },
    ],
  }),
  component: SavedSessions,
});

type SessionBlock = { uid: string; drillId: string; mins: number };
type Session = {
  id: string;
  name: string;
  date: string;
  age: string;
  level: string;
  totalMins: number;
  notes: string;
  blocks: SessionBlock[];
  completed?: boolean;
  completedAt?: string;
};

const SESSIONS_KEY = "pxf:sessions:v2";
const LOAD_KEY = "pxf:sessions:load";
const EVT = "pxf:sessions-changed";

function read(): Session[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]"); } catch { return []; }
}
function write(list: Session[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

type Tab = "upcoming" | "past" | "drafts";

function classify(s: Session, todayISO: string): Tab {
  if (!s.completed && s.blocks.length === 0) return "drafts";
  if (s.completed || s.date < todayISO) return "past";
  return "upcoming";
}

function mainCategory(blocks: SessionBlock[]): Category | null {
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

function SavedSessions() {
  const navigate = useNavigate();
  const [list, setList] = useState<Session[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const buckets = useMemo(() => {
    const out: Record<Tab, Session[]> = { upcoming: [], past: [], drafts: [] };
    for (const s of list) out[classify(s, todayISO)].push(s);
    out.upcoming.sort((a, b) => a.date.localeCompare(b.date));
    out.past.sort((a, b) => b.date.localeCompare(a.date));
    out.drafts.sort((a, b) => b.id.localeCompare(a.id));
    return out;
  }, [list, todayISO]);

  function openInBuilder(s: Session) {
    if (typeof window !== "undefined") window.localStorage.setItem(LOAD_KEY, s.id);
    navigate({ to: "/sessions" });
  }

  function duplicate(s: Session) {
    const copy: Session = {
      ...s,
      id: `s-${Date.now()}`,
      name: `${s.name} (Copy)`,
      date: todayISO,
      completed: false,
      completedAt: undefined,
      blocks: s.blocks.map((b) => ({ ...b, uid: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
    };
    write([copy, ...list].slice(0, 50));
  }

  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this session?")) return;
    write(list.filter((s) => s.id !== id));
  }

  function toggleComplete(id: string) {
    write(list.map((s) => s.id === id
      ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined }
      : s));
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "upcoming", label: "Upcoming", count: buckets.upcoming.length },
    { id: "past", label: "Past", count: buckets.past.length },
    { id: "drafts", label: "Drafts", count: buckets.drafts.length },
  ];

  const current = buckets[tab];

  return (
    <div className="px-5 pt-4 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-volt">PLAYBOOK</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Saved Sessions</h1>
          <p className="mt-1 text-xs text-muted-foreground">Plan ahead, run today, review what's done.</p>
        </div>
        <Link to="/sessions" aria-label="Build new session" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
          <Plus size={18} />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "rounded-2xl border px-2 py-3 text-center transition-colors " +
              (tab === t.id
                ? "border-teal bg-teal/15 text-teal"
                : "border-border/60 bg-surface text-muted-foreground")
            }
          >
            <p className="font-display text-xl font-bold">{t.count}</p>
            <p className="mt-0.5 text-[10px] font-bold tracking-wider">{t.label.toUpperCase()}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {current.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          current.map((s) => (
            <SessionCard
              key={s.id}
              s={s}
              tab={tab}
              todayISO={todayISO}
              onOpen={() => openInBuilder(s)}
              onDuplicate={() => duplicate(s)}
              onDelete={() => remove(s.id)}
              onToggleComplete={() => toggleComplete(s.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const copy = {
    upcoming: { title: "No upcoming sessions", body: "Plan your next ice time in the builder." },
    past: { title: "Nothing in the rear-view", body: "Completed sessions will show up here." },
    drafts: { title: "No drafts", body: "Sessions without drills are saved as drafts." },
  }[tab];
  return (
    <div className="rounded-3xl border border-border/60 bg-surface p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal">
        <FileEdit size={22} />
      </div>
      <h2 className="mt-4 text-base font-bold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{copy.body}</p>
      <Link to="/sessions" className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-xs font-bold tracking-wide text-primary-foreground shadow-glow-teal">
        <Plus size={14} /> BUILD A SESSION
      </Link>
    </div>
  );
}

function SessionCard({
  s, tab, todayISO, onOpen, onDuplicate, onDelete, onToggleComplete,
}: {
  s: Session;
  tab: Tab;
  todayISO: string;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}) {
  const total = s.blocks.reduce((t, b) => t + b.mins, 0);
  const cat = mainCategory(s.blocks);
  const sample = s.blocks.slice(0, 3).map((b) => DRILLS.find((d) => d.id === b.drillId)).filter(Boolean) as Drill[];
  const isToday = s.date === todayISO;
  const overdue = !s.completed && s.date < todayISO && s.blocks.length > 0;

  return (
    <div className={
      "overflow-hidden rounded-2xl border bg-surface transition-colors " +
      (s.completed ? "border-border/40 opacity-80" : isToday ? "border-volt/50 shadow-[0_0_20px_-12px_#39FF14]" : "border-border/60")
    }>
      <button onClick={onOpen} className="block w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleComplete(); }}
            aria-label={s.completed ? "Mark incomplete" : "Mark complete"}
            className={
              "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors " +
              (s.completed
                ? "border-volt/60 bg-volt/15 text-volt"
                : "border-border/60 bg-surface-2 text-muted-foreground hover:border-volt/50 hover:text-volt")
            }
          >
            {s.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {cat && (
                <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">
                  <Tag size={9} className="-mt-0.5 mr-1 inline" />{cat.toUpperCase()}
                </span>
              )}
              {isToday && !s.completed && (
                <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-volt">TODAY</span>
              )}
              {overdue && tab !== "past" && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-destructive">OVERDUE</span>
              )}
              {tab === "drafts" && (
                <span className="rounded-full border border-border/60 bg-surface-2 px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">DRAFT</span>
              )}
            </div>

            <h3 className={"mt-1.5 truncate text-base font-bold " + (s.completed ? "text-muted-foreground line-through" : "text-foreground")}>
              {s.name}
            </h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarIcon size={11} className="text-teal" /> {formatDate(s.date)}</span>
              <span className="flex items-center gap-1"><Disc3 size={11} className="text-teal" /> {s.blocks.length} drills</span>
              <span className="flex items-center gap-1"><Clock size={11} className="text-teal" /> {total} min</span>
              <span className="text-foreground/60">{s.age} · {s.level}</span>
            </div>

            {s.notes.trim() && (
              <p className="mt-2 line-clamp-2 rounded-lg border border-border/40 bg-surface-2 px-2.5 py-1.5 text-[11px] italic text-muted-foreground">
                <ListChecks size={10} className="-mt-0.5 mr-1 inline text-volt" />
                {s.notes}
              </p>
            )}

            {sample.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {sample.map((d) => (
                  <span key={d.id} className="rounded-full border border-border/60 bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                    {d.name}
                  </span>
                ))}
                {s.blocks.length > sample.length && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    +{s.blocks.length - sample.length}
                  </span>
                )}
              </div>
            )}
          </div>

          <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" />
        </div>
      </button>

      <div className="flex items-center border-t border-border/60 bg-surface-2/40">
        <CardAction icon={Pencil} label="Edit" tint="teal" onClick={onOpen} />
        <div className="h-6 w-px bg-border/60" />
        <CardAction icon={Copy} label="Duplicate" tint="volt" onClick={onDuplicate} />
        <div className="h-6 w-px bg-border/60" />
        <CardAction icon={Trash2} label="Delete" tint="destructive" onClick={onDelete} />
      </div>
    </div>
  );
}

function CardAction({
  icon: Icon, label, tint, onClick,
}: {
  icon: typeof Pencil;
  label: string;
  tint: "teal" | "volt" | "destructive";
  onClick: () => void;
}) {
  const color = tint === "teal" ? "text-teal hover:bg-teal/10" : tint === "volt" ? "text-volt hover:bg-volt/10" : "text-destructive hover:bg-destructive/10";
  return (
    <button onClick={onClick} className={"flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold tracking-wide transition-colors " + color}>
      <Icon size={12} /> {label.toUpperCase()}
    </button>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return iso; }
}
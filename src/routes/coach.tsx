import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Play, Calendar as CalendarIcon, Clock, Users, BarChart3,
  Disc3, CheckCircle2, Plus,
} from "lucide-react";

const SESSIONS_KEY = "pxf:sessions:v2";
const EVT = "pxf:sessions-changed";

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

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Digital Coach — PXF Hockey" },
      { name: "description", content: "Run an entire practice with a real coach guiding every drill from the ice." },
      { property: "og:title", content: "Digital Coach — PXF Hockey" },
      { property: "og:description", content: "Run an entire practice with a real coach guiding every drill from the ice." },
    ],
  }),
  component: CoachHub,
});

function CoachHub() {
  const [list, setList] = useState<Session[]>([]);

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

  return (
    <div className="px-5 pt-4 pb-10">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-volt">PRACTICE MODE</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold text-foreground">
          <Megaphone className="text-teal" size={26} /> Digital Coach
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Your on-ice coach for every drill. Pick a session and press START PRACTICE.</p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.3em] text-teal">SAVED SESSIONS</p>
        <span className="text-[10px] font-semibold text-muted-foreground">{sorted.length} total</span>
      </div>

      <div className="mt-3 space-y-3">
        {sorted.length === 0 && <EmptyState />}
        {sorted.map((s) => <CoachSessionCard key={s.id} s={s} />)}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-border/60 bg-surface p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal">
        <Megaphone size={22} />
      </div>
      <h2 className="mt-4 text-base font-bold text-foreground">No sessions to coach yet</h2>
      <p className="mt-1 text-xs text-muted-foreground">Build a session first — then come back here to run it on the ice.</p>
      <Link
        to="/sessions"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-xs font-bold tracking-wide text-primary-foreground shadow-glow-teal"
      >
        <Plus size={14} /> CREATE A SESSION
      </Link>
    </div>
  );
}

function CoachSessionCard({ s }: { s: Session }) {
  const total = s.blocks.reduce((t, b) => t + b.mins, 0) || s.totalMins;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className={"grid h-10 w-10 shrink-0 place-items-center rounded-full " + (s.completed ? "bg-volt/15 text-volt" : "bg-teal/15 text-teal")}>
          {s.completed ? <CheckCircle2 size={18} /> : <Megaphone size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-foreground">{s.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarIcon size={11} className="text-teal" /> {formatDate(s.date)}</span>
            <span className="flex items-center gap-1"><Users size={11} className="text-teal" /> {s.age}</span>
            <span className="flex items-center gap-1"><BarChart3 size={11} className="text-teal" /> {s.level}</span>
            <span className="flex items-center gap-1"><Clock size={11} className="text-volt" /> {total} min</span>
            <span className="flex items-center gap-1"><Disc3 size={11} className="text-volt" /> {s.blocks.length} drills</span>
          </div>
        </div>
      </div>
      <Link
        to="/coach/$sessionId"
        params={{ sessionId: s.id }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-[12px] font-bold tracking-wide text-primary-foreground shadow-glow-teal"
      >
        <Play size={14} /> START PRACTICE
      </Link>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return iso; }
}
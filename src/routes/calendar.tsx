import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Disc3,
  CheckCircle2, Circle, ArrowUpRight, Tag,
} from "lucide-react";
import { DRILLS, type Category } from "@/data/pxf";
import { supabase } from "@/integrations/supabase/client";
import { getUserAppRole, roleHome } from "@/lib/user-role";

export const Route = createFileRoute("/calendar")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    const role = await getUserAppRole(user.id);
    throw redirect({ to: roleHome(role) });
  },
  head: () => ({
    meta: [
      { title: "Session Calendar — PXF Hockey" },
      { name: "description", content: "See planned and completed sessions on the calendar." },
      { property: "og:title", content: "Session Calendar — PXF Hockey" },
      { property: "og:description", content: "Sessions scheduled by date." },
    ],
  }),
  component: CalendarScreen,
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
};

const SESSIONS_KEY = "pxf:sessions:v2";
const EVT = "pxf:sessions-changed";

function read(): Session[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]"); } catch { return []; }
}

function pad(n: number) { return n.toString().padStart(2, "0"); }
function toISO(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }

function mainCategory(blocks: SessionBlock[]): Category | null {
  if (blocks.length === 0) return null;
  const counts = new Map<Category, number>();
  for (const b of blocks) {
    const d = DRILLS.find((x) => x.id === b.drillId);
    if (!d) continue;
    counts.set(d.category, (counts.get(d.category) ?? 0) + b.mins);
  }
  let best: Category | null = null; let max = 0;
  for (const [c, n] of counts) if (n > max) { max = n; best = c; }
  return best;
}

function CalendarScreen() {
  const navigate = useNavigate();
  const [list, setList] = useState<Session[]>([]);
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(today);

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

  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of list) {
      if (!s.date) continue;
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [list]);

  const monthLabel = new Date(cursor.y, cursor.m, 1)
    .toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const grid = useMemo(() => buildGrid(cursor.y, cursor.m), [cursor]);

  function step(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function jumpToday() {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
  }

  function openInBuilder(s: Session) {
    navigate({ to: "/session-detail/$sessionId", params: { sessionId: s.id } });
  }

  function createOnDate(iso: string) {
    if (typeof window !== "undefined") window.localStorage.setItem("pxf:sessions:new-date", iso);
    navigate({ to: "/sessions" });
  }

  const selectedSessions = byDate.get(selected) ?? [];

  return (
    <div className="px-5 pt-4 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-teal">SCHEDULE</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Session Calendar</h1>
        </div>
        <button
          onClick={() => createOnDate(selected)}
          aria-label="New session"
          className="grid h-11 w-11 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-border/60 bg-surface">
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-surface to-surface-2 px-4 py-3">
          <button onClick={() => step(-1)} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background/40 text-foreground">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="font-display text-base font-bold text-foreground">{monthLabel}</p>
            <button onClick={jumpToday} className="mt-0.5 text-[10px] font-bold tracking-[0.3em] text-teal">JUMP TO TODAY</button>
          </div>
          <button onClick={() => step(1)} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background/40 text-foreground">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0 border-b border-border/60 bg-background/30 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 p-2">
          {grid.map((cell) => {
            const iso = toISO(cell.y, cell.m, cell.d);
            const inMonth = cell.m === cursor.m;
            const dayList = byDate.get(iso) ?? [];
            const isToday = iso === today;
            const isSel = iso === selected;
            const allDone = dayList.length > 0 && dayList.every((s) => s.completed);
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={
                  "relative flex aspect-square flex-col items-center justify-start gap-1 rounded-xl border p-1.5 text-[11px] transition-colors " +
                  (isSel
                    ? "border-teal bg-teal/15 text-teal"
                    : isToday
                    ? "border-volt/50 bg-volt/5 text-foreground"
                    : inMonth
                    ? "border-transparent text-foreground/90 hover:border-border/60"
                    : "border-transparent text-muted-foreground/50")
                }
              >
                <span className={"font-display font-bold " + (isToday ? "text-volt" : "")}>{cell.d}</span>
                {dayList.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {dayList.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className={"h-1.5 w-1.5 rounded-full " + (s.completed ? "bg-volt" : "bg-teal")}
                      />
                    ))}
                    {dayList.length > 3 && <span className="ml-0.5 text-[8px] font-bold text-muted-foreground">+{dayList.length - 3}</span>}
                  </span>
                )}
                {allDone && (
                  <CheckCircle2 size={9} className="absolute right-1 top-1 text-volt" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-border/60 bg-background/20 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-teal" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-volt" /> Completed</span>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">SELECTED</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-foreground">{formatLong(selected)}</h2>
          </div>
          <button
            onClick={() => createOnDate(selected)}
            className="flex items-center gap-1.5 rounded-full border border-teal bg-teal/15 px-3 py-1.5 text-[11px] font-bold text-teal"
          >
            <Plus size={12} /> NEW
          </button>
        </div>

        {selectedSessions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border/80 bg-surface/40 p-6 text-center">
            <CalendarIcon size={22} className="mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">No sessions on this day</p>
            <button
              onClick={() => createOnDate(selected)}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-4 py-2.5 text-xs font-bold tracking-wide text-primary-foreground shadow-glow-teal"
            >
              <Plus size={12} /> PLAN A SESSION
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {selectedSessions.map((s) => (
              <DaySessionCard key={s.id} s={s} onOpen={() => openInBuilder(s)} />
            ))}
          </div>
        )}

        <Link to="/saved-sessions" className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.2em] text-teal">
          VIEW ALL SAVED SESSIONS <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function DaySessionCard({ s, onOpen }: { s: Session; onOpen: () => void }) {
  const total = s.blocks.reduce((t, b) => t + b.mins, 0);
  const cat = mainCategory(s.blocks);
  return (
    <button
      onClick={onOpen}
      className={
        "block w-full overflow-hidden rounded-2xl border bg-surface p-4 text-left transition-colors " +
        (s.completed ? "border-volt/40" : "border-border/60 hover:border-teal/50")
      }
    >
      <div className="flex items-start gap-3">
        <div className={"grid h-10 w-10 shrink-0 place-items-center rounded-full border " + (s.completed ? "border-volt/60 bg-volt/15 text-volt" : "border-teal/40 bg-teal/15 text-teal")}>
          {s.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {cat && (
              <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">
                <Tag size={9} className="-mt-0.5 mr-1 inline" />{cat.toUpperCase()}
              </span>
            )}
            <span className="rounded-full border border-border/60 bg-surface-2 px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">{s.level}</span>
          </div>
          <h3 className={"mt-1.5 truncate text-base font-bold " + (s.completed ? "text-muted-foreground line-through" : "text-foreground")}>{s.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Disc3 size={11} className="text-teal" /> {s.blocks.length} drills</span>
            <span className="flex items-center gap-1"><Clock size={11} className="text-teal" /> {total} min</span>
            <span>{s.age}</span>
          </div>
          {s.notes.trim() && (
            <p className="mt-2 line-clamp-2 text-[11px] italic text-muted-foreground">{s.notes}</p>
          )}
        </div>
        <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}

type Cell = { y: number; m: number; d: number };
function buildGrid(year: number, monthIdx: number): Cell[] {
  const first = new Date(year, monthIdx, 1);
  const startDow = first.getDay(); // 0 Sun..6 Sat
  const cells: Cell[] = [];
  // previous month tail
  const prev = new Date(year, monthIdx, 0);
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prev.getDate() - i;
    cells.push({ y: prev.getFullYear(), m: prev.getMonth(), d });
  }
  // current month
  const last = new Date(year, monthIdx + 1, 0).getDate();
  for (let d = 1; d <= last; d++) cells.push({ y: year, m: monthIdx, d });
  // pad to multiple of 7 (up to 42)
  const next = new Date(year, monthIdx + 1, 1);
  let d = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ y: next.getFullYear(), m: next.getMonth(), d });
    d++;
    if (cells.length >= 42) break;
  }
  return cells;
}

function formatLong(iso: string) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  } catch { return iso; }
}